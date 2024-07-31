import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  // Type-check frontmatter using a schema
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
  type: "content",
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
