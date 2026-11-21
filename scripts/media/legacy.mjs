import { readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { albums, cdn, photoFiles, readManifest } from "../../src/lib/post-media.mjs";

// The first pilot migrates photos which already had public URLs. Keep those URLs working
// without shipping a second full-size copy, or the original GPS tags, in Workers Assets.
export default function legacyPhotoLinks() {
  return { name: "legacy-photo-links", hooks: {
    "astro:build:done": async ({ dir }) => {
      const dist = fileURLToPath(dir);
      const redirects = [];
      for (const album of albums) {
        for (const [name, photo] of Object.entries(readManifest(album).photos)) {
          const files = photoFiles(photo);
          for (const [source, key] of [[name, files.full], ["sdr/" + name, files.sdr]]) {
            const path = "post/images/" + album + "/" + source;
            if (!key || !existsSync(join("public", path))) continue;
            await rm(join(dist, path), { force: true });
            redirects.push("/" + path.split("/").map(encodeURIComponent).join("/") + " " + cdn + "/" + key + " 302");
          }
        }
      }
      if (redirects.length) {
        const file = join(dist, "_redirects");
        const previous = existsSync(file) ? (await readFile(file, "utf8")).trimEnd() + "\n" : "";
        await writeFile(file, previous + redirects.join("\n") + "\n");
      }
    },
  } };
}
