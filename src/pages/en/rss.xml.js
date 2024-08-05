import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE_EN } from '@consts';
import { getCollection } from 'astro:content';




export async function GET(context) {
	const posts = await getCollection("blog", ({ id }) => {
    return id.startsWith("en/");
  })

	return rss({
		title: SITE_TITLE_EN,
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

