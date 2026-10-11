import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import { visit } from "unist-util-visit";
import type { Root, RootContent, PhrasingContent } from "mdast";

type JsxNode = Extract<
  RootContent,
  { type: "mdxJsxFlowElement" | "mdxJsxTextElement" }
>;

function attribute(node: JsxNode, name: string): string | undefined {
  const attr = node.attributes.find(
    (item) => item.type === "mdxJsxAttribute" && item.name === name
  );
  return attr?.type === "mdxJsxAttribute" && typeof attr.value === "string"
    ? attr.value
    : undefined;
}

function cleanNodes(nodes: RootContent[], sourceUrl: string): RootContent[] {
  return nodes.flatMap((node): RootContent[] => {
    if (node.type === "mdxjsEsm") return [];
    if (
      node.type === "mdxFlowExpression" ||
      node.type === "mdxTextExpression"
    ) {
      const link: PhrasingContent = {
        type: "link",
        url: sourceUrl,
        children: [{ type: "text", value: "Dynamic content (original)" }],
      };
      return node.type === "mdxFlowExpression"
        ? [{ type: "paragraph", children: [link] }]
        : [link];
    }
    if (
      node.type === "mdxJsxFlowElement" ||
      node.type === "mdxJsxTextElement"
    ) {
      if (node.name === "script" || node.name === "style") return [];
      const children = cleanNodes(node.children as RootContent[], sourceUrl);
      const src = attribute(node, "src") || attribute(node, "url");
      const alt =
        attribute(node, "alt") ||
        attribute(node, "caption") ||
        node.name ||
        "Content";
      let replacement: PhrasingContent | undefined;
      if ((node.name === "img" || node.name === "Image") && src) {
        replacement = {
          type: "image",
          url: src,
          alt: attribute(node, "alt") || "",
          title: null,
        };
      } else if (node.name === "a" && attribute(node, "href")) {
        replacement = {
          type: "link",
          url: attribute(node, "href")!,
          children: children as PhrasingContent[],
        };
      } else if (
        src ||
        (!children.length && node.name && /^[A-Z]/.test(node.name))
      ) {
        replacement = {
          type: "link",
          url: src || sourceUrl,
          children: [
            {
              type: "text",
              value: src ? alt : `${alt} (interactive original)`,
            },
          ],
        };
      }
      if (replacement)
        return node.type === "mdxJsxFlowElement"
          ? [{ type: "paragraph", children: [replacement] }]
          : [replacement];
      return children;
    }
    // Fenced code, math and inline code are leaves and stay untouched.
    if ("children" in node)
      node.children = cleanNodes(
        node.children as RootContent[],
        sourceUrl
      ) as typeof node.children;
    return [node];
  });
}

export async function postMarkdown(
  body: string,
  data: {
    title: string;
    description?: string;
    date: Date;
    updatedDate?: Date;
    categories?: string[];
    series?: string;
  },
  sourceUrl: string
): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkMath)
    .use(remarkGfm)
    .use(() => (tree: Root) => {
      let hasTitle = false;
      visit(tree, "heading", (node) => {
        if (node.depth === 1) hasTitle = true;
      });
      if (hasTitle)
        visit(tree, "heading", (node) => {
          node.depth = Math.min(6, node.depth + 1) as typeof node.depth;
        });
      tree.children = cleanNodes(tree.children, sourceUrl) as Root["children"];
    })
    .use(remarkStringify)
    .process(body);
  const metadata = {
    title: data.title,
    description: data.description,
    date: data.date.toISOString(),
    ...(data.updatedDate ? { updated: data.updatedDate.toISOString() } : {}),
    categories: data.categories,
    series: data.series,
    source_url: sourceUrl,
  };
  const frontmatter = Object.entries(metadata)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join("\n");
  return `---\n${frontmatter}\n---\n\n# ${data.title}\n\n${result}`;
}
