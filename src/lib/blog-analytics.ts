export const BLOG_EVENTS = [
  "article_read",
  "related_article_click",
  "rss_subscribe_click",
  "rss_feed_copy",
  "rss_feed_open",
] as const;

/** Count focused reading time, excluding background/idle time and suspended timers. */
export function createReadingSession() {
  let previousTime: number | undefined;
  let previouslyActive = false;
  let activeMs = 0;
  let reported = false;

  return (now: number, active: boolean, progress: number) => {
    const elapsed = previousTime === undefined ? 0 : now - previousTime;
    if (active && previouslyActive && elapsed > 0 && elapsed <= 1500) {
      activeMs += elapsed;
    }
    previousTime = now;
    previouslyActive = active;
    if (!reported && active && activeMs >= 30_000 && progress >= 0.9) {
      reported = true;
      return Math.floor(activeMs / 1000);
    }
    return null;
  };
}

export function isArticlePath(path: string) {
  return /^\/blog\/(?!(?:en|ja)\/?$)(?:(?:en|ja)\/)?[^/]+\/?$/.test(path);
}

type AnalyticsWindow = Window & { dataLayer?: unknown[] };

export function installBlogAnalytics(win: AnalyticsWindow, doc: Document) {
  const article = doc.querySelector<HTMLElement>("#post-content");
  const subscription = /^\/(?:en\/|ja\/)?subscribe\/?$/.test(win.location.pathname);
  if ((!article || !isArticlePath(win.location.pathname)) && !subscription) return;

  const send = (event: (typeof BLOG_EVENTS)[number], linkPath: string | null = null, seconds: number | null = null) => {
    win.dataLayer ??= [];
    win.dataLayer.push({
      event,
      blog_article_path: article ? win.location.pathname : null,
      blog_content_language: doc.documentElement.lang,
      // Never send URL query strings, fragments, link text, or user input.
      blog_link_path: linkPath,
      blog_read_seconds: seconds,
    });
  };

  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest<HTMLAnchorElement>("a[href]");
    if (!link || !link.closest("main")) return;
    const url = new URL(link.href, win.location.href);
    if (url.origin !== win.location.origin) return;
    const path = url.pathname;
    if (/^\/(?:en\/|ja\/)?subscribe\/?$/.test(path)) {
      send("rss_subscribe_click", path);
    } else if (/^\/(?:en\/|ja\/)?rss\.xml$/.test(path)) {
      send("rss_feed_open", path);
    } else if (article && isArticlePath(path) && path.replace(/\/$/, "") !== win.location.pathname.replace(/\/$/, "")) {
      send("related_article_click", path);
    }
  };
  const onFeedCopy = (event: Event) => {
    const path = (event as CustomEvent<string>).detail;
    if (subscription && /^\/(?:en\/|ja\/)?rss\.xml$/.test(path)) send("rss_feed_copy", path);
  };
  doc.addEventListener("click", onClick, { capture: true });
  doc.addEventListener("blog:feed-copy", onFeedCopy);

  let timer: number | undefined;
  const removers: (() => void)[] = [];
  if (article) {
    const observe = createReadingSession();
    let lastActivity = win.performance.now();
    const activity = () => { lastActivity = win.performance.now(); };
    const sample = () => {
      const now = win.performance.now();
      const rect = article.getBoundingClientRect();
      const progress = rect.height > 0 ? (win.innerHeight - rect.top) / rect.height : 0;
      const active = doc.visibilityState === "visible" && doc.hasFocus() && now - lastActivity < 60_000;
      const seconds = observe(now, active, progress);
      if (seconds !== null) {
        send("article_read", null, seconds);
        win.clearInterval(timer);
      }
    };
    for (const name of ["pointerdown", "pointermove", "keydown", "scroll", "focus"] as const) {
      win.addEventListener(name, activity, { passive: true });
      removers.push(() => win.removeEventListener(name, activity));
    }
    doc.addEventListener("visibilitychange", sample);
    removers.push(() => doc.removeEventListener("visibilitychange", sample));
    sample();
    timer = win.setInterval(sample, 1000);
  }

  return () => {
    if (timer !== undefined) win.clearInterval(timer);
    doc.removeEventListener("click", onClick, true);
    doc.removeEventListener("blog:feed-copy", onFeedCopy);
    removers.forEach((remove) => remove());
  };
}
