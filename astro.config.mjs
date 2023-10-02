import lit from "@astrojs/lit";
import mdx from "@astrojs/mdx";
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  integrations: [lit(), mdx()],
  site: 'https://yongsk0066.github.io',
  base: '/',
});