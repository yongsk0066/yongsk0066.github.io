import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  // Type-check frontmatter using a schema
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // Transform string to Date object
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    categories: z.array(z.string()).optional(),
  }),
});

const question = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    isSolved: z.boolean(),
    pubDate: z.coerce.date(),
    solvedDate: z.coerce.date().optional(),
    categories: z.array(z.string()).optional(),
  }),
});

export const collections = { blog, question };
