import { LitElement, css, html } from "lit";
import { property } from "lit/decorators.js";

export abstract class FigureElement extends LitElement {
  static styles = css`
    figure {
      margin: 0;
      width: 100%;
      display: flex;
      flex-direction: column;
      margin: 16px 0;
    }

    .iframe__wrapper {
      width: 100%;
      display: block;
      aspect-ratio: 16 / 9;
      border: none;
      background: black;
      border-radius: 0.5rem;
      box-shadow: rgb(0 0 0 / 36%) 0px 0px 12px 6px;
      overflow: hidden;
      margin: 0;
    }

    figcaption {
      display: block;
      text-align: center;
      margin-top: 0.4rem;
      font-size: 0.8rem;
      color: var(--color-text-secondary);
    }

    iframe {
      width: 100%;
      aspect-ratio: 16 / 9;
      border: none;
    }
  `;

  @property()
  src?: string;

  @property()
  caption?: string;

  abstract get iframeSrc(): string;

  // iframe 속성들을 반환하는 추상 메소드
  abstract get iframeAttributes(): Record<string, string>;

  render() {
    const attrs = this.iframeAttributes;
    return html`
      <figure>
        <div class="iframe__wrapper">
          <iframe
            src=${this.iframeSrc}
            .title=${attrs.title || ""}
            .allow=${attrs.allow || ""}
            .allowfullscreen=${attrs.allowfullscreen || ""}
            .loading=${attrs.loading || ""}
            .referrerpolicy=${attrs.referrerpolicy || ""}
          ></iframe>
        </div>
        ${this.caption ? html`<figcaption>${this.caption}</figcaption>` : ""}
      </figure>
    `;
  }
}
