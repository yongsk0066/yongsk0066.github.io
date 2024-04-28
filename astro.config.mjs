import lit from "@astrojs/lit";
import mdx from "@astrojs/mdx";
import { defineConfig } from 'astro/config';
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeMathjax from "rehype-mathjax";
import mermaid from "./plugin/remark-mermaid";
import sitemap from '@astrojs/sitemap';
import tailwind from "@astrojs/tailwind";

import react from "@astrojs/react";
import customTheme from './shiki/github-dark-default.json'

// https://astro.build/config
export default defineConfig({
  i18n: {
    defaultLocale: 'ko',
    locales: ['ko', 'en']
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
  }), tailwind(), sitemap(), react()],
  markdown:{
    shikiConfig: {
      theme: customTheme,
    },
  },
  site: 'https://yongsk0066.github.io',
  base: '/'
});