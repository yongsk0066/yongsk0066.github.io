import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 2,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["json", { outputFile: `${root}test-results/reploom-results.json` }]],
  outputDir: "../../test-results/reploom",
  use: {
    baseURL: "http://127.0.0.1:4331",
    headless: true,
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  projects: ["chromium", "firefox", "webkit"].map((browserName) => ({
    name: browserName,
    use: { browserName: browserName as "chromium" | "firefox" | "webkit" },
  })),
  webServer: {
    command: "node tests/reploom/serve.mjs",
    cwd: root,
    url: "http://127.0.0.1:4331/design/playground/",
    reuseExistingServer: false,
  },
});
