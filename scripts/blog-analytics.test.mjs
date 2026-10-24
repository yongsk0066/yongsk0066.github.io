import test from "node:test";
import assert from "node:assert/strict";
import { createReadingSession, isArticlePath } from "../src/lib/blog-analytics.ts";

test("a quick scroll or time spent without reaching the end does not count as a read", () => {
  const observe = createReadingSession();
  assert.equal(observe(0, true, 1), null);
  assert.equal(observe(1000, true, 1), null);
  for (let t = 2000; t <= 31_000; t += 1000) assert.equal(observe(t, true, 0.5), null);
  assert.equal(observe(32_000, true, 0.95), 32);
  assert.equal(observe(33_000, true, 1), null);
});

test("hidden, unfocused or idle time does not advance active reading", () => {
  const observe = createReadingSession();
  observe(0, true, 1);
  for (let t = 1000; t <= 20_000; t += 1000) observe(t, true, 1);
  for (let t = 21_000; t <= 120_000; t += 1000) assert.equal(observe(t, false, 1), null);
  assert.equal(observe(121_000, true, 1), null);
  for (let t = 122_000; t < 131_000; t += 1000) assert.equal(observe(t, true, 1), null);
  assert.equal(observe(131_000, true, 1), 30);
});

test("returning after a suspended timer does not count the gap", () => {
  const observe = createReadingSession();
  observe(0, true, 1);
  assert.equal(observe(120_000, true, 1), null);
  for (let t = 121_000; t < 150_000; t += 1000) assert.equal(observe(t, true, 1), null);
  assert.equal(observe(150_000, true, 1), 30);
});

test("only article URLs are classified as articles, including localized slugs", () => {
  for (const path of ["/blog/post", "/blog/post/", "/blog/en/post/", "/blog/ja/글/"]) assert.equal(isArticlePath(path), true);
  for (const path of ["/", "/blog/", "/blog/en", "/blog/en/", "/blog/ja/", "/subscribe/", "/blog/post/index.md"]) assert.equal(isArticlePath(path), false);
});
