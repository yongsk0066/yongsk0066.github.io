import { prepareProjects } from "@yongsk0066/reploom-build";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { publishedProjectIds } from "./article-projects.mjs";
import { projects } from "../../src/playground/projects.mjs";

const release = JSON.parse(
  await readFile(new URL("release.json", import.meta.url), "utf8")
);
const gallery = process.argv.includes("--gallery");
const published = gallery ? undefined : await publishedProjectIds();
const selected = published
  ? projects.filter(({ id }) => published.has(id))
  : projects;
if (published && selected.length !== published.size)
  throw new Error("An article references an undeclared playground");
const manifest = await prepareProjects({
  projects: selected,
  projectRoot: fileURLToPath(new URL("../../", import.meta.url)),
  publicDir: "public",
  outDir: gallery ? ".reploom/gallery" : "public/reploom",
  publicBase: gallery ? "/design/assets/" : "/reploom/",
});

if (manifest.protocol !== release.protocol)
  throw new Error(
    `Expected Reploom protocol ${release.protocol}, received ${manifest.protocol}. Rebuild and reinstall the pinned packages.`
  );

console.log(
  `Prepared ${Object.keys(manifest.projects).length} Reploom projects with protocol ${manifest.protocol}`
);
