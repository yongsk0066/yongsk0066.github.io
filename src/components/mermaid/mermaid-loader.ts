type Mermaid = typeof import("mermaid").default;

/** Share in-flight/successful imports, but let a later user action retry failures. */
export function createMermaidLoader(importModule: () => Promise<{ default: Mermaid }> = () => import("mermaid")) {
  let ready: Promise<Mermaid> | null = null;
  return () => {
    ready ??= importModule().then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        suppressErrorRendering: true,
        theme: "neutral",
        look: "classic",
        layout: "dagre",
        flowchart: { wrappingWidth: 200, minNodeWidth: 0 },
        state: { wrappingWidth: 200, minNodeWidth: 0 },
        fontFamily: "var(--font-pretendard, sans-serif)",
      });
      return mermaid;
    }).catch((error) => {
      ready = null;
      throw error;
    });
    return ready;
  };
}
