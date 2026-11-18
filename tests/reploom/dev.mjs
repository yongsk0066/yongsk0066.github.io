import { dev } from "astro";

const server = await dev({ server: { host: "127.0.0.1", port: 4332 } });
process.once("SIGTERM", () => server.stop());
