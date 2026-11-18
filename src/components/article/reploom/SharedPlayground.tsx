import { useEffect, useState } from "react";
import {
  decodeProjectFragment,
  type SharedProject,
} from "@yongsk0066/reploom/share";
import Playground from "./Playground";
import type { Locale } from "./labels";

const text = {
  ko: {
    loading: "공유 예제를 여는 중…",
    invalid: "공유 예제를 열 수 없습니다. 링크 전체를 복사했는지 확인하세요.",
    gallery: "예제 목록",
  },
  en: {
    loading: "Opening shared example…",
    invalid:
      "Could not open this example. Check that you copied the entire link.",
    gallery: "Browse examples",
  },
  ja: {
    loading: "共有サンプルを開いています…",
    invalid:
      "サンプルを開けませんでした。リンク全体をコピーしたか確認してください。",
    gallery: "サンプル一覧",
  },
};

type Opened = { shared: SharedProject; title: string; hash: string };

export default function SharedPlayground({
  projects,
}: {
  projects: Record<string, string>;
}) {
  const [opened, setOpened] = useState<Opened>();
  const [failed, setFailed] = useState(false);
  const [locale, setLocale] = useState<Locale>("ko");
  useEffect(() => {
    const lang = new URL(location.href).searchParams.get("lang");
    const locale = lang === "en" || lang === "ja" ? lang : "ko";
    setLocale(locale);
    document.documentElement.lang = locale;
    let pending: AbortController | undefined;
    async function open() {
      pending?.abort();
      const controller = (pending = new AbortController());
      const hash = location.hash;
      setOpened(undefined);
      setFailed(false);
      try {
        const shared = await decodeProjectFragment(hash, controller.signal);
        if (!Object.hasOwn(projects, shared.archive.project))
          throw new Error("Unknown project");
        const title = projects[shared.archive.project];
        if (!controller.signal.aborted) {
          document.title = title;
          setOpened({ shared, title, hash });
        }
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    }
    void open();
    window.addEventListener("hashchange", open);
    return () => {
      pending?.abort();
      window.removeEventListener("hashchange", open);
    };
  }, [projects]);
  return (
    <>
      <a href="/design/playground/">{text[locale].gallery}</a>
      {opened ? (
        <>
          <h1>{opened.title}</h1>
          <Playground
            key={opened.hash}
            project={opened.shared.archive.project}
            title={opened.title}
            defaultView={opened.shared.view}
            initialArchive={opened.shared.archive}
            locale={locale}
            tools
          />
        </>
      ) : (
        <p role="status">
          {failed ? text[locale].invalid : text[locale].loading}
        </p>
      )}
    </>
  );
}
