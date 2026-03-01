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
    "word.copy_markdown": "Markdown 복사",
    "word.copy_link": "링크 복사",
    "word.open_in_claude": "Claude에서 열기",
    "word.open_in_chatgpt": "ChatGPT에서 열기",
    "word.copied": "복사됨!",
    "word.back_to_top": "위로 올라가요",
    "word.prev_post": "이전 글",
    "word.next_post": "다음 글",
    "word.categories": "카테고리",
    "word.all": "전체",
    "locale.noTranslation": "번역이 준비되지 않았습니다",
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
    "word.copy_markdown": "Copy Markdown",
    "word.copy_link": "Copy Link",
    "word.open_in_claude": "Open in Claude",
    "word.open_in_chatgpt": "Open in ChatGPT",
    "word.copied": "Copied!",
    "word.back_to_top": "Back to top",
    "word.prev_post": "Previous",
    "word.next_post": "Next",
    "word.categories": "Categories",
    "word.all": "All",
    "locale.noTranslation": "Translation not available",
  },
  ja: {
    "page.title": "ヨンソクのブログ",

    "path.blog": "/blog/ja",
    "path.about": "/about",
    "path.unknown": "/unknown",

    "page.back": "戻る",
    "word.series": "シリーズ",
    "word.share": "共有",
    "word.rss_subscribe": "RSS",
    "word.copy_markdown": "Markdownをコピー",
    "word.copy_link": "リンクをコピー",
    "word.open_in_claude": "Claudeで開く",
    "word.open_in_chatgpt": "ChatGPTで開く",
    "word.copied": "コピーしました！",
    "word.back_to_top": "トップへ",
    "word.prev_post": "前の記事",
    "word.next_post": "次の記事",
    "word.categories": "カテゴリ",
    "word.all": "すべて",
    "locale.noTranslation": "翻訳がありません",
  },
} as const;

const defaultLang = DEFAULT_LOCALE;

export function useTranslations(lang: keyof typeof ui) {
  return function t(key: keyof (typeof ui)[typeof defaultLang]) {
    return ui[lang][key] || ui[defaultLang][key];
  };
}
