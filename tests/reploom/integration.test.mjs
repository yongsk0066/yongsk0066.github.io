import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { acquirePlatform } from "../../src/components/article/reploom/platform.ts";
import { projects, galleryProjects } from "../../src/playground/projects.mjs";
import { publishedProjectIds } from "../../scripts/reploom/article-projects.mjs";
import worker from "../../src/worker.js";

test("Astro islands share a document platform until the last child unmounts", async () => {
  const document = {};
  const a = acquirePlatform(document);
  const b = acquirePlatform(document);
  assert.equal(a.platform, b.platform);
  a.release();
  a.release();
  await Promise.resolve();
  const c = acquirePlatform(document);
  assert.equal(b.platform, c.platform);
  b.release();
  c.release();
  // React Strict Mode's cleanup/setup cycle may reacquire in this same task.
  const d = acquirePlatform(document);
  await Promise.resolve();
  assert.equal(c.platform, d.platform);
  d.release();
  await Promise.resolve();
  const e = acquirePlatform(document);
  assert.notEqual(d.platform, e.platform);
  const independent = acquirePlatform({});
  assert.notEqual(e.platform, independent.platform);
  e.release();
  independent.release();
});

test("all translated article embeds reference prepared projects", async () => {
  const ids = new Set(projects.map(({ id }) => id));
  assert.equal(ids.size, projects.length);
  assert.equal(galleryProjects.length, 8);
  let count = 0;
  for (const locale of ["", "en/", "ja/"]) {
    for (const name of ["useEffectEvent", "moveBefore-적용기"]) {
      const source = await readFile(
        new URL(`../../src/content/blog/${locale}${name}.mdx`, import.meta.url),
        "utf8"
      );
      assert.doesNotMatch(
        source,
        /Sandpack|files=\{(?:example|problemExample|solutionExample)/
      );
      for (const match of source.matchAll(
        /<Playground\b[^>]*project="([^"]+)"/g
      )) {
        assert.ok(ids.has(match[1]), `Missing project ${match[1]}`);
        count++;
      }
    }
  }
  assert.equal(count, 15);
});

test("the production worker serves Reploom MIME types and revalidates its manifest", async () => {
  for (const [file, type, cache] of [
    [
      "compiler.0123456789abcdef.wasm",
      "application/wasm",
      "public, max-age=31536000, immutable",
    ],
    [
      "worker.0123456789abcdef.mjs",
      "text/javascript; charset=utf-8",
      "public, max-age=31536000, immutable",
    ],
    ["manifest.json", "application/json", "no-cache"],
  ]) {
    const response = await worker.fetch(
      new Request(`https://example.test/reploom/${file}`),
      {
        ASSETS: {
          fetch: async () =>
            new Response("asset", {
              headers: { "content-type": "application/json" },
            }),
        },
      }
    );
    assert.equal(response.headers.get("content-type"), type);
    assert.equal(response.headers.get("cache-control"), cache);
  }
});

test("production preparation selects only projects referenced by published articles", async () => {
  const ids = await publishedProjectIds();
  assert.equal(ids.size, 9);
  for (const id of ids) assert.match(id, /^effect-event-(ko|en|ja)-[123]$/);
});
