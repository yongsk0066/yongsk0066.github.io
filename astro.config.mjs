import mdx from "@astrojs/mdx";
import { unified } from "@astrojs/markdown-remark";
import { defineConfig, fontProviders } from "astro/config";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import mermaid from "./plugin/remark-mermaid";
import articleHeadings from "./plugin/remark-article-headings/index.js";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

import react from "@astrojs/react";
import customTheme from "./shiki/github-dark-default.json";

// https://astro.build/config
export default defineConfig({
  experimental: {
    incrementalBuild: true,
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },
  i18n: {
    defaultLocale: "ko",
    locales: ["ko", "en", "ja"],
    fallback: {
      en: "ko",
      ja: "ko",
    },
    routing: {
      prefixDefaultLocale: false,
    },
  },
  // 폰트: Astro Fonts API. 파일은 src/assets/fonts/ 에 두고 빌드 시 /_astro/fonts/ 로 해시되어 나간다.
  // @font-face 와 preload 는 각 head 컴포넌트의 <Font /> 가 생성한다 (Head.astro, BaseHead.astro).
  // Noto Sans JP 만 예외: Google Fonts 의 124 조각 unicode-range 분할을 그대로 쓰기 위해 ja 페이지에서 <link> 로 로드한다.
  fonts: [
    {
      // 본문. body / ArticleProse / --font-serif 토큰이 var(--font-pretendard) 로 쓴다.
      // fallback 에 Noto Sans JP 를 넣어 ja 페이지의 가나·한자가 (Pretendard 에 없으므로) Noto Sans JP 로 가게 한다.
      // ※ Fonts API 는 패밀리명에 해시를 붙이므로 "Pretendard" 라는 이름으로는 웹폰트가 잡히지 않는다 — 반드시 변수로 참조.
      name: "Pretendard",
      cssVariable: "--font-pretendard",
      provider: fontProviders.local(),
      display: "swap",
      fallbacks: ["Noto Sans JP", "sans-serif"],
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/Pretendard-Thin.woff2"],
            weight: "100",
            style: "normal",
          },
          {
            src: ["./src/assets/fonts/Pretendard-ExtraLight.woff2"],
            weight: "200",
            style: "normal",
          },
          {
            src: ["./src/assets/fonts/Pretendard-Light.woff2"],
            weight: "300",
            style: "normal",
          },
          {
            src: ["./src/assets/fonts/Pretendard-Regular.woff2"],
            weight: "400",
            style: "normal",
          },
          {
            src: ["./src/assets/fonts/Pretendard-Medium.woff2"],
            weight: "500",
            style: "normal",
          },
          {
            src: ["./src/assets/fonts/Pretendard-SemiBold.woff2"],
            weight: "600",
            style: "normal",
          },
          {
            src: ["./src/assets/fonts/Pretendard-Bold.woff2"],
            weight: "700",
            style: "normal",
          },
          {
            src: ["./src/assets/fonts/Pretendard-ExtraBold.woff2"],
            weight: "800",
            style: "normal",
          },
          {
            src: ["./src/assets/fonts/Pretendard-Black.woff2"],
            weight: "900",
            style: "normal",
          },
        ],
      },
    },
    {
      // --font-sans 토큰. Google Fonts 의 가변 woff2 (wght 200–700, OFL) 를 latin / latin-ext 조각으로 셀프호스팅.
      name: "Oswald",
      cssVariable: "--font-oswald",
      provider: fontProviders.local(),
      display: "swap",
      fallbacks: ["ui-sans-serif", "system-ui", "sans-serif"],
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/Oswald-Variable-latin.woff2"],
            weight: "200 700",
            style: "normal",
            unicodeRange: [
              "U+0000-00FF",
              "U+0131",
              "U+0152-0153",
              "U+02BB-02BC",
              "U+02C6",
              "U+02DA",
              "U+02DC",
              "U+0304",
              "U+0308",
              "U+0329",
              "U+2000-206F",
              "U+20AC",
              "U+2122",
              "U+2191",
              "U+2193",
              "U+2212",
              "U+2215",
              "U+FEFF",
              "U+FFFD",
            ],
          },
          {
            src: ["./src/assets/fonts/Oswald-Variable-latin-ext.woff2"],
            weight: "200 700",
            style: "normal",
            unicodeRange: [
              "U+0100-02BA",
              "U+02BD-02C5",
              "U+02C7-02CC",
              "U+02CE-02D7",
              "U+02DD-02FF",
              "U+0304",
              "U+0308",
              "U+0329",
              "U+1D00-1DBF",
              "U+1E00-1E9F",
              "U+1EF2-1EFF",
              "U+2020",
              "U+20A0-20AB",
              "U+20AD-20C0",
              "U+2113",
              "U+2C60-2C7F",
              "U+A720-A7FF",
            ],
          },
        ],
      },
    },
    {
      // 코드 블록 폰트가 아니라 (code 는 Tailwind 기본 --font-mono), 헤더 시계·ASCII 화면·다이어그램 라벨이 이름으로 직접 쓴다.
      name: "JetBrains Mono",
      cssVariable: "--font-jetbrains-mono",
      provider: fontProviders.local(),
      display: "swap",
      fallbacks: ["ui-monospace", "monospace"],
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/JetBrainsMono-Regular.woff2"],
            weight: "400",
            style: "normal",
          },
          {
            src: ["./src/assets/fonts/JetBrainsMono-Medium.woff2"],
            weight: "500",
            style: "normal",
          },
          {
            src: ["./src/assets/fonts/JetBrainsMono-SemiBold.woff2"],
            weight: "600",
            style: "normal",
          },
          {
            src: ["./src/assets/fonts/JetBrainsMono-Bold.woff2"],
            weight: "700",
            style: "normal",
          },
        ],
      },
    },
    {
      // 디자인 예제와 기존 콘텐츠용 보조 서체 (Atkinson Hyperlegible).
      name: "Atkinson",
      cssVariable: "--font-atkinson",
      provider: fontProviders.local(),
      display: "swap",
      fallbacks: ["sans-serif"],
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/atkinson-regular.woff"],
            weight: "400",
            style: "normal",
          },
          {
            src: ["./src/assets/fonts/atkinson-bold.woff"],
            weight: "700",
            style: "normal",
          },
        ],
      },
    },
  ],
  integrations: [
    mdx({ optimize: true }),
    // /design 은 내부용 디자인 레퍼런스 — 사이트맵에서 제외 (페이지 자체는 noindex)
    // i18n fallback이 만드는 /en/design, /ja/design 변형까지 함께 제외
    sitemap({
      filter: (page) => {
        const path = new URL(page).pathname;
        // Non-blog locale pages currently redirect to Korean fallback pages.
        return (
          !/\/design\/?$|\/404(?:\/|\.html)?$|\/index\.md$/.test(path) &&
          !/^\/(?:en|ja)(?:\/(?:about|unknown))?\/?$/.test(path)
        );
      },
    }),
    react(),
  ],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath, mermaid, articleHeadings],
      rehypePlugins: [[rehypeKatex, { strict: false }]],
    }),
    shikiConfig: {
      theme: customTheme,
    },
  },
  image: {
    domains: ["static.yongseok.me"],
  },
  site: "https://yongseok.me",
  base: "/",
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ["toastify-js"],
    },
    resolve: {
      dedupe: ["react", "react-dom"],
    },
  },
});
