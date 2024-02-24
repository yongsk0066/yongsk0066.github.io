import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

import {
  transformMap,
  type Transform,
  type TransformKey,
  type TransformProps,
} from "./transforms";
import { korText, overview, text } from "./const";
import { keyframes } from "./animation";

@customElement("home-cover-element")
export class HomeCoverElement extends LitElement {
  static styles = css`
    ${keyframes}

    :host {
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: "JetBrains Mono", monospace;
      font-optical-sizing: auto;
      background-color: rgb(9, 3, 44);
      color: rgb(96, 124, 198);
      border-radius: 0.5rem;
      overflow: hidden;
      width: 100%;
      height: 100%;
    }

    .glass {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 0.5rem;
      padding: 1rem;
      position: absolute;
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      /* animation: flicker 1s infinite; */
      opacity: 0.3;
      filter: url(#sphereMapTest);
    }

    .row {
      line-height: 20px;
      display: inline-block;
      white-space: pre;
    }

    #text-grid {
      font-size: 20px;
      transform: translate(0);
      display: flex;
      flex-direction: column;
      animation: textShadow 1s infinite;

      @media (max-width: 768px) {
        zoom: 0.6;
      }
    }
    ul {
      list-style: none;
      @media (max-width: 768px) {
        zoom: 0.7;
      }
      margin-right: 8px;
    }

    .option {
      font-size: 24px;
      @media (max-width: 768px) {
        font-size: 18px;
      }
    }
  `;

  @property({ type: Array<TransformKey | Transform> })
  transforms: (TransformKey | Transform)[] = ["spiral"];

  @state() private cellMap: string[][] = [];
  @state() private animationBegin: number | null = null;
  @state() private currentTime: number = 0;

  private rows = 60;
  private cols = 200;
  private sentences: string[] = [];

  connectedCallback(): void {
    super.connectedCallback();
    this.initCells();
    requestAnimationFrame(this.animateText.bind(this));
  }

  initCells(): void {
    this.sentences = overview
      .split(/[\n\r]/)
      .filter((s) => s.length > 0)
      .map((s) => s + " ");

    for (let y = 0; y < this.rows; y++) {
      this.cellMap[y] = [];
      for (let x = 0; x < this.cols; x++) {
        this.cellMap[y][x] = this.getCharAt(x, y);
      }
    }
  }

  getCharAt(x: number, y: number): string {
    const si = y % this.sentences.length;
    const ci = Math.min(x, this.sentences[si].length - 1);
    return this.sentences[si][ci] || " ";
  }

  animateText(time: number): void {
    if (this.animationBegin === null) {
      this.animationBegin = time;
    }
    this.currentTime = ((time - this.animationBegin) / 1000) * 1.5;
    this.drawText();
    requestAnimationFrame(this.animateText.bind(this));
  }

  transformer(props: TransformProps): [number, number] {
    return this.transforms.reduce(
      (acc, transform) => {
        const resolvedTransform: Transform =
          typeof transform === "function" ? transform : transformMap[transform];

        return resolvedTransform({ ...props, x: acc[0], y: acc[1] });
      },
      [props.x, props.y]
    );
  }

  drawText(): void {
    const newMap: string[][] = Array.from({ length: this.rows }, () =>
      Array(this.cols).fill(" ")
    );
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const [nx, ny] = this.transformer({
          x: x / this.cols,
          y: y / this.rows,
          cx: 0.5,
          cy: 0.5,
          time: this.currentTime,
        });
        const nxInt = Math.floor(nx * this.cols);
        const nyInt = Math.floor(ny * this.rows);
        if (this.validateCor(nxInt, nyInt)) {
          newMap[nyInt][nxInt] = this.getCharAt(x, y);
        }
      }
    }
    this.cellMap = newMap;
  }

  validateCor(x: number, y: number): boolean {
    return x >= 0 && x < this.cols && y >= 0 && y < this.rows;
  }

  render() {
    return html`
      <div id="text-grid">
        <div class="glass" style="{filter(url(#SphereMapTest))}"></div>
        ${this.cellMap.map(
          (row) => html`<div class="row">${row.join("")}</div>`
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "home-cover-element": HomeCoverElement;
  }
}
