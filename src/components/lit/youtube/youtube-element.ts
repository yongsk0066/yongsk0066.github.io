import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("youtube-element")
export class YouTube extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      border-radius: 16px;
      overflow: hidden;
      aspect-ratio: 16 / 9;
      box-shadow: rgb(0 0 0 / 36%) 0px 0px 12px 6px;
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
      <iframe
        class="aspect-video"
        src="https://www.youtube.com/embed/${this.videoId}"
        title="YouTube Video Player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      ></iframe>
    `;
  }
}
