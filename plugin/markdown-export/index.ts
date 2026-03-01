import type { AstroIntegration } from "astro";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname, extname } from "node:path";

const SITE_URL = "https://yongseok.me";
const CONTENT_DIR = "./src/content/blog";
const LOCALES = ["en", "ja"];

/**
 * MDX 원본에서 import 문과 JSX 컴포넌트를 제거하여 clean Markdown을 생성한다.
 */
function mdxToCleanMarkdown(
  body: string,
  frontmatter: Record<string, unknown>,
  sourceUrl: string,
): string {
  let md = body;

  // 1. import 문 제거
  md = md.replace(/^import\s+.+from\s+['"].*['"];?\s*$/gm, "");
  // import { ... } from '...' 패턴도 제거
  md = md.replace(/^import\s+\{[^}]*\}\s+from\s+['"].*['"];?\s*$/gm, "");

  // 2. JSX 컴포넌트 → Markdown 변환
  // <YouTube src="url" /> → [YouTube](url)
  md = md.replace(
    /<YouTube\s+src=["']([^"']+)["']\s*\/?\s*>/g,
    (_, url) => `[YouTube](${url})`,
  );
  // multiline YouTube
  md = md.replace(
    /<YouTube\s*\n\s*src=["']([^"']+)["'][^/]*\/?\s*>/g,
    (_, url) => `[YouTube](${url})`,
  );

  // <LinkPreview src="url" /> → [url](url)
  md = md.replace(
    /<LinkPreview\s+src=["']([^"']+)["']\s*\/?\s*>/g,
    (_, url) => `[${url}](${url})`,
  );

  // <GoogleMap src="url" /> → [Google Maps](url)
  md = md.replace(
    /<GoogleMap\s+src=["']([^"']+)["']\s*\/?\s*>/g,
    (_, url) => `[Google Maps](${url})`,
  );

  // <AudioPlayer src="url" /> → [Audio](url)
  md = md.replace(
    /<AudioPlayer\s+src=["']([^"']+)["']\s*\/?\s*>/g,
    (_, url) => `[Audio](${url})`,
  );

  // <Video src="url" /> → [Video](url)
  md = md.replace(
    /<Video\s+src=["']([^"']+)["']\s*\/?\s*>/g,
    (_, url) => `[Video](${url})`,
  );

  // <TwitterVideo src="url" /> → [Twitter Video](url)
  md = md.replace(
    /<TwitterVideo\s+src=["']([^"']+)["']\s*\/?\s*>/g,
    (_, url) => `[Twitter Video](${url})`,
  );

  // <InstagramEmbed url="url" /> → [Instagram](url)
  md = md.replace(
    /<InstagramEmbed\s+url=["']([^"']+)["']\s*\/?\s*>/g,
    (_, url) => `[Instagram](${url})`,
  );

  // interactive 컴포넌트 제거 (Sandpack, Gyroscope, 3D 등)
  // self-closing: <Component ... />
  md = md.replace(
    /<(?:Sandpack|Gyroscope|Globe|SolarSystem|CylinderSection|UnfoldableCylinder|NotFoundPlayer|CSSLogicGates|CSSIfSupport|AsciiElement)\b[^>]*\/>/gs,
    "",
  );

  // block 컴포넌트 — 내부 텍스트만 보존
  // <Letter>text</Letter> → text
  md = md.replace(/<Letter[^>]*>([\s\S]*?)<\/Letter>/g, "$1");

  // <ChatContainer>...<ChatBubble>text</ChatBubble>...</ChatContainer>
  // → 대화 내용만 추출
  md = md.replace(/<ChatBubble[^>]*>([\s\S]*?)<\/ChatBubble>/g, "> $1\n");
  md = md.replace(/<ChatInfo[^>]*>([\s\S]*?)<\/ChatInfo>/g, "_$1_\n");
  md = md.replace(/<ChatContainer[^>]*>([\s\S]*?)<\/ChatContainer>/gs, "$1");

  // 나머지 알 수 없는 self-closing 컴포넌트 제거 (PascalCase)
  md = md.replace(/<[A-Z]\w+\b[^>]*\/>/g, "");

  // 나머지 알 수 없는 block 컴포넌트 — 내부 텍스트 보존
  md = md.replace(/<[A-Z]\w+[^>]*>([\s\S]*?)<\/[A-Z]\w+>/g, "$1");

  // 3. JSX expression cleanup
  // {expression} 단독 줄 제거 (Sandpack files prop 등)
  md = md.replace(/^\s*\{[^}]*\}\s*$/gm, "");

  // client:visible, client:only 등 잔여 Astro 디렉티브 제거
  md = md.replace(/\s*client:\w+(?:=["'][^"']*["'])?\s*/g, " ");

  // 4. 연속 빈 줄 정리 (3개 이상 → 2개로)
  md = md.replace(/\n{3,}/g, "\n\n");
  md = md.trim();

  // 5. YAML frontmatter 생성
  const fm = [
    "---",
    `title: ${JSON.stringify(frontmatter.title)}`,
    `date: ${frontmatter.date instanceof Date ? frontmatter.date.toISOString() : frontmatter.date}`,
  ];
  if (frontmatter.description)
    fm.push(`description: ${JSON.stringify(frontmatter.description)}`);
  if (
    frontmatter.categories &&
    Array.isArray(frontmatter.categories) &&
    frontmatter.categories.length > 0
  )
    fm.push(
      `categories: [${frontmatter.categories.map((c: string) => JSON.stringify(c)).join(", ")}]`,
    );
  if (frontmatter.series)
    fm.push(`series: ${JSON.stringify(frontmatter.series)}`);
  fm.push(`source_url: ${JSON.stringify(sourceUrl)}`);
  fm.push("---");

  return fm.join("\n") + "\n\n" + md + "\n";
}

function getLocale(id: string): string {
  const locale = LOCALES.find((l) => id.startsWith(`${l}/`));
  return locale || "ko";
}

function idToSlug(id: string): string {
  // id 에서 확장자 제거 (glob loader는 확장자 포함하지 않지만 안전하게)
  return id.replace(/\.(mdx?|md)$/, "");
}

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
      // _examples 디렉토리와 wip 디렉토리 스킵
      if (entry.name.startsWith("_") || entry.name === "wip") continue;
      results.push(...(await collectMdxFiles(fullPath, relativePath)));
    } else if (extname(entry.name) === ".mdx" || extname(entry.name) === ".md") {
      const id = relativePath.replace(/\.(mdx?|md)$/, "");
      results.push({ id, path: fullPath });
    }
  }

  return results;
}

function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };

  const fmRaw = match[1];
  const body = match[2];

  // 간단한 YAML 파싱 (title, date, description, categories, series, draft)
  const fm: Record<string, unknown> = {};

  for (const line of fmRaw.split("\n")) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (!kv) continue;
    const [, key, value] = kv;

    if (key === "categories") {
      // ["react", "dev"] 형태 파싱
      const arrMatch = value.match(/\[([^\]]*)\]/);
      if (arrMatch) {
        fm[key] = arrMatch[1]
          .split(",")
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
          .filter(Boolean);
      }
    } else if (key === "draft") {
      fm[key] = value.trim() === "true";
    } else if (key === "date") {
      fm[key] = new Date(value.replace(/^['"]|['"]$/g, ""));
    } else {
      fm[key] = value.replace(/^['"]|['"]$/g, "");
    }
  }

  return { frontmatter: fm, body };
}

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

          // draft 글 스킵
          if (frontmatter.draft) {
            skipped++;
            continue;
          }

          const locale = getLocale(file.id);
          const slug = idToSlug(file.id);

          // source URL 생성
          const sourceUrl = `${SITE_URL}/blog/${slug}/`;

          const cleanMd = mdxToCleanMarkdown(body, frontmatter, sourceUrl);

          // 출력 경로: dist/blog/{slug}/index.md
          const outPath = join(outDir, "blog", slug, "index.md");
          await mkdir(dirname(outPath), { recursive: true });
          await writeFile(outPath, cleanMd, "utf-8");
          count++;
        }

        logger.info(
          `Generated ${count} markdown files (${skipped} drafts skipped)`,
        );
      },
    },
  };
}
