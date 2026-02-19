export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Only lowercase redirect for page URLs, not static assets
    const isStaticAsset =
      /\.(?:js|css|woff2?|ttf|otf|eot|png|jpe?g|gif|svg|webp|avif|ico|mp4|webm|json|xml|txt|wasm)$/i.test(
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
