import { type Locator, expect, type Page } from "@playwright/test";

async function writeCode(editor: Locator, source: string) {
  await editor.press("ControlOrMeta+a");
  await editor.evaluate((element, value) => {
    const event = new ClipboardEvent("paste", {
      clipboardData: new DataTransfer(),
      bubbles: true,
      cancelable: true,
    });
    event.clipboardData!.setData("text/plain", value);
    element.dispatchEvent(event);
  }, source);
}

export async function edit(article: Locator, path: string, source: string) {
  if (!(await article.locator(".reploom-editor").isVisible()))
    await article
      .locator(".reploom-view-controls:visible button")
      .last()
      .click();
  await article.getByRole("tab", { name: path, exact: true }).click();
  const activate = article.locator(".reploom-edit");
  if (await activate.count()) await activate.click();
  await writeCode(article.locator(".cm-content"), source);
}

export async function articleExample(page: Page, index: number) {
  await page.goto("/blog/useeffectevent/");
  const wrapper = page.locator(".article-playground").nth(index - 1);
  await wrapper.scrollIntoViewIfNeeded();
  const article = wrapper.locator("[data-project]");
  await expect(article).toHaveAttribute("data-phase", "ready");
  return article;
}
