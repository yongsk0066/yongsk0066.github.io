import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

import {
  transformMap,
  type Transform,
  type TransformKey,
  type TransformProps,
} from "./transforms";
import { korText, overview, overlayArt, text } from "./const";
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
  @state() private isHovering = false;

  private rows = 60;
  private cols = 200;
  private sentences: string[] = [];
  private overlayDelay = 4.5; // 3 real seconds (scaled by 1.5)
  private overlayRowInterval = 0.25;
  private overlayGarbleWindow = 0.15;
  // "yongseok.me" encoded as binary barcode — each bit = radial line segment
  private barcodePattern = (() => {
    const bits: boolean[] = [];
    for (const char of "yongseok.me") {
      const code = char.charCodeAt(0);
      for (let i = 7; i >= 0; i--) {
        bits.push(Boolean((code >> i) & 1));
      }
    }
    return bits;
  })();

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

    if (this.currentTime >= this.overlayDelay) {
      if (this.isHovering) {
        this.applySpeedLines(newMap);
      }
      this.applyOverlay(newMap);
    }

    this.cellMap = newMap;
  }

  private applyOverlay(map: string[][]): void {
    const elapsed = this.currentTime - this.overlayDelay;
    const artWidth = Math.max(...overlayArt.map((l) => l.length));
    const artHeight = overlayArt.length;
    const startX = Math.floor((this.cols - artWidth) / 2);
    const startY = Math.floor((this.rows - artHeight) / 2);
    const glitchChars = "|_-/\\[]{}#@$%&*!?~^+=<>";

    for (let row = 0; row < artHeight; row++) {
      const rowRevealTime = row * this.overlayRowInterval;
      if (elapsed < rowRevealTime) break;

      const rowElapsed = elapsed - rowRevealTime;
      const isGarbled = rowElapsed < this.overlayGarbleWindow;
      const line = overlayArt[row];

      for (let col = 0; col < line.length; col++) {
        const char = line[col];
        const gridX = startX + col;
        const gridY = startY + row;
        if (!this.validateCor(gridX, gridY)) continue;

        if (char === " ") {
          map[gridY][gridX] = " ";
        } else if (isGarbled) {
          map[gridY][gridX] =
            glitchChars[Math.floor(Math.random() * glitchChars.length)];
        } else {
          map[gridY][gridX] = char;
        }
      }
    }
  }

  private applySpeedLines(map: string[][]): void {
    const cx = this.cols / 2;
    const cy = this.rows / 2;
    const numSegments = this.barcodePattern.length; // 88 bits
    const rotation = this.currentTime * 0.15;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const dx = x - cx;
        const dy = (y - cy) * 1.7;

        if (dx === 0 && dy === 0) continue;

        const angle = Math.atan2(dy, dx);
        const normalizedAngle = ((angle + Math.PI * 2) % (Math.PI * 2));
        const segmentPos =
          ((normalizedAngle + rotation) / (Math.PI * 2)) * numSegments;
        const segmentIndex =
          ((Math.floor(segmentPos) % numSegments) + numSegments) % numSegments;

        if (this.barcodePattern[segmentIndex]) {
          const idx =
            Math.abs(
              Math.floor(
                Math.sin(x * 0.3 + y * 0.7 + this.currentTime) * chars.length
              )
            ) % chars.length;
          map[y][x] = chars[idx];
        }
      }
    }
  }

  private handleMouseMove = (e: MouseEvent) => {
    if (this.currentTime < this.overlayDelay) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;

    const artWidth = Math.max(...overlayArt.map((l) => l.length));
    const artHeight = overlayArt.length;
    const pad = 0.03;
    const x1 = (this.cols - artWidth) / 2 / this.cols - pad;
    const x2 = x1 + artWidth / this.cols + pad * 2;
    const y1 = (this.rows - artHeight) / 2 / this.rows - pad;
    const y2 = y1 + artHeight / this.rows + pad * 2;

    this.isHovering = nx >= x1 && nx <= x2 && ny >= y1 && ny <= y2;
  };

  private handleMouseLeave = () => {
    this.isHovering = false;
  };

  private handleClick = () => {
    if (this.currentTime >= this.overlayDelay) {
      window.location.href = "/blog";
    }
  };

  validateCor(x: number, y: number): boolean {
    return x >= 0 && x < this.cols && y >= 0 && y < this.rows;
  }

  render() {
    return html`
      <div
        id="text-grid"
        style=${this.isHovering ? "cursor: pointer" : ""}
        @mousemove=${this.handleMouseMove}
        @mouseleave=${this.handleMouseLeave}
        @click=${this.handleClick}
      >
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
