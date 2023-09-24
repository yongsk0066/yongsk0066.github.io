import {LitElement, css, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';

@customElement('gnb-element')
export class Gnb extends LitElement {
  // Define scoped styles right with your component, in plain CSS
  static styles = css`
    :host {
      color: black;
    }
    .gnb {
      background-color: #f1f1f1;
    }
  `;


  // Render the UI as a function of component state
  render() {
    return html`<div class="gnb" >네비게이션바</div>`;
  }
}
