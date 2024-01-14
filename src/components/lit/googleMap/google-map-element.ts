import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("google-map-element")
export class GoogleMap extends LitElement {
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

  render() {
    return html`
      <figure>
        <div class="iframe__wrapper">
          <iframe
            src="${this.src}"
            title="YouTube Video Player"
            allowfullscreen=""
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
        ${this.caption ? html`<figcaption>${this.caption}</figcaption>` : ""}
      </figure>
    `;
  }
}
