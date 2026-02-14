import { getCollection } from "astro:content";

export async function GET() {
	const posts = (await getCollection("blog")).filter(
		(post) => !post.data.draft
	);

	posts.sort(
		(a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
	);

	const index = posts.map((post) => ({
		slug: post.slug,
		title: post.data.title,
		description: post.data.description ?? "",
		date: post.data.date.toISOString(),
		categories: post.data.categories ?? [],
		locale: post.slug.startsWith("en/") ? "en" : "ko",
		url: `/blog/${post.slug}/`,
	}));

	return new Response(JSON.stringify(index), {
		headers: { "Content-Type": "application/json" },
	});
}
