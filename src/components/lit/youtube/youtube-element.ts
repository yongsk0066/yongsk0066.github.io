import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("youtube-element")
export class YouTube extends LitElement {
  static styles = css`
    :host {
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
      border-radius: 16px;
      box-shadow: rgb(0 0 0 / 36%) 0px 0px 12px 6px;
      overflow: hidden;
    }

    caption {
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

  get videoId() {
    return this.extractVideoId(this.src);
  }

  extractVideoId(url?: string) {
    if (!url) return "";
    const regExp = /^https:\/\/youtu\.be\/([a-zA-Z0-9_-]+)/;
    const match = url.match(regExp);
    return match ? match[1] : "";
  }

  render() {
    return html`
      <div class="iframe__wrapper">
        <iframe
          src="https://www.youtube.com/embed/${this.videoId}"
          title="YouTube Video Player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        ></iframe>
      </div>
      ${this.caption
        ? html`<caption>
            ${this.caption}
          </caption>`
        : ""}
    `;
  }
}
