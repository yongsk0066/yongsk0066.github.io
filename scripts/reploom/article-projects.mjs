import { glob, readFile } from "node:fs/promises";
import { parseFrontmatter } from "@astrojs/markdown-remark";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import { visit } from "unist-util-visit";

const parser = unified().use(remarkParse).use(remarkMdx);

export async function publishedProjectIds() {
  const root = new URL("../../src/content/blog/", import.meta.url);
  const ids = new Set();
  for await (const path of glob("**/*.mdx", { cwd: root })) {
    const source = await readFile(new URL(path, root), "utf8");
    if (!source.includes("<Playground")) continue;
    const { frontmatter, content } = parseFrontmatter(source);
    if (frontmatter.draft) continue;
    visit(parser.parse(content), (node) => {
      if (node.name !== "Playground" || !node.attributes) return;
      const project = node.attributes.find(
        (attr) => attr.name === "project"
      )?.value;
      if (typeof project !== "string")
        throw new Error("Expected a static project ID in " + path);
      ids.add(project);
    });
  }
  return ids;
}
