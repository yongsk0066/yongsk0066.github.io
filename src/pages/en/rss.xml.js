import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE_EN } from '@consts';
import { getCollection } from 'astro:content';

export async function GET(context) {
	const posts = await getCollection("blog", ({ id }) => {
    return id.startsWith("en/");
  })

	// 날짜 기준 내림차순 정렬 (최신 글이 먼저 표시)
	posts.sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());

	return rss({
		title: SITE_TITLE_EN,
		description: SITE_DESCRIPTION,
		site: context.site,
		xmlns: {
			atom: 'http://www.w3.org/2005/Atom',
			media: 'http://search.yahoo.com/mrss/'
		},
		stylesheet: '/pretty-feed-v3.xsl',
		items: posts.map((post) => {
			return ({
			...post.data,
			pubDate: post.data.date,
			link: `/blog/${post.slug}/`,
			customData: post.data.heroImage 
				? `<media:content url="${new URL(post.data.heroImage, context.site).href}" medium="image" />` 
				: ''
			})
		}),
		customData: `
			<atom:link href="${context.site}en/rss.xml" rel="self" type="application/rss+xml" />
			<language>en-us</language>
			<copyright>Copyright ${new Date().getFullYear()} Yongseok Jang</copyright>
			<image>
				<url>${new URL('/favicon.svg', context.site)}</url>
				<title>${SITE_TITLE_EN}</title>
				<link>${context.site}</link>
			</image>
		`
	});
}

