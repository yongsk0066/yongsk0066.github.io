import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import worker from "../../src/worker.js";

const root = path.resolve("dist");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".wasm": "application/wasm",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};
const env = {
  ASSETS: {
    async fetch(request) {
      const pathname = decodeURIComponent(new URL(request.url).pathname);
      const file = path.resolve(root, "." + pathname, pathname.endsWith("/") ? "index.html" : "");
      if (!file.startsWith(root + path.sep)) return new Response("Forbidden", { status: 403 });
      try {
        const bytes = await readFile(file);
        return new Response(bytes, {
          headers: { "content-type": types[path.extname(file)] || "application/octet-stream" },
        });
      } catch {
        return new Response("Not found", { status: 404 });
      }
    },
  },
};

http
  .createServer(async (req, res) => {
    const response = await worker.fetch(
      new Request(new URL(req.url, "http://127.0.0.1:4333"), { headers: req.headers }),
      env,
    );
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  })
  .listen(4333, "127.0.0.1");
