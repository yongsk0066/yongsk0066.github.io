import { defaultLabels } from "@yongsk0066/reploom-ui/react";
import { labels as ko } from "@yongsk0066/reploom-ui/locales/ko";
import { labels as ja } from "@yongsk0066/reploom-ui/locales/ja";

export const labels = { ko, en: defaultLabels, ja };
export type Locale = keyof typeof labels;
export const javascript = {
  ko: "JavaScript를 켜면 예제를 실행하고 편집할 수 있습니다.",
  en: "Enable JavaScript to run and edit this example.",
  ja: "JavaScriptを有効にするとサンプルを実行・編集できます。",
};
