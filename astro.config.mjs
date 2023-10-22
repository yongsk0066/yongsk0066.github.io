import lit from "@astrojs/lit";
import mdx from "@astrojs/mdx";
import { defineConfig } from 'astro/config';
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeMathjax from "rehype-mathjax";
import mermaid from "./plugin/remark-mermaid";

import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  integrations: [lit(), mdx({
    optimize: true,
    remarkPlugins: [remarkMath, mermaid],
    rehypePlugins: [() => rehypeKatex({
      output: "mathml",
      strict: false
    })
    // rehypeMathjax
    ]
  }), tailwind()],
  site: 'https://yongsk0066.github.io',
  base: '/'
});