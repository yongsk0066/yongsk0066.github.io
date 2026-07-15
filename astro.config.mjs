import mdx from "@astrojs/mdx";
import { defineConfig } from 'astro/config';
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import mermaid from "./plugin/remark-mermaid";
import markdownExport from "./plugin/markdown-export";
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import react from "@astrojs/react";
import customTheme from './shiki/github-dark-default.json'

// https://astro.build/config
export default defineConfig({
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
    sitemap({ filter: (page) => new URL(page).pathname.replace(/\/$/, "") !== "/design" }),
    react(),
    markdownExport(),
  ],
  markdown:{
    remarkPlugins: [remarkMath],
    rehypePlugins: [() => rehypeKatex({
      output: "mathml",
      strict: false
    })],
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