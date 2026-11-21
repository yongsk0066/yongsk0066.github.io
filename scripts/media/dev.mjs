import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { albums, photoName } from "../../src/lib/post-media.mjs";

// Serve only requested article photos during astro dev. Production never serves originals here.
export default function localPhotos() {
  return {
    name: "article-photo-preview",
    configureServer(server) {
      server.middlewares.use("/_local-photo", async (req, res, next) => {
        if (req.method !== "GET" && req.method !== "HEAD") return next();
        try {
          const parts = new URL(req.url, "http://localhost").pathname.slice(1).split("/");
          if (parts.length !== 2 || !albums.includes(parts[0])) return next();
          const name = photoName(decodeURIComponent(parts[1]));
          const path = join("media", parts[0], "originals", name);
          const info = await stat(path);
          res.setHeader("Content-Type", /\.png$/i.test(name) ? "image/png" : "image/jpeg");
          res.setHeader("Content-Length", info.size);
          res.setHeader("Cache-Control", "no-store");
          if (req.method === "HEAD") return res.end();
          createReadStream(path).on("error", () => res.destroy()).pipe(res);
        } catch { next(); }
      });
    },
  };
}
