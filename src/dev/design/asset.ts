import type { APIRoute } from "astro";
import { join } from "node:path";
import { readFile } from "node:fs/promises";

export const prerender = false;

const types: Record<string, string> = {
  js: "text/javascript",
  mjs: "text/javascript",
  json: "application/json",
  wasm: "application/wasm",
  txt: "text/plain",
};

export const GET: APIRoute = async ({ params }) => {
  const file = params.file ?? "";
  if (!/^(?:manifest\.json|[\w.-]+\.[a-f0-9]{16}\.[a-z0-9]+)$/i.test(file))
    return new Response(null, { status: 404 });
  try {
    const bytes = await readFile(
      join(process.cwd(), ".reploom", "gallery", file)
    );
    return new Response(new Uint8Array(bytes), {
      headers: {
        "content-type":
          types[file.split(".").pop()!] ?? "application/octet-stream",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
};
