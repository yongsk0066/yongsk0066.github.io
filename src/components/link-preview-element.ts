import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Task } from "@lit/task";

@customElement("link-preview-element")
export class LinkPreview extends LitElement {
  static styles = css``;

  @property()
  url = "";

  firstUpdated() {
    console.log("firstUpdated", this.url);
  }

  private getLinkData = new Task(this, {
    task: async ([url], { signal }) => {
      const response = await fetch(url, { signal });
      const data = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(data, "text/html");
      const title = doc.querySelector("title")?.textContent;
      const description = doc
        .querySelector("meta[name='description']")
        ?.getAttribute("content");
      const image = doc
        .querySelector("meta[property='og:image']")
        ?.getAttribute("content");
      return { title, description, image };
    },
    args: () => [this.url],
  });

  render() {
    return this.getLinkData.render({
      pending: () => html`<div>Loading...</div>`,
      complete: (result) => html`
        <div>
          <h2>${result.title}</h2>
          <p>${result.description}</p>
          <img src=${result.image} />
        </div>
      `,
    });
  }
}
