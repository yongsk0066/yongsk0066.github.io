import { DEFAULT_LOCALE } from "@consts";
import { getRelativeLocaleUrl } from "astro:i18n";

export const ui = {
  ko: {
    "page.title": "장용석 블로그",
    "path.blog": "/blog",
    "path.about": "/about",
    "path.unknown": "/unknown",
    "page.back": "돌아가기",
    "word.series": "시리즈",
    "word.share": "공유 하기",
    "word.rss_subscribe": "RSS 구독",
    "word.back_to_top": "위로 올라가요",
    "word.prev_post": "이전 글",
    "word.next_post": "다음 글",
  },
  en: {
    "page.title": "Yongseok's Blog",

    "path.blog": "/blog/en",
    "path.about": "/about/en",
    "path.unknown": "/unknown",

    "page.back": "Back",
    "word.series": "Series",
    "word.share": "Share",
    "word.rss_subscribe": "RSS",
    "word.back_to_top": "Back to top",
    "word.prev_post": "Previous",
    "word.next_post": "Next",
  },
} as const;

const defaultLang = DEFAULT_LOCALE;

export function useTranslations(lang: keyof typeof ui) {
  return function t(key: keyof (typeof ui)[typeof defaultLang]) {
    return ui[lang][key] || ui[defaultLang][key];
  };
}
