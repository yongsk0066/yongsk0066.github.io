// import { LitElement, css, html } from "lit";
// import { customElement, property } from "lit/decorators.js";
// import { repeat } from "lit/directives/repeat.js";

// @customElement("ascii-screen-element")
// export class AsciiScreenElement extends LitElement {
//   static styles = css`
//     .screen {
//       width: 100%;
//       position: relative;
//       aspect-ratio: 3 / 4;
//       background-color: #f5f5f5;
//       margin: 0;
//       padding: 0;
//       font-family: monospace;
//       will-change: transform;
//     }
//     span {
//       margin: 0;
//       padding: 0;
//       line-height: 1;
//     }

//     .row {
//       display: block;
//     }
//     span .pixel {
//       display: inline-block;
//     }
//     .container {
//       display: flex;
//       flex-direction: column;
//     }
//   `;

//   width = 60;
//   height = 40;

//   @property({ type: Array })
//   screen: string[][] = Array.from({ length: this.height }, () =>
//     Array.from({ length: this.width }, () => "A")
//   );

//   // updateScreenRandom() {
//   //   this.screen = this.screen.map((row) =>
//   //     row.map(() => (Math.random() > 0.1 ? "1" : "0"))
//   //   );
//   // }

//   // connectedCallback() {
//   //   super.connectedCallback();
//   //   const fps = 24;
//   //   const interval = 1000 / fps;
//   //   let then = performance.now();
//   //   const update = () => {
//   //     const now = performance.now();
//   //     const delta = now - then;
//   //     if (delta > interval) {
//   //       then = now - (delta % interval);
//   //       this.updateScreenRandom();
//   //     }
//   //     requestAnimationFrame(update);
//   //   };
//   //   requestAnimationFrame(update);
//   // }
//   firstUpdated() {
//     // 컴포넌트가 처음 업데이트될 때(초기 렌더링 후) 실행
//     this.renderInitialScreen();
//   }

//   renderInitialScreen() {
//     const container = this.shadowRoot.querySelector(".container");
//     this.screen.forEach((row, rowIndex) => {
//       const rowElement = document.createElement("div");
//       rowElement.className = "row";
//       row.forEach((pixel, pixelIndex) => {
//         const pixelElement = document.createElement("span");
//         pixelElement.className = `pixel row-${rowIndex} pixel-${pixelIndex}`;
//         pixelElement.textContent = pixel;
//         rowElement.appendChild(pixelElement);
//       });
//       container.appendChild(rowElement);
//     });
//   }

//   render() {
//     return html``;
//   }
// }
