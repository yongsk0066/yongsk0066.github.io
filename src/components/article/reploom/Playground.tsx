import { useEffect, useState } from "react";
import {
  Playground as Reploom,
  PreparedSourceView,
  type PreparedSource,
  type PlaygroundView,
} from "@yongsk0066/reploom-ui/react";
import type { BrowserPlatform } from "@yongsk0066/reploom/browser";
import { acquirePlatform } from "./platform";
import { labels, type Locale } from "./labels";
import { presentationFor } from "./presentation";
import "@yongsk0066/reploom-ui/reader.css";
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

  return (
    <div className="article-playground not-prose" lang={locale}>
      {platform ? (
        <Reploom
          project={project}
          title={title}
          platform={platform}
          labels={labels[locale]}
          showTitle={false}
          showTools={tools}
          editorActivation="interaction"
          defaultView={defaultView ?? presentation.view}
          defaultFile={defaultFile ?? presentation.file}
          preparedSource={preparedSource}
        />
      ) : (
        <section className="reploom reploom-loading" aria-label={title}>
          {preparedSource &&
            (defaultView ?? presentation.view) !== "preview" && (
              <PreparedSourceView source={preparedSource} />
            )}
          <p role="status">{labels[locale].loading}</p>
          <noscript>{labels[locale].javascript}</noscript>
        </section>
      )}
    </div>
  );
}
