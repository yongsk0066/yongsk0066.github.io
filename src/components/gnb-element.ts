import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("gnb-element")
export class Gnb extends LitElement {
  // Define scoped styles right with your component, in plain CSS
  static styles = css`
    :host {
      color: black;
    }
    .gnb {
      background-color: black;
      height: 64px;
      display: flex;
      padding: 16px;
      box-sizing: border-box;
      color: white;
      font-size: 24px;

      > a {
        color: white;
        text-decoration: none;
      }
    }
  `;

  // Render the UI as a function of component state
  render() {
    return html`<nav class="gnb">
      <a href="/"> YONGSEOK BLOG</a>
    </nav>`;
  }
}
