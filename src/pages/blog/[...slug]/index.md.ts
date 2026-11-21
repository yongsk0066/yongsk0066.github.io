import type { APIRoute } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import { mediaDigest } from "@lib/post-media.mjs";
import { postMarkdown } from "@lib/markdown";
import { postPath } from "@lib/seo";

export async function getStaticPaths() {
  const posts = await getCollection("blog", ({ data }) => !data.draft);
  return posts.map((post) => ({ params: { slug: post.id }, props: { post }, cacheKey: (post.digest ?? post.body) + mediaDigest(post.id) }));
}

export const GET: APIRoute = async ({ props, site }) => {
  const post = props.post as CollectionEntry<"blog">;
  const sourceUrl = new URL(postPath(post.id), site).href;
  return new Response(
    await postMarkdown(post.body || "", post.data, sourceUrl, post.id),
    {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "X-Robots-Tag": "noindex",
      },
    }
  );
};
