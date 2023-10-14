import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('post');

  return rss({
    title: 'YONGSEOK’s Blog',
    description: 'YONGSEOK’s Blog description',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      customData: post.data.customData,
      link: `/post/${post.slug}/`,
    })),
    customData: `<language>ko-KR</language>`,
  });
}