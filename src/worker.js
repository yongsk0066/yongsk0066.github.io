export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Serve /blog/*/index.md with correct Content-Type
    if (path.endsWith("/index.md") && path.startsWith("/blog/")) {
      const response = await env.ASSETS.fetch(request);
      if (response.ok) {
        const newHeaders = new Headers(response.headers);
        newHeaders.set("content-type", "text/markdown; charset=utf-8");
        newHeaders.set("x-robots-tag", "noindex");
        return new Response(response.body, {
          status: response.status,
          headers: newHeaders,
        });
      }
    }

    // Content negotiation: Accept: text/markdown → serve index.md
    const accept = request.headers.get("accept") || "";
    if (
      accept.includes("text/markdown") &&
      path.startsWith("/blog/") &&
      !path.endsWith("/index.md")
    ) {
      const mdPath = path.replace(/\/?$/, "/index.md");
      const mdUrl = new URL(mdPath, url.origin);
      const mdResponse = await env.ASSETS.fetch(
        new Request(mdUrl.toString(), request),
      );
      if (mdResponse.ok) {
        const newHeaders = new Headers(mdResponse.headers);
        newHeaders.set("content-type", "text/markdown; charset=utf-8");
        newHeaders.set("x-robots-tag", "noindex");
        return new Response(mdResponse.body, {
          status: 200,
          headers: newHeaders,
        });
      }
    }

    // Only lowercase redirect for page URLs, not static assets
    const isStaticAsset =
      /\.(?:js|css|woff2?|ttf|otf|eot|png|jpe?g|gif|svg|webp|avif|ico|mp4|webm|json|xml|txt|wasm|md)$/i.test(
        path,
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
        (match, encoded) => (encoded ? match : match.toLowerCase()),
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

    return response;
  },
};
