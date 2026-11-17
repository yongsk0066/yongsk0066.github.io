import { execFileSync } from "node:child_process";
import { cp, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../../", import.meta.url));
const release = JSON.parse(await readFile(new URL("release.json", import.meta.url), "utf8"));
const source = path.join(root, ".reploom/source");
const output = path.join(root, ".reploom/packages");

function run(command, args, cwd = source) {
  return execFileSync(command, args, { cwd, stdio: "inherit" });
}

await mkdir(source, { recursive: true });
run("git", ["init", "--quiet"]);
run("git", [
  "fetch",
  "--quiet",
  "--depth=1",
  `https://github.com/${release.repository}.git`,
  release.commit,
]);
run("git", ["checkout", "--quiet", "--detach", release.commit]);

const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: source, encoding: "utf8" }).trim();
if (commit !== release.commit) throw new Error("Reploom checkout does not match the pinned commit");
const changes = execFileSync("git", ["status", "--porcelain", "--untracked-files=normal"], {
  cwd: source,
  encoding: "utf8",
}).trim();
if (changes) throw new Error("The generated Reploom checkout contains local changes");

run("pnpm", ["install", "--frozen-lockfile"]);
for (const name of ["reploom", "reploom-ui", "reploom-build"]) {
  run("pnpm", ["--filter", `@yongsk0066/${name}`, "build"]);
}
run("pnpm", ["pack:all"]);

const packages = path.join(source, "artifacts/packages");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of await readdir(packages)) {
  if (!file.endsWith(`-${release.version}.tgz`)) throw new Error(`Unexpected package: ${file}`);
  await cp(path.join(packages, file), path.join(output, file));
}
console.log(`Prepared Reploom ${release.commit.slice(0, 7)} in .reploom/packages`);
