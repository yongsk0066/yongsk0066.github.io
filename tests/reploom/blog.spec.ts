import { test, expect, type Locator, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

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

async function edit(article: Locator, path: string, source: string) {
  await article.locator(".reploom-file-picker select").selectOption(path);
  await writeCode(article.locator(".cm-content"), source);
}

async function gallery(page: Page, id: string) {
  await page.goto("/design/playground/");
  await page.getByLabel("예제 선택").selectOption(id);
  const article = page.locator(`[data-project="${id}"]`);
  await expect(article).toHaveAttribute("data-phase", "ready");
  return { article, preview: article.frameLocator("iframe") };
}

test.beforeEach(async ({ context }) => {
  // Analytics and embeds on article pages are unrelated to executing examples.
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.origin === "http://127.0.0.1:4331" ||
      ["blob:", "data:"].includes(url.protocol)
      ? route.continue()
      : route.abort();
  });
});

test("prepared assets use protocol 9 and remain on the blog origin", async ({
  request,
}) => {
  const response = await request.get("/reploom/manifest.json");
  expect(response.ok()).toBe(true);
  expect(response.headers()["cache-control"]).toBe("no-cache");
  const manifest = await response.json();
  expect(manifest.protocol).toBe(9);
  expect(Object.keys(manifest.projects)).toHaveLength(14);
  const assets = [manifest.bootstrap, manifest.compilerWorker, manifest.wasm];
  for (const project of Object.values(manifest.projects) as any[])
    assets.push(
      project.sources,
      project.program,
      ...project.vendor,
      ...(project.worker ?? [])
    );
  for (const asset of assets) expect(asset.url).toMatch(/^\/reploom\/[\w.-]+$/);
});

test("the gallery waits for hydration before accepting a selection", async ({
  page,
}) => {
  let resume!: () => void;
  const waiting = new Promise<void>((resolve) => {
    resume = resolve;
  });
  await page.route("**/_astro/Gallery.*.js", async (route) => {
    await waiting;
    await route.continue();
  });
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

for (const locale of ["ko", "en", "ja"]) {
  test(`${locale} article: local preview, deferred compiler, live editing and error recovery`, async ({
    page,
  }, info) => {
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.goto(
      `/blog/${locale === "ko" ? "" : `${locale}/`}useeffectevent/`
    );
    for (const index of [1, 2, 3]) {
      // Each article example hydrates only after entering the viewport.
      const wrapper = page.locator(".article-playground").nth(index - 1);
      await wrapper.scrollIntoViewIfNeeded();
      await expect(
        page.locator(`[data-project="effect-event-${locale}-${index}"]`)
      ).toHaveAttribute("data-phase", "ready");
    }
    expect(
      requests.filter((url) => /compiler-worker|\.wasm(?:$|\?)/.test(url))
    ).toEqual([]);
    const article = page.locator(`[data-project="effect-event-${locale}-3"]`);
    const preview = article.frameLocator("iframe");
    await expect(article.locator(".cm-line span").first()).toBeVisible();
    await preview.locator("input[type=checkbox]").check();
    await preview.locator("select").selectOption("travel");
    await expect(preview.locator("h1")).toContainText("travel");
    const directory =
      locale === "ko" ? "useEffectEvent" : `useEffectEvent_${locale}`;
    const original = await readFile(
      new URL(
        `../../src/content/blog/_examples/${directory}/example3/App.jsx`,
        import.meta.url
      ),
      "utf8"
    );
    const changed = original.replace("</h1>", " · verified</h1>");
    const started = Date.now();
    await edit(article, "/App.jsx", changed);
    await expect(preview.locator("h1")).toContainText("verified");
    await expect(preview.locator("select")).toHaveValue("travel");
    await expect(preview.locator("input[type=checkbox]")).toBeChecked();
    await edit(article, "/App.jsx", changed + "\nconst = ;");
    await expect(article).toHaveAttribute("data-phase", "error");
    await expect(preview.locator("h1")).toContainText("verified");
    await edit(article, "/App.jsx", changed.replace("verified", "recovered"));
    await expect(preview.locator("h1")).toContainText("recovered");
    await expect(preview.locator("select")).toHaveValue("travel");
    await expect(preview.locator("input[type=checkbox]")).toBeChecked();

    for (const index of [1, 2]) {
      const sibling = page.locator(
        `[data-project="effect-event-${locale}-${index}"]`
      );
      const frame = sibling.frameLocator("iframe");
      await sibling.locator("iframe").scrollIntoViewIfNeeded();
      await frame.locator("input[type=checkbox]").check();
      await frame.locator("select").selectOption("travel");
      const code = await readFile(
        new URL(
          `../../src/content/blog/_examples/${directory}/example${index}/App.jsx`,
          import.meta.url
        ),
        "utf8"
      );
      await edit(sibling, "/App.jsx", code.replace("</h1>", " · shared</h1>"));
      await expect(frame.locator("h1")).toContainText("shared");
      await expect(frame.locator("select")).toHaveValue("travel");
      await expect(frame.locator("input[type=checkbox]")).toBeChecked();
    }
    expect(
      requests.filter((url) => url.includes("/reploom/compiler-worker."))
    ).toHaveLength(1);
    expect(
      requests.filter((url) =>
        /(?:sandpack|codesandbox|unpkg|esm\.sh|jsdelivr)/i.test(url)
      )
    ).toEqual([]);
    await info.attach("article-edit", {
      body: JSON.stringify({
        locale,
        editAndRecoveryMs: Date.now() - started,
        compilerRequests: 1,
      }),
      contentType: "application/json",
    });
  });
}

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

test("the article component fits a mobile viewport", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { article } = await gallery(page, "effect-event-ko-3");
  await expect(article.locator(".cm-line span").first()).toBeVisible();
  await article.locator("iframe").scrollIntoViewIfNeeded();
  await expect(article.frameLocator("iframe").locator("h1")).toContainText(
    "general"
  );
  expect(
    await article.evaluate(
      (element) => element.scrollWidth <= element.clientWidth + 1
    )
  ).toBe(true);
  await page.screenshot({
    path: `test-results/reploom-${info.project.name}-mobile.png`,
    fullPage: true,
  });
});
