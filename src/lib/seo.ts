export const DEFAULT_SOCIAL_IMAGE = "/blog-placeholder-3.jpg";

export function postLocale(id: string): string {
  return /^(en|ja)\//.exec(id)?.[1] ?? "ko";
}

export function postPath(id: string): string {
  return `/blog/${id}/`;
}

export function localizedPostPath(baseId: string, locale: string): string {
  return postPath(locale === "ko" ? baseId : `${locale}/${baseId}`);
}

// JSON-LD is embedded as raw script text: prevent content from closing the tag.
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
