import { albums, cdn, hash, photoFiles, readManifest, recipe } from "../../src/lib/post-media.mjs";
import { atomicWrite, localSource, makeManifest, maybeRead, privateKey, sourcePath } from "./album.mjs";
import { variants } from "./encode.mjs";
import { getObject, putObject, listObjects, publicBucket, privateBucket } from "./r2.mjs";

const [mode, option] = process.argv.slice(2);
const modes = ["prepare", "stage", "publish", "render", "restore", "pending"];
if (!modes.includes(mode)) throw new Error("Expected one of " + modes.join(", "));

async function released(key, digest) {
  try {
    const response = await fetch(cdn + "/" + key, { signal: AbortSignal.timeout(8000) });
    if (response.ok) return (await response.json()).digest === digest;
    await response.body?.cancel();
  } catch { /* Fall back to the authoritative bucket API. */ }
  const bytes = await getObject(publicBucket, key);
  return bytes !== null && JSON.parse(bytes).digest === digest;
}

async function original(album, relative, digest, mode) {
  const local = await localSource(album, relative, digest);
  if (mode === "render" && local) return local;
  const key = privateKey(digest);
  if (mode !== "restore" && local) {
    const [found] = await listObjects(privateBucket, key);
    if (found?.key === key && found.size === local.length) return local;
    await putObject(privateBucket, key, local, "application/octet-stream");
    return local;
  }
  if (mode === "stage" && (await listObjects(privateBucket, key)).some(o => o.key === key)) return;
  const bytes = await getObject(privateBucket, key);
  if (!bytes || hash(bytes) !== digest) throw new Error("Missing original for " + relative + ". Run pnpm media:stage on the computer containing the photo, then retry.");
  if (mode === "restore") {
    const path = sourcePath(album, relative);
    const existing = await maybeRead(path);
    if (existing && hash(existing) !== digest) throw new Error("A different local original already exists: " + path);
    if (!existing) await atomicWrite(path, bytes);
  }
  return bytes;
}

async function processAlbum(album) {
  if (mode === "prepare") return makeManifest(album, option === "--staged");
  const manifest = readManifest(album);
  const digest = hash(JSON.stringify([recipe, manifest]));
  const receipt = "media/releases/" + digest + ".json";
  if (mode === "pending") return !(await released(receipt, digest));
  if ((mode === "publish" || mode === "stage") && await released(receipt, digest)) {
    console.log(album + " already published. No encoding or upload.");
    return;
  }
  let writes = 0;
  for (const [name, photo] of Object.entries(manifest.photos)) {
    const files = photoFiles(photo);
    const existing = mode === "publish" ? new Set((await listObjects(publicBucket, files.folder + "/")).map(o => o.key)) : new Set();
    const expected = [...files.display, files.full, ...(files.sdr ? [files.sdr] : [])];
    if (mode === "publish" && expected.every(k => existing.has(k))) continue;
    const primary = await original(album, name, photo.source, mode);
    const secondary = photo.sdr ? await original(album, "sdr/" + name, photo.sdr, mode) : undefined;
    if (mode === "stage" || mode === "restore") continue;
    for await (const { key, bytes, type } of variants(photo, primary, secondary, existing)) {
      if (mode === "publish") {
        await putObject(publicBucket, key, bytes, type);
        writes++;
      }
    }
  }
  if (mode === "publish") {
    await putObject(publicBucket, receipt, Buffer.from(JSON.stringify({ digest, photos: Object.keys(manifest.photos).length })), "application/json");
    console.log(album + " published " + writes + " new image objects and its release receipt.");
  }
}
let pending = false;
for (const album of albums) if (await processAlbum(album)) pending = true;
if (mode === "pending") console.log("pending=" + pending);
