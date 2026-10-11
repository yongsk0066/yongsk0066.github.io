function varyByAccept(response) {
  const headers = new Headers(response.headers);
  const vary = (headers.get("vary") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!vary.some((value) => value.toLowerCase() === "accept" || value === "*"))
    vary.push("Accept");
  headers.set("vary", vary.join(", "));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function prefersMarkdown(accept) {
  const ranges = accept
    .toLowerCase()
    .split(",")
    .map((range, index) => {
      const [type, ...parameters] = range.trim().split(";");
      const q = parameters.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const quality = q ? Number(q.slice(2)) : 1;
      return {
        type: type.trim(),
        quality:
          Number.isFinite(quality) && quality >= 0 && quality <= 1
            ? quality
            : 0,
        index,
      };
    });
  if (
    !ranges.some((range) => range.type === "text/markdown" && range.quality > 0)
  )
    return false;
  function preference(type) {
    return (
      ranges
        .map((range) => ({
          ...range,
          specificity:
            range.type === type
              ? 2
              : range.type === "text/*"
                ? 1
                : range.type === "*/*"
                  ? 0
                  : -1,
        }))
        .filter((range) => range.specificity >= 0)
        .sort(
          (a, b) => b.specificity - a.specificity || a.index - b.index
        )[0] || { quality: 0, specificity: -1, index: Infinity }
    );
  }
  const md = preference("text/markdown");
  const html = preference("text/html");
  return (
    md.quality > 0 &&
    (md.quality > html.quality ||
      (md.quality === html.quality &&
        (md.specificity > html.specificity ||
          (md.specificity === html.specificity && md.index < html.index))))
  );
}

function markdownResponse(response) {
  const headers = new Headers(response.headers);
  headers.set("content-type", "text/markdown; charset=utf-8");
  headers.set("x-robots-tag", "noindex");
  return varyByAccept(
    new Response(response.body, { status: response.status, headers })
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Serve /blog/*/index.md with correct Content-Type
    if (path.endsWith("/index.md") && path.startsWith("/blog/")) {
      const response = await env.ASSETS.fetch(request);
      if (response.ok) return markdownResponse(response);
    }

    // Content negotiation: Accept: text/markdown → serve index.md
    const accept = request.headers.get("accept") || "";
    if (
      prefersMarkdown(accept) &&
      path.startsWith("/blog/") &&
      !path.endsWith("/index.md")
    ) {
      const mdPath = path.replace(/\/?$/, "/index.md");
      const mdUrl = new URL(mdPath, url.origin);
      const mdResponse = await env.ASSETS.fetch(
        new Request(mdUrl.toString(), request)
      );
      if (mdResponse.ok) return markdownResponse(mdResponse);
    }

    // Only lowercase redirect for page URLs, not static assets
    const isStaticAsset =
      /\.(?:js|css|woff2?|ttf|otf|eot|png|jpe?g|gif|svg|webp|avif|ico|mp4|webm|json|xml|txt|wasm|md)$/i.test(
        path
      ) ||
      path.startsWith("/_astro/") ||
      path.startsWith("/fonts/") ||
      path.startsWith("/post/") ||
      path.startsWith("/assets/") ||
      path.startsWith("/video/");

    if (!isStaticAsset) {
      // Lowercase only literal characters, preserve percent-encoding hex digits
      const lowercasePath = path.replace(
        /(%[0-9A-Fa-f]{2})|[A-Z]/g,
        (match, encoded) => (encoded ? match : match.toLowerCase())
      );
      if (path !== lowercasePath) {
        url.pathname = lowercasePath;
        return Response.redirect(url.toString(), 301);
      }
    }

    const response = await env.ASSETS.fetch(request);

    // Long-lived cache for hashed Astro assets
    if (path.startsWith("/_astro/") && response.ok) {
      const newHeaders = new Headers(response.headers);
      newHeaders.set("cache-control", "public, max-age=31536000, immutable");
      return new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      });
    }

    // Long-lived (but revalidating) cache for content-stable media.
    // Not `immutable`: these paths are human-named, not content-hashed, so an
    // edited asset must eventually revalidate (stale-while-revalidate window).
    if (
      response.ok &&
      (path.startsWith("/post/") ||
        path.startsWith("/assets/") ||
        path.startsWith("/fonts/"))
    ) {
      const newHeaders = new Headers(response.headers);
      newHeaders.set(
        "cache-control",
        "public, max-age=2592000, stale-while-revalidate=86400"
      );
      return new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      });
    }

    return path.startsWith("/blog/") ? varyByAccept(response) : response;
  },
};
