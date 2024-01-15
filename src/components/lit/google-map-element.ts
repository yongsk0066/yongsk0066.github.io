import { customElement } from "lit/decorators.js";
import { FigureElement } from "./common/figure-element";

@customElement("google-map-element")
export class GoogleMap extends FigureElement {
  get iframeSrc() {
    return this.src || "";
  }

  get iframeAttributes(): Partial<HTMLIFrameElement> {
    return {
      title: "Google Maps",
      allowFullscreen: true,
      loading: "lazy",
      referrerPolicy: "no-referrer-when-downgrade",
    };
  }
}
