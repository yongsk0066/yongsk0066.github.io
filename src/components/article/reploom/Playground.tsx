import { useEffect, useState } from "react";
import {
  Playground as Reploom,
  type PlaygroundView,
} from "@yongsk0066/reploom-ui/react";
import type { BrowserPlatform } from "@yongsk0066/reploom/browser";
import { acquirePlatform } from "./platform";
import { labels, type Locale } from "./labels";
import { presentationFor } from "./presentation";
import type { ProjectArchive } from "@yongsk0066/reploom";
import "./styles.css";

export type PlaygroundProps = {
  project: string;
  title: string;
  locale?: Locale;
  tools?: boolean;
  defaultView?: PlaygroundView;
  defaultFile?: string;
  initialArchive?: ProjectArchive;
};

export default function Playground({
  project,
  title,
  locale = "ko",
  tools = false,
  defaultView,
  defaultFile,
  initialArchive,
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
          initialArchive={initialArchive}
          shareTarget={`/design/playground/shared/?lang=${locale}`}
        />
      ) : (
        <section className="reploom reploom-loading" aria-label={title}>
          <p>{title}</p>
          <p role="status">{labels[locale].loading}</p>
          <noscript>{labels[locale].javascript}</noscript>
        </section>
      )}
    </div>
  );
}
