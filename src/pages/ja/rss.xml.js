import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
	const posts = await getCollection("blog", ({ id }) => {
    return id.startsWith("ja/");
  })

	posts.sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());

	return rss({
		title: "ヨンソクのブログ",
		description: "開発、技術、そして日常のブログです。",
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
			link: `/blog/${post.id}/`,
			customData: post.data.heroImage
				? `<media:content url="${new URL(post.data.heroImage, context.site).href}" medium="image" />`
				: ''
			})
		}),
		customData: `
			<atom:link href="${context.site}ja/rss.xml" rel="self" type="application/rss+xml" />
			<language>ja</language>
			<copyright>Copyright ${new Date().getFullYear()} Yongseok Jang</copyright>
			<image>
				<url>${new URL('/favicon.svg', context.site)}</url>
				<title>ヨンソクのブログ</title>
				<link>${context.site}</link>
			</image>
		`
	});
}
