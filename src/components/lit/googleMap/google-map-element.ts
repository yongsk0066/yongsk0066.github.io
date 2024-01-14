import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("google-map-element")
export class GoogleMap extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      border-radius: 16px;
      overflow: hidden;
      aspect-ratio: 16 / 9;

      background: black;
      margin: 1rem 0;
    }
    iframe {
      width: 100%;
      aspect-ratio: 16 / 9;
      border: none;
    }
  `;

  @property()
  src?: string;

  render() {
    return html`
      <iframe
        src="${this.src}"
        title="YouTube Video Player"
        allowfullscreen=""
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
      ></iframe>
    `;
  }
}
