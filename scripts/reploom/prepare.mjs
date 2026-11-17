import { prepareProjects } from "@yongsk0066/reploom-build";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { projects } from "../../src/playground/projects.mjs";

const release = JSON.parse(
  await readFile(new URL("release.json", import.meta.url), "utf8")
);
const manifest = await prepareProjects({
  projects,
  projectRoot: fileURLToPath(new URL("../../", import.meta.url)),
  publicDir: "public",
  outDir: "public/reploom",
  publicBase: "/reploom/",
});

if (manifest.protocol !== release.protocol)
  throw new Error(
    `Expected Reploom protocol ${release.protocol}, received ${manifest.protocol}. Rebuild and reinstall the pinned packages.`
  );

console.log(
  `Prepared ${Object.keys(manifest.projects).length} Reploom projects with protocol ${manifest.protocol}`
);
