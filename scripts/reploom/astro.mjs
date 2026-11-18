import { execFileSync } from "node:child_process";
import { readdir, readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export default function playgroundRoutes() {
  return {
    name: "blog-playgrounds",
    hooks: {
      async "astro:config:setup"({ command, injectRoute, updateConfig }) {
        if (command === "build") {
          const manifest = await readFile(
            new URL("../../public/reploom/manifest.json", import.meta.url),
            "utf8"
          );
          updateConfig({
            vite: { define: { __ARTICLE_PLAYGROUND_MANIFEST__: manifest } },
          });
        }
        if (command !== "dev") return;
        execFileSync(
          process.execPath,
          [fileURLToPath(new URL("prepare.mjs", import.meta.url)), "--gallery"],
          { stdio: "inherit" }
        );
        for (const [pattern, filename] of [
          ["/design", "index.astro"],
          ["/design/playground", "playground.astro"],
          ["/design/assets/[file]", "asset.ts"],
        ]) {
          injectRoute({
            pattern,
            entrypoint: fileURLToPath(
              new URL("../../src/dev/design/" + filename, import.meta.url)
            ),
          });
        }
      },
      async "astro:build:done"({ dir }) {
        const assets = new URL("reploom/", dir);
        const live = new Set(["manifest.json"]);
        JSON.parse(
          await readFile(new URL("manifest.json", assets), "utf8"),
          (_, value) => {
            if (value?.sha256 && typeof value.url === "string")
              live.add(value.url.split("/").pop());
            return value;
          }
        );
        for (const file of await readdir(assets)) {
          if (!live.has(file))
            await rm(new URL(file, assets), { recursive: true });
        }
      },
    },
  };
}
