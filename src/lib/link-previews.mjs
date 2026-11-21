import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "parse5";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkMath from "remark-math";
import { visit } from "unist-util-visit";

const cacheDir = join(process.cwd(), ".cache", "link-previews-v1");
const goodFor = 7 * 24 * 60 * 60 * 1000;
const retryAfter = 6 * 60 * 60 * 1000;
const headLimit = 512 * 1024;
const emptyCard = { title: null, description: null, image: null };
const memory = new Map();
const inFlight = new Map();
const parser = unified().use(remarkParse).use(remarkMdx).use(remarkMath);

function httpUrl(input, base) {
  try {
    const url = new URL(input, base);
    if (url.protocol === "https:" || url.protocol === "http:") return url;
  } catch {}
  return null;
}

function previewUrl(input) {
  const url = httpUrl(input);
  if (!url) return null;
  url.hash = "";
  return url.href;
}

export function parsePreview(html, url) {
  const meta = new Map();
  let title = "";
  function collect(node) {
    if (node.tagName === "meta") {
      const attrs = Object.fromEntries(node.attrs.map(({ name, value }) => [name, value]));
      const key = (attrs.property || attrs.name || "").toLowerCase();
      if (!meta.has(key) && attrs.content?.trim()) meta.set(key, attrs.content.trim());
    } else if (node.tagName === "title" && !title) {
      title = node.childNodes.map((child) => child.value || "").join("").trim();
    }
    for (const child of node.childNodes || []) collect(child);
  }
  const head = parse(html).childNodes.find((node) => node.tagName === "html")
    ?.childNodes.find((node) => node.tagName === "head");
  if (head) collect(head);
  const image = meta.get("og:image");
  return {
    title: meta.get("og:title") || title || null,
    description: meta.get("og:description") || meta.get("description") || null,
    image: image ? httpUrl(image, url)?.href || null : null,
  };
}

async function fetchCard(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(6500) });
  const type = response.headers.get("content-type") || "";
  if (!response.ok || !response.body || (type && !/html/i.test(type))) {
    await response.body?.cancel();
    throw new Error("No HTML preview");
  }
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  let tail = "";
  try {
    while (bytes < headLimit) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value.subarray(0, headLimit - bytes));
      chunks.push(chunk);
      bytes += chunk.length;
      const text = tail + chunk.toString("latin1");
      if (/<\/head\s*>/i.test(text)) break;
      tail = text.slice(-20);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const card = parsePreview(Buffer.concat(chunks).toString("utf8"), response.url || url);
  if (!card.title && !card.description && !card.image) throw new Error("No preview metadata");
  return card;
}

function validRecord(record) {
  return record && Number.isFinite(record.checkAfter) && record.card &&
    ["title", "description", "image"].every((key) =>
      record.card[key] === null || typeof record.card[key] === "string"
    );
}

async function readRecord(file) {
  try {
    const record = JSON.parse(await readFile(file, "utf8"));
    return validRecord(record) ? record : null;
  } catch (error) {
    if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
    return null;
  }
}

async function loadCard(url) {
  const file = join(cacheDir, createHash("sha256").update(url).digest("hex") + ".json");
  const previous = await readRecord(file);
  if (previous?.checkAfter > Date.now()) return previous;
  let next;
  try {
    next = { card: await fetchCard(url), checkAfter: Date.now() + goodFor };
  } catch {
    next = { card: previous?.card || emptyCard, checkAfter: Date.now() + retryAfter };
  }
  await mkdir(cacheDir, { recursive: true });
  const temporary = file + "." + randomUUID();
  await writeFile(temporary, JSON.stringify(next));
  await rename(temporary, file);
  return next;
}

export async function getLinkPreview(input) {
  const url = previewUrl(input);
  if (!url) return emptyCard;
  const cached = memory.get(url);
  if (cached?.checkAfter > Date.now()) return cached.card;
  if (!inFlight.has(url)) {
    inFlight.set(url, loadCard(url)
      .then((record) => { memory.set(url, record); return record.card; })
      .finally(() => inFlight.delete(url)));
  }
  return inFlight.get(url);
}

export function articlePreviewUrls(body) {
  if (!body?.includes("LinkPreview")) return { urls: [], dynamic: false };
  const tree = parser.parse(body);
  const names = new Set(["LinkPreview"]);
  for (const node of tree.children) {
    if (node.type !== "mdxjsEsm") continue;
    for (const declaration of node.data?.estree?.body || []) {
      if (declaration.type !== "ImportDeclaration" || !/\/LinkPreview\.astro$/.test(declaration.source.value)) continue;
      for (const specifier of declaration.specifiers) names.add(specifier.local.name);
    }
  }
  const urls = new Set();
  let dynamic = false;
  visit(tree, (node) => {
    if (!names.has(node.name)) return;
    const src = node.attributes?.find((attr) => attr.name === "src")?.value;
    if (node.attributes?.some((attr) => attr.type === "mdxJsxExpressionAttribute")) dynamic = true;
    if (typeof src === "string") {
      const url = previewUrl(src);
      if (url) urls.add(url);
    } else dynamic = true;
  });
  return { urls: [...urls], dynamic };
}

// Resolve each URL once across languages before Astro decides which pages it can restore.
export async function prepareArticlePreviews(posts) {
  const references = new Map(posts.map((post) => [post.id, articlePreviewUrls(post.body)]));
  const urls = new Set([...references.values()].flatMap((ref) => ref.urls));
  const cards = new Map();
  const queue = urls.values();
  async function work() {
    for (const url of queue) cards.set(url, await getLinkPreview(url));
  }
  await Promise.all(Array.from({ length: Math.min(6, urls.size) }, work));
  return new Map([...references].map(([id, ref]) => [
    id, ref.dynamic ? null : ref.urls.map((url) => [url, cards.get(url)]),
  ]));
}
