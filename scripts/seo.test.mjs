import test from "node:test";
import assert from "node:assert/strict";
import worker, { prefersMarkdown } from "../src/worker.js";
import { postMarkdown } from "../src/lib/markdown.ts";
import { serializeJsonLd } from "../src/lib/seo.ts";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import articleHeadings from "../plugin/remark-article-headings/index.js";

test("article section headings preserve hierarchy without changing other pages", async () => {
  const processor = unified()
    .use(remarkParse)
    .use(articleHeadings)
    .use(remarkStringify);
  const body = "# Section\n\n## Subsection\n";
  assert.equal(
    String(
      await processor.process({
        value: body,
        path: "/repo/src/content/blog/example.mdx",
      })
    ),
    "## Section\n\n### Subsection\n"
  );
  assert.equal(
    String(
      await processor.process({
        value: body,
        path: "/repo/src/content/question/example.mdx",
      })
    ),
    body
  );
});

test("Markdown negotiation respects explicit exclusions, quality and specificity", () => {
  for (const [accept, expected] of [
    ["text/markdown", true],
    ["text/html, text/markdown;q=0", false],
    ["text/html;q=1, text/markdown;q=0.5", false],
    ["text/html;q=0.5, text/markdown;q=1", true],
    ["text/markdown, */*", true],
    ["text/html, text/markdown", false],
    ["text/markdown, text/html", true],
    ["text/*;q=1, text/markdown;q=0", false],
    ["text/html;q=0, text/markdown;q=0.5, */*;q=1", true],
    ["text/markdown;q=invalid", false],
    ["text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", false],
    ["*/*", false],
  ])
    assert.equal(prefersMarkdown(accept), expected, accept);
});

const env = {
  ASSETS: {
    fetch: async (request) => {
      const path = new URL(request.url).pathname;
      if (path === "/blog/example/index.md")
        return new Response("# Example", {
          headers: { Vary: "Accept-Encoding" },
        });
      if (path.endsWith("/index.md"))
        return new Response("Missing", { status: 404 });
      return new Response("<h1>Example</h1>", {
        headers: { "Content-Type": "text/html", Vary: "Accept-Encoding" },
      });
    },
  },
};

test("both representations vary by Accept; Markdown alone is noindex", async () => {
  for (const [accept, markdown] of [
    ["text/markdown", true],
    ["text/html, text/markdown;q=0", false],
  ]) {
    const response = await worker.fetch(
      new Request("https://yongseok.me/blog/example/", {
        headers: { Accept: accept },
      }),
      env
    );
    assert.equal(response.status, 200);
    assert.match(response.headers.get("vary"), /Accept-Encoding, Accept/i);
    assert.equal(
      response.headers.get("x-robots-tag"),
      markdown ? "noindex" : null
    );
    assert.equal(
      await response.text(),
      markdown ? "# Example" : "<h1>Example</h1>"
    );
  }
  const direct = await worker.fetch(
    new Request("https://yongseok.me/blog/example/index.md"),
    env
  );
  assert.match(direct.headers.get("content-type"), /^text\/markdown/);
  assert.equal(direct.headers.get("x-robots-tag"), "noindex");
  const fallback = await worker.fetch(
    new Request("https://yongseok.me/blog/no-markdown/", {
      headers: { Accept: "text/markdown" },
    }),
    env
  );
  assert.equal(fallback.headers.get("content-type"), "text/html");
  assert.match(fallback.headers.get("vary"), /Accept/);
});

test("Markdown preserves code and math, uses parsed metadata, and links interactive originals", async () => {
  const result = await postMarkdown(
    'import Example from "./example";\n\n## Heading\n\nInline `const x = {a: 1}` and $x^2$.\n\n```jsx\n<Example />\n{value}\n```\n\n$$\n\\frac{a}{b}\n$$\n\n<Video src="https://example.com/movie.mp4" />\n\n<Example />\n',
    {
      title: 'A "quoted" title',
      description: "First line\nSecond: line",
      date: new Date("2026-10-11T00:00:00Z"),
    },
    "https://yongseok.me/blog/example/"
  );
  assert.match(result, /description: "First line\\nSecond: line"/);
  assert.match(result, /```jsx\n<Example \/>\n\{value\}\n```/);
  assert.match(result, /\\frac\{a\}\{b\}/);
  assert.match(result, /\[Video\]\(https:\/\/example.com\/movie.mp4\)/);
  assert.match(
    result,
    /\[Example \(interactive original\)\]\(https:\/\/yongseok.me\/blog\/example\/\)/
  );
  assert.doesNotMatch(result, /import Example/);
});

test("JSON-LD cannot close its script element", () => {
  const data = { headline: "</script><script>alert(1)</script>" };
  const encoded = serializeJsonLd(data);
  assert.doesNotMatch(encoded, /<\/script>/);
  assert.deepEqual(JSON.parse(encoded), data);
});

test("Markdown keeps tables and strikethrough and reserves h1 for the post title", async () => {
  const result = await postMarkdown(
    "# Section\n\n| Name | Value |\n| --- | --- |\n| A | 1 |\n\n~~old~~",
    { title: "Table", date: new Date("2026-10-11") },
    "https://yongseok.me/blog/table/"
  );
  assert.match(result, /^## Section$/m);
  assert.match(result, /\| Name \| Value \|/);
  assert.match(result, /~~old~~/);
  assert.equal(result.match(/^# /gm)?.length, 1);
});
