import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { edit } from "./helpers";

test.use({ baseURL: "http://127.0.0.1:4332" });

async function gallery(page: Page, id: string) {
  await page.goto("/design/playground/");
  await page.getByLabel("예제 선택").selectOption(id);
  const article = page.locator(`[data-project="${id}"]`);
  await expect(article).toHaveAttribute("data-phase", "ready");
  return { article, preview: article.frameLocator("iframe") };
}

test("the gallery waits for hydration before accepting a selection", async ({
  page,
}) => {
  let resume!: () => void;
  const waiting = new Promise<void>((resolve) => {
    resume = resolve;
  });
  await page.route(
    /\/src\/dev\/design\/Gallery\.tsx(?:\?|$)/,
    async (route) => {
      await waiting;
      await route.continue();
    }
  );
  await page.goto("/design/playground/", { waitUntil: "domcontentloaded" });
  try {
    await expect(page.getByLabel("예제 선택")).toBeDisabled();
  } finally {
    resume();
  }
  await page.getByLabel("예제 선택").selectOption("dom-counter");
  await expect(page.locator('[data-project="dom-counter"]')).toHaveAttribute(
    "data-phase",
    "ready"
  );
  await expect(page.locator(".reploom iframe")).toHaveCount(1);
});

test("moveBefore examples retain the existing Dialog and Portal behavior", async ({
  page,
}) => {
  const { article, preview } = await gallery(page, "move-before-solution");
  await article.locator("iframe").scrollIntoViewIfNeeded();
  await preview
    .getByRole("button", { name: "Toast 띄우기", exact: true })
    .first()
    .click();
  await expect(preview.getByText("Toast!", { exact: true })).toBeVisible();
  await preview.getByRole("button", { name: "Modal 열기" }).click();
  await expect(preview.locator("dialog")).toHaveAttribute("open", "");
  await expect(
    preview.locator("dialog").getByText("Toast!", { exact: true })
  ).toBeVisible();
  await preview.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(preview.locator("dialog")).not.toHaveAttribute("open");
  await expect(preview.getByText("Toast!", { exact: true })).toBeVisible();
  const source = await readFile(
    new URL(
      "../../src/content/blog/_examples/moveBefore/solution/App.jsx",
      import.meta.url
    ),
    "utf8"
  );
  await edit(
    article,
    "/App.jsx",
    source.replace("해결: Toast를 Dialog 안으로 이동", "Portal example edited")
  );
  await expect(preview.locator("h3")).toHaveText("Portal example edited");
  await article.locator("iframe").scrollIntoViewIfNeeded();
  await preview.getByRole("button", { name: "Modal 열기" }).click();
  await preview
    .locator("dialog")
    .getByRole("button", { name: "Toast 띄우기" })
    .click();
  await expect(
    preview.locator("dialog").getByText("Toast!", { exact: true })
  ).toBeVisible();
  await page.getByLabel("예제 선택").selectOption("move-before-problem");
  const problem = page.locator('[data-project="move-before-problem"]');
  await expect(problem).toHaveAttribute("data-phase", "ready");
  await expect(page.locator(".reploom iframe")).toHaveCount(1);
  await problem
    .frameLocator("iframe")
    .getByRole("button", { name: "Modal 열기" })
    .click();
  await expect(
    problem.frameLocator("iframe").locator("dialog")
  ).toHaveAttribute("open", "");
});

test("the packaged adapters preserve React and DOM state and execute computations", async ({
  page,
}) => {
  const { article, preview } = await gallery(page, "react-counter");
  await preview.getByRole("button").click({ clickCount: 2 });
  await preview.getByRole("textbox").fill("Retained input");
  const reference = await preview.locator("output").textContent();
  const source = await readFile(
    new URL(
      "../../src/playground/examples/react-counter/Dashboard.tsx",
      import.meta.url
    ),
    "utf8"
  );
  await edit(
    article,
    "/src/Dashboard.tsx",
    source.replace("{settings.title}", "Updated {settings.title}")
  );
  await expect(preview.locator("h1")).toContainText("Updated");
  await expect(preview.getByRole("button")).toHaveText("count 2");
  await expect(preview.getByRole("textbox")).toHaveValue("Retained input");
  await expect(preview.locator("output")).toHaveText(reference!);
  await page.getByLabel("예제 선택").selectOption("dom-counter");
  const dom = page.locator('[data-project="dom-counter"]');
  await expect(dom).toHaveAttribute("data-phase", "ready");
  const domPreview = dom.frameLocator("iframe");
  await domPreview.getByRole("button").click({ clickCount: 2 });
  await domPreview.getByRole("textbox").fill("DOM input");
  await edit(
    dom,
    "/format.ts",
    "export const formatCount = (count: number) => `Updated DOM ${count}`;"
  );
  await expect(domPreview.getByRole("button")).toHaveText("Updated DOM 2");
  await expect(domPreview.getByRole("textbox")).toHaveValue("DOM input");
  await domPreview.getByRole("button").click();
  await expect(domPreview.getByRole("button")).toHaveText("Updated DOM 3");
  await page.getByLabel("예제 선택").selectOption("compute-primes");
  const compute = page.locator('[data-project="compute-primes"]');
  await expect(compute).toHaveAttribute("data-phase", "ready");
  await expect(compute.frameLocator("iframe").locator("body")).toContainText(
    '"documentAvailable": false'
  );
  await edit(compute, "/settings.json", '{"limit":10000}');
  await expect(compute.frameLocator("iframe").locator("body")).toContainText(
    '"runs": 2'
  );
  await expect(page.locator(".reploom iframe")).toHaveCount(1);
});

test("a narrow example opens at its declared panel and file with the view switch first", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { article } = await gallery(page, "compute-primes");
  await expect(
    article.getByRole("tab", { name: "/primes.ts" })
  ).toHaveAttribute("aria-selected", "true");
  const groups = article.locator(".reploom-view-controls:visible");
  await expect(groups).toHaveCount(1);
  const toolbar = await groups.boundingBox(),
    panes = await article.locator(".reploom-panes").boundingBox();
  expect(toolbar!.y + toolbar!.height).toBeLessThanOrEqual(panes!.y + 1);
  await page.getByLabel("예제 선택").selectOption("move-before-solution");
  const modal = page.locator('[data-project="move-before-solution"]');
  await expect(modal).toHaveAttribute("data-view", "preview");
  await modal
    .locator(".reploom-view-controls:visible")
    .getByRole("button", { name: "코드", exact: true })
    .click();
  await expect(modal.locator(".reploom-source-preview")).toBeVisible();
  await expect(modal.locator(".cm-content")).toHaveCount(0);
});
