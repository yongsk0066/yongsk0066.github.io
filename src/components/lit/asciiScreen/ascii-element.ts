import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

import {
  transformMap,
  type Transform,
  type TransformKey,
  type TransformProps,
} from "./transforms";
import { korText, text } from "./const";

@customElement("ascii-element")
export class AsciiElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: "JetBrains Mono", monospace;
      font-optical-sizing: auto;
      background-color: rgb(9, 3, 44);
      color: rgb(96, 124, 198);
      zoom: 0.5;
      aspect-ratio: 16 / 9;
      border-radius: 0.5rem;
      overflow: hidden;
      margin: 16px 0;
      transform: translate(0);
    }

    .row {
      line-height: 20px;
      display: inline-block;
      white-space: pre;
    }

    #text-grid {
      font-size: 20px;
      overflow: hidden;

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

  @property({ type: Array })
  transforms: (TransformKey | Transform)[] = [
    (props: TransformProps) => [props.x, props.y],
  ];

  @state() private cellMap: string[][] = [];
  @state() private animationBegin: number | null = null;
  @state() private currentTime: number = 0;
  @state() private fps: number = 0;
  @state() private fpsHistory: number[] = []; // FPS 측정치 저장 배열

  private lastFrameTime: DOMHighResTimeStamp = 0; // 마지막 프레임 시간 기록
  private rows = 30;
  private cols = 100;
  private sentences: string[] = [];

  connectedCallback(): void {
    super.connectedCallback();
    this.initCells();
    requestAnimationFrame(this.animateText.bind(this));
  }

  initCells(): void {
    this.sentences = text
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
    const delta = time - this.lastFrameTime;
    this.lastFrameTime = time;
    if (delta > 0) {
      const fps = 1000 / delta;
      this.fpsHistory.push(fps);
      // 배열 길이를 최근 100개 측정치로 제한
      if (this.fpsHistory.length > 100) {
        this.fpsHistory.shift();
      }
    }
    this.currentTime = ((time - this.animationBegin) / 1000) * 1.5;
    this.drawText();
    requestAnimationFrame(this.animateText.bind(this));
  }
  get averageFPS(): number {
    // FPS 평균 계산
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    return sum / this.fpsHistory.length || 0;
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
        ${this.cellMap.map(
          (row) => html`<div class="row">${row.join("")}</div>`
        )}
      </div>
      ${this.transforms.length &&
      html`<ul>
        <li class="option">-----</li>
        ${repeat(
          this.transforms,
          (transform) => transform,
          (transform) =>
            html`<li class="option">
              ${typeof transform === "function" ? transform.name : transform}
            </li>`
        )}
        <li class="option">-----</li>
        <li class="option">FPS:</li>
        <li class="option">${this.averageFPS.toFixed(2)}</li>
        <li class="option">-----</li>
      </ul>`}
    `;
  }
}
