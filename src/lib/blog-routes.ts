import { createHash } from "node:crypto";
import type { CollectionEntry } from "astro:content";
import { DEFAULT_LOCALE, OTHER_LOCALES } from "../consts.ts";

import { postLocale } from "./seo.ts";
import { mediaDigest } from "./post-media.mjs";

type Post = CollectionEntry<"blog">;
type Link = { slug: string; title: string };
type PreviewKeys = Map<string, unknown[] | null>;

function link(post?: Post): Link | undefined {
  return post && { slug: post.id, title: post.data.title };
}

export function blogPostPaths(entries: Post[], previews: PreviewKeys) {
  const ids = new Set(entries.map((post) => post.id));
  const locales = [DEFAULT_LOCALE, ...OTHER_LOCALES];
  const paths = [];
  for (const locale of locales) {
    const group = entries.filter((post) =>
      postLocale(post.id) === locale
    );
    const series = new Map<string, Link[]>();
    for (const post of group.toSorted((a, b) => +a.data.date - +b.data.date)) {
      if (!post.data.series) continue;
      const members = series.get(post.data.series) || [];
      members.push(link(post)!);
      series.set(post.data.series, members);
    }
    const ordered = group.toSorted((a, b) => +b.data.date - +a.data.date);
    for (const [index, post] of ordered.entries()) {
      const base = locale === DEFAULT_LOCALE ? post.id : post.id.slice(locale.length + 1);
      const availableLocales = [locale, ...locales.filter((other) =>
        other !== locale && ids.has(other === DEFAULT_LOCALE ? base : other + "/" + base)
      )];
      const translationSlug = locale === DEFAULT_LOCALE ? "en/" + base : base;
      const navigation = {
        currentLocale: locale, availableLocales, translationSlug,
        hasTranslation: ids.has(translationSlug),
        prevPost: link(ordered[index + 1]), nextPost: link(ordered[index - 1]),
        seriesPosts: series.get(post.data.series || "") || [],
      };
      const cards = previews.get(post.id);
      const cacheKey = cards === null ? undefined : createHash("sha256")
        .update(JSON.stringify([post.digest ?? [post.body, post.data], navigation, cards, mediaDigest(post.id)]))
        .digest("hex");
      paths.push({ params: { slug: post.id }, props: { post, ...navigation }, cacheKey });
    }
  }
  return paths;
}
