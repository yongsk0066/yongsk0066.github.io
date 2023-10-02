import {LitElement, css, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';

@customElement('common-body')
export class CommonBody extends LitElement {
  // Define scoped styles right with your component, in plain CSS
  static styles = css`
    :host {
      color: black;
      max-width: 800px;
      margin: 0 auto;
    }
  `;


  // Render the UI as a function of component state
  render() {
    return html`<main class="main" >
      <slot></slot>
    </main>`;
  }
}
