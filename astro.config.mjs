import mdx from "@astrojs/mdx";
import { unified } from "@astrojs/markdown-remark";
import { defineConfig } from 'astro/config';
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import mermaid from "./plugin/remark-mermaid";
import articleHeadings from "./plugin/remark-article-headings/index.js";
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import react from "@astrojs/react";
import customTheme from './shiki/github-dark-default.json'

// https://astro.build/config
export default defineConfig({
  experimental: {
    incrementalBuild: true,
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport'
  },
  i18n: {
    defaultLocale: 'ko',
    locales: ['ko', 'en', 'ja'],
    fallback: {
      'en': 'ko',
      'ja': 'ko'
    },
    routing: {
      prefixDefaultLocale: false
    }
  },
  integrations: [
    mdx({ optimize: true }),
    // /design 은 내부용 디자인 레퍼런스 — 사이트맵에서 제외 (페이지 자체는 noindex)
    // i18n fallback이 만드는 /en/design, /ja/design 변형까지 함께 제외
    sitemap({ filter: (page) => {
      const path = new URL(page).pathname;
      // Non-blog locale pages currently redirect to Korean fallback pages.
      return !/\/design\/?$|\/404(?:\/|\.html)?$|\/index\.md$/.test(path)
        && !/^\/(?:en|ja)(?:\/(?:about|unknown))?\/?$/.test(path);
    } }),
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
  image:{
    domains: ["static.yongseok.me"]
  },
  site: 'https://yongseok.me',
  base: '/',
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['toastify-js'],
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
  },
});
