import { visit } from "unist-util-visit";

// The page template owns h1. Preserve the relative hierarchy of article sections.
export default function remarkArticleHeadings() {
  return (tree, file) => {
    if (!file.path?.replaceAll("\\", "/").includes("/src/content/blog/"))
      return;
    let hasTitle = false;
    visit(tree, "heading", (node) => {
      if (node.depth === 1) hasTitle = true;
    });
    if (hasTitle)
      visit(tree, "heading", (node) => {
        node.depth = Math.min(6, node.depth + 1);
      });
  };
}
