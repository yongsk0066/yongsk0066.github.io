import { customElement } from "lit/decorators.js";
import { FigureElement } from "./common/figure-element";

@customElement("google-map-element")
export class GoogleMap extends FigureElement {
  get iframeSrc() {
    return this.src || "";
  }

  get iframeAttributes() {
    return {
      title: "Google Maps",
      allowfullscreen: "true",
      loading: "lazy",
      referrerpolicy: "no-referrer-when-downgrade",
    };
  }
}
