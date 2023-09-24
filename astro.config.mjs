import { defineConfig } from 'astro/config';
import lit from "@astrojs/lit";

import mdx from "@astrojs/mdx";

// https://astro.build/config
export default defineConfig({
  integrations: [lit(), mdx()]
});