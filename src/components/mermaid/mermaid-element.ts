import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

/** mermaid는 무거우므로(수백 KB) 다이어그램이 뷰포트에 접근했을 때 한 번만 로드한다 */
let mermaidReady: Promise<typeof import("mermaid").default> | null = null;
const loadMermaid = () => {
  mermaidReady ??= import("mermaid").then(({ default: mermaid }) => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "neutral",
      fontFamily: "Pretendard, sans-serif",
    });
    return mermaid;
  });
  return mermaidReady;
};

let diagramSeq = 0;

/**
 * ```mermaid 코드펜스가 remark 플러그인(plugin/remark-mermaid)을 거쳐
 * 이 엘리먼트로 치환된다. 브라우저에서 mermaid를 lazy-load해 SVG로 렌더하고,
 * 로드 전/실패 시에는 원본 코드를 그대로 보여준다.
 */
@customElement("mermaid-diagram")
export class MermaidDiagram extends LitElement {
  static styles = css`
    :host {
      display: block;
      margin: 2rem auto;
    }
    figure {
      margin: 0;
      display: grid;
      place-items: center;
      overflow-x: auto;
    }
    figure svg {
      max-width: 100%;
      height: auto;
    }
    pre {
      overflow-x: auto;
      padding: 1rem;
      border-radius: 0.5rem;
      background-color: #0d1117;
      color: #e6edf3;
      font-size: 0.875rem;
      line-height: 1.6;
    }
  `;

  /** URI 인코딩된 mermaid 소스 */
  @property({ type: String })
  code = "";

  @state()
  private svg = "";

  @state()
  private failed = false;

  private observer?: IntersectionObserver;

  connectedCallback() {
    super.connectedCallback();
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.observer?.disconnect();
          this.renderDiagram();
        }
      },
      { rootMargin: "300px" }
    );
    this.observer.observe(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.observer?.disconnect();
  }

  private get source() {
    return decodeURIComponent(this.code);
  }

  private async renderDiagram() {
    try {
      const mermaid = await loadMermaid();
      const { svg } = await mermaid.render(
        `mermaid-diagram-${diagramSeq++}`,
        this.source
      );
      this.svg = svg;
    } catch (error) {
      console.error("[mermaid-diagram] render failed:", error);
      this.failed = true;
    }
  }

  render() {
    if (this.svg) {
      return html`<figure role="img" aria-label="Mermaid diagram">
        ${unsafeHTML(this.svg)}
      </figure>`;
    }
    return html`<pre aria-busy=${!this.failed}><code>${this.source}</code></pre>`;
  }
}
