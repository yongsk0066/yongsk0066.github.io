import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE_DESCRIPTION, SITE_TITLE } from '@consts';




export async function GET(context) {
	const posts = await getCollection("blog", ({ id }) => {
    return id.startsWith("en/");
  })

	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: posts.map((post) => {
			return ({
			...post.data,
			pubDate: post.data.date,
			link: `/blog/${post.slug}/`,
			})
		})
	});
}

