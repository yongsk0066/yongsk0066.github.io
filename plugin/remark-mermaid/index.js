import { visit } from "unist-util-visit";

/**
 * ```mermaid 코드펜스를 <mermaid-diagram> 커스텀 엘리먼트로 치환한다.
 *
 * 렌더링은 빌드 타임이 아니라 독자의 브라우저에서 일어난다
 * (src/components/mermaid/mermaid-element.ts). mmdc(puppeteer) 같은
 * 빌드 타임 브라우저 의존이 없으므로 CI/로컬 환경을 타지 않는다.
 *
 * 다이어그램 소스는 attribute로 안전하게 넘기기 위해 URI 인코딩한다.
 */
export default function remarkMermaid() {
  return (tree) => {
    visit(tree, "code", (node, index, parent) => {
      if (node.lang !== "mermaid" || !parent || index === undefined) return;

      parent.children[index] = {
        type: "mdxJsxFlowElement",
        name: "mermaid-diagram",
        attributes: [
          {
            type: "mdxJsxAttribute",
            name: "code",
            value: encodeURIComponent(node.value),
          },
        ],
        children: [],
      };
    });
  };
}
