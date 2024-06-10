import { customElement } from "lit/decorators.js";
import { FigureElement } from "./common/figure-element";

@customElement("youtube-element")
export class YouTube extends FigureElement {
  get iframeSrc() {
    const videoId = this.extractVideoId(this.src);
    const startTime = this.extractStartTime(this.src);
    return `https://www.youtube.com/embed/${videoId}?start=${startTime}`;
  }

  get iframeAttributes(): Partial<HTMLIFrameElement> {
    return {
      title: "YouTube Video Player",
      allow:
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
      loading: "lazy",
      referrerPolicy: "no-referrer-when-downgrade",
    };
  }

  extractVideoId(url?: string) {
    if (!url) return "";
    const regExp = /^https:\/\/youtu\.be\/([a-zA-Z0-9_-]+)/;
    const match = url.match(regExp);
    return match ? match[1] : "";
  }
  extractStartTime(url?: string) {
    if (!url) return "0";
    const urlObj = new URL(url);
    return urlObj.searchParams.get("t") || "0";
  }
}
