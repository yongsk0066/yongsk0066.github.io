import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    heroImage: z.string().optional(),
    categories: z.array(z.string()).optional(),
    draft: z.boolean().optional(),
    series: z.string().optional(),
  }),
});

const question = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/question" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    isSolved: z.boolean(),
    date: z.coerce.date(),
    solvedDate: z.coerce.date().optional(),
    categories: z.array(z.string()).optional(),
  }),
});

export const collections = { blog, question };
