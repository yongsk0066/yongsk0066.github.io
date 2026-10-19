import test from "node:test";
import assert from "node:assert/strict";
import { createMermaidLoader } from "../src/components/mermaid/mermaid-loader.ts";

test("concurrent diagrams share an import, and a failed download can be retried", async () => {
  let attempts = 0;
  let initialized = 0;
  const mermaid = { initialize() { initialized++; } };
  const load = createMermaidLoader(async () => {
    if (++attempts === 1) throw new TypeError("Network download failed");
    return { default: mermaid };
  });
  const first = load();
  assert.equal(first, load());
  await assert.rejects(first, /Network download failed/);
  assert.equal(await load(), mermaid);
  assert.equal(await load(), mermaid);
  assert.equal(attempts, 2);
  assert.equal(initialized, 1);
});

test("initialization failures are recoverable too", async () => {
  let attempts = 0;
  const mermaid = { initialize() { if (++attempts === 1) throw new Error("Initialization failed"); } };
  const load = createMermaidLoader(async () => ({ default: mermaid }));
  await assert.rejects(load(), /Initialization failed/);
  assert.equal(await load(), mermaid);
});
