import lit from "@astrojs/lit";
import mdx from "@astrojs/mdx";
import { defineConfig } from 'astro/config';
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeMathjax from "rehype-mathjax";
import mermaid from "./plugin/remark-mermaid";
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
    locales: ['ko', 'en'],
    fallback: {
      'en': 'ko'
    },
    routing: {
      prefixDefaultLocale: false
    }
  },
  integrations: [lit(), mdx({
    optimize: true,
    remarkPlugins: [remarkMath],
    rehypePlugins: [() => rehypeKatex({
      output: "mathml",
      strict: false
    }),
    // rehypeMathjax
    ]
  }), sitemap(), react()],
  markdown:{
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
  },
});