import rss from '@astrojs/rss';


export async function GET(context) {
  return rss({
    title: 'YONGSEOK’s Blog',
    description: 'YONGSEOK’s Blog description',
    site: context.site,
    items: [],
    customData: `<language>ko-KR</language>`,
  });
}