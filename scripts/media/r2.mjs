import { execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { AwsClient } from "aws4fetch";
import { XMLParser } from "fast-xml-parser";

export const publicBucket = "yongseok-me";
export const privateBucket = "yongseok-blog-originals";
const account = process.env.CLOUDFLARE_ACCOUNT_ID || "492ce0970d3e7dc266e388894370839a";
const xml = new XMLParser({ isArray: (name) => name === "Contents" });
let client;
function authentication() {
  if (client) return client;
  let raw = process.env.BLOG_MEDIA_R2_S3;
  if (!raw && process.platform === "darwin" && !process.env.CI) {
    try {
      raw = execFileSync("security", ["find-generic-password", "-s", "yongseok-blog-r2", "-a", "media-publisher", "-w"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    } catch { /* GitHub Actions and other platforms can supply the credential via environment. */ }
  }
  if (!raw) throw new Error("Configure the blog R2 Keychain item or set BLOG_MEDIA_R2_S3 before publishing new photos.");
  const { accessKeyId, secretAccessKey } = JSON.parse(raw);
  if (!accessKeyId || !secretAccessKey) throw new Error("Incomplete BLOG_MEDIA_R2_S3 credential");
  client = new AwsClient({ accessKeyId, secretAccessKey, region: "auto", service: "s3", retries: 0 });
  return client;
}

async function request(method, bucket, key = "", options = {}, prefix) {
  const client = authentication();
  const path = key.split("/").map(encodeURIComponent).join("/");
  const url = new URL("https://" + account + ".r2.cloudflarestorage.com/" + bucket + "/" + path);
  if (prefix !== undefined) {
    url.search = new URLSearchParams({ prefix, "list-type": "2", "max-keys": "50" });
  }
  for (let attempt = 0; ; attempt++) {
    const response = await client.fetch(url.href, { method, ...options, signal: AbortSignal.timeout(60000) });
    if (response.ok || (method === "GET" && response.status === 404) || (method === "PUT" && response.status === 412)) return response;
    await response.body?.cancel();
    const retryable = response.status === 429 || response.status >= 500 || (method === "PUT" && response.status === 409);
    if (attempt >= 2 || !retryable)
      throw new Error("R2 " + method + " " + bucket + " returned HTTP " + response.status);
    const wait = Number(response.headers.get("retry-after") || 0);
    if (wait > 30) throw new Error("Retry publication after " + wait + " seconds.");
    await delay(Math.max(1000 * (attempt + 1), wait * 1000));
  }
}
export async function getObject(bucket, key) {
  const response = await request("GET", bucket, key);
  if (response.status === 404) { await response.body?.cancel(); return null; }
  return Buffer.from(await response.arrayBuffer());
}
export async function putObject(bucket, key, bytes, type) {
  const response = await request("PUT", bucket, key, { body: bytes, headers: {
    "content-type": type,
    "cache-control": bucket === publicBucket ? "public, max-age=31536000, immutable" : "private, no-store",
    "if-none-match": "*",
  } });
  await response.body?.cancel();
}
export async function listObjects(bucket, prefix) {
  const response = await request("GET", bucket, "", {}, prefix);
  if (!response.ok) throw new Error("Missing R2 bucket: " + bucket);
  const { ListBucketResult } = xml.parse(await response.text());
  if (!ListBucketResult || ListBucketResult.IsTruncated === true) throw new Error("Unexpected R2 listing");
  return (ListBucketResult.Contents || []).map(o => ({ key: o.Key, size: Number(o.Size) }));
}
