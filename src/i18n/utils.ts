import { DEFAULT_LOCALE } from "@consts";
import { ui } from "./ui";
import { getRelativeLocaleUrl } from "astro:i18n";

const defaultLang = DEFAULT_LOCALE;

export function useTranslations(lang: keyof typeof ui) {
  return function t(key: keyof (typeof ui)[typeof defaultLang]) {
    return ui[lang][key] || ui[defaultLang][key];
  };
}
