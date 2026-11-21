import { readFile, rm } from "node:fs/promises";

// Old checkouts can still have the untracked JPEGs in public/. Keep their historical URLs
// working through _redirects and exclude those duplicate originals from local deployments.
export default function legacyPhotoLinks() {
  return { name: "legacy-photo-links", hooks: {
    "astro:build:done": async ({ dir }) => {
      const rules = await readFile(new URL("_redirects", dir), "utf8");
      for (const line of rules.split("\n")) {
        const [path, target] = line.trim().split(/\s+/);
        if (/^\/post\/images\/svalbard_3\/(?:sdr\/)?oslo_[\d_]+\.(?:jpg|png)$/.test(path) &&
            target?.startsWith("https://static.yongseok.me/media/v1/")) {
          await rm(new URL(path.slice(1), dir), { force: true });
        }
      }
    },
  } };
}
