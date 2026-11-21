import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { parseFrontmatter } from "@astrojs/markdown-remark";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkMath from "remark-math";
import { visit } from "unist-util-visit";
import { manifestPath, photoName, hash } from "../../src/lib/post-media.mjs";

const parser = unified().use(remarkParse).use(remarkMdx).use(remarkMath);
export const sourcePath = (album, name) => join("media", album, "originals", name);
export const privateKey = (digest) => "originals/sha256/" + digest;

export async function atomicWrite(path, bytes) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = path + "." + randomUUID();
  await writeFile(temporary, bytes);
  await rename(temporary, path);
}

export async function maybeRead(file) {
  try { return await readFile(file); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

export async function references(album, staged = false) {
  const names = new Set();
  for (const locale of ["", "en/", "ja/"]) {
    const file = "src/content/blog/" + locale + album + ".mdx";
    let text;
    if (staged) {
      const indexed = execFileSync("git", ["ls-files", "--cached", "--", file], { encoding: "utf8" }).trim();
      if (indexed) text = execFileSync("git", ["show", ":" + file], { encoding: "utf8" });
    } else text = (await maybeRead(file))?.toString();
    if (!text) continue;
    const { frontmatter, content } = parseFrontmatter(text);
    if (frontmatter.draft) continue;
    visit(parser.parse(content), (node) => {
      if (node.name !== "PostPhoto") return;
      const src = node.attributes.find((attr) => attr.name === "src")?.value;
      names.add(photoName(src));
    });
  }
  return [...names].sort();
}

export async function makeManifest(album, staged) {
  const path = manifestPath(album);
  const previous = JSON.parse((await maybeRead(path))?.toString() || '{"photos":{}}');
  const photos = {};
  for (const name of await references(album, staged)) {
    const old = previous.photos[name];
    const bytes = await maybeRead(sourcePath(album, name));
    if (!bytes) {
      if (!old) throw new Error("Put " + name + " in media/" + album + "/originals/ before publishing.");
      photos[name] = old;
      continue;
    }
    const meta = await sharp(bytes).metadata();
    const format = meta.format === "jpeg" ? "jpg" : meta.format;
    if (!(format === "png" ? /\.png$/i : format === "jpg" ? /\.jpe?g$/i : /$^/).test(name))
      throw new Error("File type does not match its name: " + name);
    const { width, height } = meta.autoOrient;
    const source = hash(bytes);
    const alternate = await maybeRead(sourcePath(album, join("sdr", name)));
    let sdr, sdrOrientation;
    if (alternate) {
      const s = await sharp(alternate).metadata();
      if (!s.orientation && meta.orientation > 1 && s.width === meta.width && s.height === meta.height) sdrOrientation = meta.orientation;
      if (s.format !== "jpeg" || format !== "jpg" || (!sdrOrientation && (s.autoOrient.width !== width || s.autoOrient.height !== height)))
        throw new Error("SDR companion dimensions/type differ: " + name);
      sdr = hash(alternate);
    } else if (old?.source === source) { sdr = old.sdr; sdrOrientation = old.sdrOrientation; }
    photos[name] = { source, ...(sdr && { sdr }), ...(sdrOrientation && { sdrOrientation }), format, width, height };
  }
  const result = { photos };
  const bytes = JSON.stringify(result, null, 2) + "\n";
  if (!existsSync(path) || (await readFile(path, "utf8")) !== bytes) await atomicWrite(path, bytes);
  return result;
}

export async function localSource(album, relative, digest) {
  // The existing Oslo photos are tracked. Look them up by digest for the first CI migration.
  for (const file of [sourcePath(album, relative), join("public/post/images", album, relative)]) {
    const bytes = await maybeRead(file);
    if (bytes && hash(bytes) === digest) return bytes;
  }
  return null;
}
