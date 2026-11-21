import { useEffect, useState } from "react";
import {
  Playground as Reploom,
  PlaygroundPlaceholder,
  type PreparedSource,
  type PlaygroundView,
} from "@yongsk0066/reploom-ui/react";
import type { BrowserPlatform } from "@yongsk0066/reploom/browser";
import { acquirePlatform } from "./platform";
import { labels, javascript, type Locale } from "./labels";
import { presentationFor } from "./presentation";
import "@yongsk0066/reploom-ui/styles.css";
import "./styles.css";

export type PlaygroundProps = {
  project: string;
  title: string;
  locale?: Locale;
  tools?: boolean;
  defaultView?: PlaygroundView;
  defaultFile?: string;
  preparedSource?: PreparedSource;
};

export default function Playground({
  project,
  title,
  locale = "ko",
  tools = false,
  defaultView,
  defaultFile,
  preparedSource,
}: PlaygroundProps) {
  const presentation = presentationFor(project);
  const [platform, setPlatform] = useState<BrowserPlatform>();

  useEffect(() => {
    const lease = acquirePlatform(document);
    setPlatform(lease.platform);
    return lease.release;
  }, []);

  const layout = {
    project,
    title,
    locale,
    labels: labels[locale],
    showTitle: false,
    showTools: tools,
    defaultView: defaultView ?? presentation.view,
    mobileView: presentation.mobile,
    preparedSource,
    highlightLines: presentation.highlight,
    theme: "light" as const,
  };
  return (
    <div className="article-playground not-prose" lang={locale}>
      {platform ? (
        <Reploom
          {...layout}
          platform={platform}
          editorActivation="interaction"
          defaultFile={defaultFile ?? presentation.file}
        />
      ) : (
        <>
          <PlaygroundPlaceholder {...layout} />
          <noscript>{javascript[locale]}</noscript>
        </>
      )}
    </div>
  );
}
