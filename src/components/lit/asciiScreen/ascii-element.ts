import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

import {
  transformMap,
  type Transform,
  type TransformKey,
  type TransformProps,
} from "./transforms";

const text = `
/helloWorld Sed ut peperspiciatis unde omnis iste natusrspiciatis unde omnis iste natus error sit.
/helloWorld voluptatetem accusantium doloremque laudantium,m accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore verita.
/helloWorld eaque ipspsa quae ab illo inventorea quae ab illo inventore veritatis et quasieaque ipsa quae ab illo inventore verita.
/helloWorld architectcto beatae vitae dicta sunto beatae vitae dicta sunt explicabo Nemo enim ipsam voluptatem.
/helloWorld quia voluluptas sit aspernatur aut oditptas sit aspernatur aut odit aut fugit, sed quia e porro quisquam e.
/helloWorld consequununtur magni dolores eos quitur magni dolores eos qui e porro quisquam e.
/helloWorld voluptatetem accusantium doloremque laudantium,m accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore verita.
/helloWorld eaque ipspsa quae ab illo inventorea quae ab illo inventore veritatis et quasieaque ipsa quae ab illo inventore verita.
/helloWorld architectcto beatae vitae dicta sunto beatae vitae dicta sunt explicabo Nemo enim ipsam voluptatem.
/helloWorld quia voluluptas sit aspernatur aut oditptas sit aspernatur aut odit aut fugit, sed quia e porro quisquam e.
/helloWorld consequununtur magni dolores eos qutur magni dolores eos qu.
/helloWorld ratione v voluptatem sequi nesciunt Neque porrooluptatem sequi nesciunt Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.
/helloWorld Ut enim a ad minima veniam, quisd minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur,.
/helloWorld vel illumum qui dolorem eum fugiat qui dolorem eum fugiat quo voluptas nulla pariatur?.
/helloWorld Sed ut peperspiciatis unde omnis iste natusrspiciatis unde omnis iste natus error site porro quisquam ee porro quisquam e .
/helloWorld But I musust explain to you howt explain to you how all this mistaken idea of denouncing pleasure and praising pain was born and I will give you a complete account of the system, and expound the actual teachings of the great explorer of the truth, the master-builder of human happiness.
/helloWorld No one rerejects, dislikes, orjects, dislikes, or avoids pleasure itself, because it is pleasure, but because those who do not know how to pursue pleasure rationally encounter consequences that are extremely painful.
/helloWorld Nor againin is there anyone who is there anyone who loves or pursues or desires to obtain pain of itself, because it is pain, but because occasionally circumstances occur in which toil and pain can procure him some great pleasure.
/helloWorld To take a a trivial example, which trivial example, which of us ever undertakes laborious physical exercise, except to obtain some advantage from it? But who has any right to find fault with a man who chooses to enjoy a pleasure that has no annoying consequences, or one who avoids a pain that produces no resultant pleasure?.  
`;

@customElement("ascii-element")
export class AsciiElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: monospace;
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
      line-height: 24px;
    }
    .cell {
      width: 12px;
      height: 20px;
      line-height: 20px;
      display: inline-block;
    }
    #text-grid {
      font-size: 20px;
      @media (max-width: 768px) {
        zoom: 0.6;
      }
    }
    ul {
      list-style: none;
      @media (max-width: 768px) {
        zoom: 0.6;
      }
    }

    .option {
      font-size: 32px;
      @media (max-width: 768px) {
        font-size: 24px;
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

  transfomer(props: TransformProps): [number, number] {
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
        const [nx, ny] = this.transfomer({
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
          (row) =>
            html`<div class="row">
              ${row.map((cell) => html`<div class="cell">${cell}</div>`)}
            </div>`
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
