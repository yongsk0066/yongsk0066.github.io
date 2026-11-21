import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { articleExample, edit } from "./helpers";

test.beforeEach(async ({ context, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  // Analytics and embeds on article pages are unrelated to executing examples.
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.origin === origin || ["blob:", "data:"].includes(url.protocol)
      ? route.continue()
      : route.abort();
  });
});

test("prepared assets use protocol 10 and remain on the blog origin", async ({
  request,
}) => {
  const response = await request.get("/reploom/manifest.json");
  expect(response.ok()).toBe(true);
  expect(response.headers()["cache-control"]).toBe("no-cache");
  const manifest = await response.json();
  expect(manifest.protocol).toBe(10);
  expect(Object.keys(manifest.projects)).toHaveLength(9);
  expect(
    Object.keys(manifest.projects).every((id) =>
      /^effect-event-(en|ko|ja)-[123]$/.test(id)
    )
  ).toBe(true);
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
      requests.filter((url) =>
        /compiler-(?:worker|client)|\.wasm(?:$|\?)/.test(url)
      )
    ).toEqual([]);
    expect(
      requests.filter((url) =>
        /\/reploom\/manifest\.json|\/(?:syntax|javascript|grammar)\.[^/]+\.js/.test(
          url
        )
      )
    ).toEqual([]);
    const article = page.locator(`[data-project="effect-event-${locale}-3"]`);
    const preview = article.frameLocator("iframe");
    await expect(article.locator(".reploom-source-preview")).toBeVisible();
    const reader = article.locator(".reploom-source-preview");
    await expect(preview.locator("html")).toHaveAttribute("lang", locale);
    await expect(
      article.getByRole("button", {
        name: { ko: "표시 설정", en: "Display settings", ja: "表示設定" }[
          locale
        ]!,
        exact: true,
      })
    ).toBeVisible();
    await expect(reader.locator("[data-emphasis]")).toHaveCount(6);
    const keyword = reader
      .locator(".tok-keyword")
      .filter({ hasText: /^import$/ })
      .first();
    const string = reader.locator(".tok-string").first();
    await reader.scrollIntoViewIfNeeded();
    await expect(keyword).toBeVisible();
    const color = (element: Element) => getComputedStyle(element).color;
    expect(await keyword.evaluate(color)).not.toBe(
      await reader.evaluate(color)
    );
    expect(await string.evaluate(color)).not.toBe(
      await keyword.evaluate(color)
    );
    await expect(page.locator(".cm-content")).toHaveCount(0);
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
    expect(await reader.textContent()).toBe(original);
    const changed = original.replace("</h1>", " · verified</h1>");
    const started = Date.now();
    await edit(article, "/App.jsx", changed);
    await expect(preview.locator("h1")).toContainText("verified");
    await expect(article.locator(".cm-content")).toHaveCSS("font-size", "12px");
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

test("the article component fits a mobile viewport", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const article = await articleExample(page, 3);
  await expect(article.locator(".reploom-editor")).toBeHidden();
  await article.getByRole("button", { name: "코드", exact: true }).click();
  await article.locator(".reploom-edit").click();
  await expect(article.locator(".cm-line span").first()).toBeVisible();
  await article.getByRole("button", { name: "미리보기", exact: true }).click();
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

test("article chrome stays isolated and the preview preserves authored spacing and toast placement", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/blog/useeffectevent/");
  const wrapper = page.locator(".article-playground").first();
  await wrapper.scrollIntoViewIfNeeded();
  const article = wrapper.locator('[data-project="effect-event-ko-1"]');
  await expect(article).toHaveAttribute("data-phase", "ready");
  await expect(page.locator(".site-header")).toHaveCSS("position", "fixed");
  await expect(article).toHaveCSS("position", "static");
  expect(
    await article.evaluate(
      (element) => element.getRootNode() instanceof ShadowRoot
    )
  ).toBe(true);
  const tabs = (await article.locator(".reploom-file-bar").boundingBox())!;
  const bar = (await article.locator(".reploom-preview-bar").boundingBox())!;
  const iframe = (await article.locator("iframe").boundingBox())!;
  expect(tabs.y).toBe(bar.y);
  expect(tabs.height).toBe(40);
  expect(iframe.y).toBe(bar.y + bar.height);
  expect(iframe.height).toBeCloseTo(360, 0);
  await expect(article.locator(".reploom-source-preview")).toHaveCSS(
    "font-size",
    "12px"
  );
  const physical = await article
    .locator("iframe")
    .evaluate((element) => element.clientWidth);
  expect(iframe.width / physical).toBeCloseTo(0.94, 2);
  await expect(
    article.getByRole("button", { name: "공유", exact: true })
  ).toHaveCount(0);
  const preview = article.frameLocator("iframe");
  await expect(preview.locator("body")).toHaveCSS("margin", "20px");
  await expect(preview.locator("body")).toHaveCSS("padding", "0px");
  await preview.locator("input[type=checkbox]").check();
  const toast = preview.locator(".toastify").first();
  await expect(toast).toBeVisible();
  await expect
    .poll(() =>
      toast.evaluate((element) =>
        Math.round(element.getBoundingClientRect().top)
      )
    )
    .toBe(15);
  expect(
    await toast.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return box.left >= 0 && box.right <= innerWidth;
    })
  ).toBe(true);
});

test("design references, the gallery and shared examples are local to the development server", async ({
  request,
}) => {
  for (const path of [
    "/design/",
    "/design/playground/",
    "/design/playground/shared/",
    "/en/design/",
    "/ja/design/playground/",
    "/design/assets/manifest.json",
  ]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
});

test("the initial article source is colored in HTML before hydration", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL,
  });
  try {
    const page = await context.newPage();
    await page.goto("/blog/useeffectevent/");
    const examples = page.locator(".article-playground");
    await expect(examples).toHaveCount(3);
    for (const example of await examples.all()) {
      const reader = example.locator(".reploom-source-preview");
      await expect(reader.locator(".tok-keyword").first()).toHaveText("import");
      const color = (element: Element) => getComputedStyle(element).color;
      expect(
        await reader.locator(".tok-keyword").first().evaluate(color)
      ).not.toEqual(await reader.evaluate(color));
    }
  } finally {
    await context.close();
  }
});

test("the first input reaches the project while CodeMirror is still downloading", async ({
  page,
}) => {
  const example = await articleExample(page, 1);
  const preview = example.frameLocator("iframe");
  await preview.locator("select").selectOption("travel");
  const reader = example.locator(".reploom-source-preview");
  const source = await reader.textContent();
  expect(source).toContain("</h1>");
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/editor[-.][^/]*\.js(?:\?|$)/, async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await example.locator(".reploom-edit").click();
    const input = example.locator(".reploom-code-editor textarea");
    await expect(input).toBeFocused();
    await input.fill(source!.replace("</h1>", " · first input</h1>"));
    await expect(preview.locator("h1")).toContainText("first input");
    await expect(preview.locator("select")).toHaveValue("travel");
  } finally {
    release();
  }
  const editor = example.locator(".cm-content");
  await editor.press("ControlOrMeta+a");
  const copied = await editor.evaluate((element) => {
    const event = new ClipboardEvent("copy", {
      clipboardData: new DataTransfer(),
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(event);
    return event.clipboardData?.getData("text/plain");
  });
  expect(copied).toBe(source!.replace("</h1>", " · first input</h1>"));
  await expect(preview.locator("select")).toHaveValue("travel");
});

for (const width of [320, 390, 1440]) {
  test.describe(`Viewport ${width}`, () => {
    test.use({ hasTouch: width < 560 });
    test(`the article reserves its first panel throughout hydration at ${width}px`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 844 });
      let resume!: () => void;
      const gate = new Promise<void>((resolve) => {
        resume = resolve;
      });
      await page.route(/\/_astro\/Playground\.[^/]+\.js/, async (route) => {
        await gate;
        await route.continue();
      });
      await page.goto("/blog/useeffectevent/", {
        waitUntil: "domcontentloaded",
      });
      const wrapper = page.locator(".article-playground").first();
      await wrapper.scrollIntoViewIfNeeded();
      const section = wrapper.locator("section[data-project]");
      let initial = 0;
      try {
        await expect(section).toHaveClass(/reploom-loading/);
        await expect(section.locator(".reploom-preview")).toBeVisible();
        if (width < 560)
          await expect(section.locator(".reploom-editor")).toBeHidden();
        initial = await wrapper.evaluate((el) => {
          const heights: number[] = [el.getBoundingClientRect().height];
          const observer = new ResizeObserver(() =>
            heights.push(el.getBoundingClientRect().height)
          );
          observer.observe(el);
          Object.assign(window, { embedHeights: heights });
          return heights[0];
        });
      } finally {
        resume();
      }
      await expect(section).toHaveAttribute("data-phase", "ready");
      await section.locator("iframe").waitFor();
      const heights = await wrapper.evaluate(async (el) => {
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve))
        );
        return [
          ...(window as Window & { embedHeights?: number[] }).embedHeights!,
          el.getBoundingClientRect().height,
        ];
      });
      await info.attach("embed-heights", {
        body: JSON.stringify({ width, initial, heights }),
        contentType: "application/json",
      });
      expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(
        1
      );
      await expect(
        section.frameLocator("iframe").locator("html")
      ).toHaveAttribute("lang", "ko");
    });
  });
}
