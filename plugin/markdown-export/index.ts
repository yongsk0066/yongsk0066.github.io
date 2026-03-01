import type { AstroIntegration } from "astro";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname, extname } from "node:path";

const SITE_URL = "https://yongseok.me";
const CONTENT_DIR = "./src/content/blog";
const LOCALES = ["en", "ja"];

// --- MDX → clean Markdown 변환 ---

/** 임베드 컴포넌트를 Markdown 링크로 변환하는 규칙 */
const EMBED_RULES: { pattern: RegExp; replace: (url: string) => string }[] = [
  // <YouTube src="url" /> (single-line & multiline)
  { pattern: /<YouTube\s[^>]*src=["']([^"']+)["'][^>]*\/?>/gs, replace: (url) => `[YouTube](${url})` },
  // <LinkPreview src="url" />
  { pattern: /<LinkPreview\s+src=["']([^"']+)["'][^>]*\/?>/g, replace: (url) => `[${url}](${url})` },
  // <GoogleMap src="url" />
  { pattern: /<GoogleMap\s+src=["']([^"']+)["'][^>]*\/?>/g, replace: (url) => `[Google Maps](${url})` },
  // <AudioPlayer src="url" />
  { pattern: /<AudioPlayer\s+src=["']([^"']+)["'][^>]*\/?>/g, replace: (url) => `[Audio](${url})` },
  // <Video src="url" />
  { pattern: /<Video\s+src=["']([^"']+)["'][^>]*\/?>/g, replace: (url) => `[Video](${url})` },
  // <TwitterVideo src="url" />
  { pattern: /<TwitterVideo\s+src=["']([^"']+)["'][^>]*\/?>/g, replace: (url) => `[Twitter Video](${url})` },
  // <InstagramEmbed url="url" />
  { pattern: /<InstagramEmbed\s+url=["']([^"']+)["'][^>]*\/?>/g, replace: (url) => `[Instagram](${url})` },
];

/** interactive 전용 컴포넌트 (제거 대상) */
const INTERACTIVE_COMPONENTS = [
  "Sandpack", "Gyroscope", "Globe", "SolarSystem",
  "CylinderSection", "UnfoldableCylinder", "NotFoundPlayer",
  "CSSLogicGates", "CSSIfSupport", "AsciiElement",
];

function stripImports(md: string): string {
  return md
    .replace(/^import\s+.+from\s+['"].*['"];?\s*$/gm, "")
    .replace(/^import\s+\{[^}]*\}\s+from\s+['"].*['"];?\s*$/gm, "");
}

function convertEmbeds(md: string): string {
  for (const rule of EMBED_RULES) {
    md = md.replace(rule.pattern, (_, url) => rule.replace(url));
  }
  return md;
}

function stripInteractiveComponents(md: string): string {
  const joined = INTERACTIVE_COMPONENTS.join("|");
  return md.replace(new RegExp(`<(?:${joined})\\b[^>]*/>`, "gs"), "");
}

function convertBlockComponents(md: string): string {
  // <Letter>text</Letter> → text
  md = md.replace(/<Letter[^>]*>([\s\S]*?)<\/Letter>/g, "$1");
  // Chat 컴포넌트 → blockquote로 변환
  md = md.replace(/<ChatBubble[^>]*>([\s\S]*?)<\/ChatBubble>/g, "> $1\n");
  md = md.replace(/<ChatInfo[^>]*>([\s\S]*?)<\/ChatInfo>/g, "_$1_\n");
  md = md.replace(/<ChatContainer[^>]*>([\s\S]*?)<\/ChatContainer>/gs, "$1");
  // 나머지 PascalCase self-closing 제거
  md = md.replace(/<[A-Z]\w+\b[^>]*\/>/g, "");
  // 나머지 PascalCase block — 내부 텍스트만 보존
  md = md.replace(/<[A-Z]\w+[^>]*>([\s\S]*?)<\/[A-Z]\w+>/g, "$1");
  return md;
}

function cleanupJsxArtifacts(md: string): string {
  // {expression} 단독 줄 제거
  md = md.replace(/^\s*\{[^}]*\}\s*$/gm, "");
  // client:visible 등 Astro 디렉티브 잔여물 제거
  md = md.replace(/\s*client:\w+(?:=["'][^"']*["'])?\s*/g, " ");
  // 연속 빈 줄 정리
  md = md.replace(/\n{3,}/g, "\n\n");
  return md.trim();
}

function buildFrontmatter(
  frontmatter: Record<string, unknown>,
  sourceUrl: string,
): string {
  const lines = [
    "---",
    `title: ${JSON.stringify(frontmatter.title)}`,
    `date: ${frontmatter.date instanceof Date ? frontmatter.date.toISOString() : frontmatter.date}`,
  ];
  if (frontmatter.description)
    lines.push(`description: ${JSON.stringify(frontmatter.description)}`);
  if (Array.isArray(frontmatter.categories) && frontmatter.categories.length > 0)
    lines.push(`categories: [${frontmatter.categories.map((c: string) => JSON.stringify(c)).join(", ")}]`);
  if (frontmatter.series)
    lines.push(`series: ${JSON.stringify(frontmatter.series)}`);
  lines.push(`source_url: ${JSON.stringify(sourceUrl)}`);
  lines.push("---");
  return lines.join("\n");
}

function mdxToCleanMarkdown(
  body: string,
  frontmatter: Record<string, unknown>,
  sourceUrl: string,
): string {
  let md = body;
  md = stripImports(md);
  md = convertEmbeds(md);
  md = stripInteractiveComponents(md);
  md = convertBlockComponents(md);
  md = cleanupJsxArtifacts(md);

  return buildFrontmatter(frontmatter, sourceUrl) + "\n\n" + md + "\n";
}

// --- Frontmatter 파싱 ---

function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };

  const fmRaw = match[1];
  const body = match[2];
  const fm: Record<string, unknown> = {};

  // multiline value를 처리하기 위해 key: value 쌍을 순회
  // description 등에 ':'이 포함될 수 있으므로 첫 번째 ':' 기준으로만 분리
  for (const line of fmRaw.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    if (!key || !value) continue;

    if (key === "categories") {
      const arrMatch = value.match(/\[([^\]]*)\]/);
      if (arrMatch) {
        fm[key] = arrMatch[1]
          .split(",")
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
          .filter(Boolean);
      }
    } else if (key === "draft") {
      fm[key] = value === "true";
    } else if (key === "date") {
      fm[key] = new Date(value.replace(/^['"]|['"]$/g, ""));
    } else {
      fm[key] = value.replace(/^['"]|['"]$/g, "");
    }
  }

  return { frontmatter: fm, body };
}

// --- 파일 수집 ---

async function collectMdxFiles(
  dir: string,
  base: string = "",
): Promise<{ id: string; path: string }[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const results: { id: string; path: string }[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relativePath = base ? `${base}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (entry.name.startsWith("_") || entry.name === "wip") continue;
      results.push(...(await collectMdxFiles(fullPath, relativePath)));
    } else if (extname(entry.name) === ".mdx" || extname(entry.name) === ".md") {
      const id = relativePath.replace(/\.(mdx?|md)$/, "");
      results.push({ id, path: fullPath });
    }
  }

  return results;
}

// --- Astro Integration ---

export default function markdownExport(): AstroIntegration {
  return {
    name: "markdown-export",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const outDir = dir.pathname;
        const files = await collectMdxFiles(CONTENT_DIR);

        let count = 0;
        let skipped = 0;

        for (const file of files) {
          const raw = await readFile(file.path, "utf-8");
          const { frontmatter, body } = parseFrontmatter(raw);

          if (frontmatter.draft) {
            skipped++;
            continue;
          }

          const slug = file.id;
          const sourceUrl = `${SITE_URL}/blog/${slug}/`;
          const cleanMd = mdxToCleanMarkdown(body, frontmatter, sourceUrl);

          const outPath = join(outDir, "blog", slug, "index.md");
          await mkdir(dirname(outPath), { recursive: true });
          await writeFile(outPath, cleanMd, "utf-8");
          count++;
        }

        logger.info(`Generated ${count} markdown files (${skipped} drafts skipped)`);
      },
    },
  };
}
