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

    // Custom 404 page
    if (response.status === 404) {
      return new Response(
        `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>404 - 페이지를 찾을 수 없습니다 | 장용석 블로그</title>
<style>
  body { font-family: 'Pretendard', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #fafafa; color: #333; }
  .container { text-align: center; padding: 2rem; }
  h1 { font-size: 4rem; margin: 0; font-weight: 700; }
  p { font-size: 1.1rem; color: #666; margin: 1rem 0 2rem; }
  a { color: #333; text-decoration: underline; text-underline-offset: 4px; }
  a:hover { color: #000; }
</style>
</head>
<body>
<div class="container">
  <h1>404</h1>
  <p>페이지를 찾을 수 없습니다.</p>
  <a href="/">홈으로 돌아가기</a> · <a href="/blog">블로그</a>
</div>
</body>
</html>`,
        { status: 404, headers: { "content-type": "text/html; charset=utf-8" } },
      );
    }

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
