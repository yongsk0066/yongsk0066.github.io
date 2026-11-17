import { useEffect, useState } from "react";
import { Playground as Reploom } from "@yongsk0066/reploom-ui/react";
import type { BrowserPlatform } from "@yongsk0066/reploom/browser";
import { acquirePlatform } from "./platform";
import { labels, type Locale } from "./labels";
import "@yongsk0066/reploom-ui/styles.css";
import "./styles.css";

export type PlaygroundProps = { project: string; title: string; locale?: Locale };

export default function Playground({ project, title, locale = "ko" }: PlaygroundProps) {
  const [platform, setPlatform] = useState<BrowserPlatform>();

  useEffect(() => {
    const lease = acquirePlatform(document);
    setPlatform(lease.platform);
    return lease.release;
  }, []);

  return (
    <div className="article-playground not-prose" lang={locale}>
      {platform ? (
        <Reploom project={project} title={title} platform={platform} labels={labels[locale]} />
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
