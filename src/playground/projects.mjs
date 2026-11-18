import { readFile } from "node:fs/promises";
import { defineProject } from "@yongsk0066/reploom";

const root = new URL("../../", import.meta.url);

async function files(directory, paths) {
  return Object.fromEntries(
    await Promise.all(
      Object.entries(paths).map(async ([virtual, source]) => [
        virtual,
        await readFile(new URL(`${directory}/${source}`, root), "utf8"),
      ]),
    ),
  );
}

const effectLocales = {
  ko: {
    directory: "useEffectEvent",
    titles: ["테마 변경과 재연결", "오래된 테마를 읽는 Effect", "useEffectEvent로 최신 테마 읽기"],
  },
  en: {
    directory: "useEffectEvent_en",
    titles: [
      "Reconnect on theme changes",
      "An Effect reading a stale theme",
      "Read the latest theme with useEffectEvent",
    ],
  },
  ja: {
    directory: "useEffectEvent_ja",
    titles: ["テーマ変更と再接続", "古いテーマを読むEffect", "useEffectEventで最新のテーマを読む"],
  },
};

const preferences = await files("src/playground/examples", {
  "/preferences.js": "chat-preferences.js",
});

const effectProjects = (
  await Promise.all(
    Object.entries(effectLocales).map(([locale, { directory, titles }]) =>
      Promise.all(
        titles.map(async (title, index) =>
          defineProject({
            id: `effect-event-${locale}-${index + 1}`,
            title,
            runtime: "react",
            entry: "/App.jsx",
            files: {
              ...(await files(`src/content/blog/_examples/${directory}/example${index + 1}`, {
                "/App.jsx": "App.jsx",
                "/chat.js": "chat.js",
                "/notifications.js": "notifications.js",
                "/styles.css": "styles.css",
              })),
              ...preferences,
            },
            styles: ["/styles.css"],
            dependencies: {
              "toastify-js": { version: "1.12.0" },
              "toastify-js/src/toastify.css": { version: "1.12.0", kind: "css" },
            },
          }),
        ),
      ),
    ),
  )
).flat();

const moveProjects = await Promise.all(
  ["problem", "solution"].map(async (kind) =>
    defineProject({
      id: `move-before-${kind}`,
      title: kind === "problem" ? "Modal에 가려지는 Toast" : "같은 Portal host로 Toast 이동",
      runtime: "react",
      entry: "/App.jsx",
      files: {
        ...(await files(`src/content/blog/_examples/moveBefore/${kind}`, {
          "/App.jsx": "App.jsx",
        })),
        "/styles.css":
          "body { font-family: system-ui, sans-serif; margin: 20px; } button { cursor: pointer; }",
      },
      styles: ["/styles.css"],
    }),
  ),
);

export const projects = [
  ...effectProjects,
  ...moveProjects,
  defineProject({
    id: "react-counter",
    title: "React · TypeScript와 추가 의존성",
    runtime: "react",
    entry: "/src/Dashboard.tsx",
    dependencies: { clsx: { version: "2.1.1" } },
    files: await files("src/playground/examples/react-counter", {
      "/src/Dashboard.tsx": "Dashboard.tsx",
      "/src/counter.ts": "counter.ts",
      "/src/settings.json": "settings.json",
      "/src/dashboard.css": "dashboard.css",
    }),
  }),
  defineProject({
    id: "dom-counter",
    title: "DOM · 프레임워크 없이 실행",
    runtime: "dom",
    entry: "/main.ts",
    files: await files("src/playground/examples/dom-counter", {
      "/main.ts": "main.ts",
      "/format.ts": "format.ts",
      "/theme.css": "theme.css",
    }),
  }),
  defineProject({
    id: "compute-primes",
    title: "계산 Worker · 소수 탐색",
    runtime: "compute",
    dependencies: { clsx: { version: "2.1.1" } },
    entry: "/main.ts",
    execution: { timeoutMs: 2000 },
    files: await files("src/playground/examples/compute-primes", {
      "/main.ts": "main.ts",
      "/primes.ts": "primes.ts",
      "/settings.json": "settings.json",
    }),
  }),
];

export const galleryProjects = projects
  .filter(({ id }) => !/^effect-event-(en|ja)-/.test(id))
  .map(({ id, title }) => ({ id, title }));
