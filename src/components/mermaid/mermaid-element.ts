import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("mermaid-toggle")
export class Mermaid extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    .mermaid-code,
    .mermaid-svg {
      display: none;
    }
    .show {
      display: block;
    }
  `;

  @property({ type: String })
  mermaidCode = "";

  @property({ type: String })
  svgUrl = "";

  @property({ type: Boolean })
  showCode = false;

  toggleView() {
    this.showCode = !this.showCode;
  }

  render() {
    return html`
      <button @click="${this.toggleView}">Toggle View</button>
      <pre class="mermaid-code ${this.showCode ? "show" : ""}">
        <code>${this.mermaidCode}</code>
      </pre
      >
      <div class="mermaid-svg ${this.showCode ? "" : "show"}">
        <img src="${this.svgUrl}" alt="Mermaid Diagram" />
      </div>
    `;
  }
}
