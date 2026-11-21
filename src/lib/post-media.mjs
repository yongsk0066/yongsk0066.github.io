import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const cdn = "https://static.yongseok.me";
export const albums = ["svalbard_3"];
// Bump when the encoder, its settings, or the metadata policy changes.
export const recipe = "webp92-sharp0.35.5-full-v1";
export const hash = (data) => createHash("sha256").update(data).digest("hex");

export function albumForPost(id = "") {
  const slug = id.replace(/^(en|ja)\//, "");
  return albums.includes(slug) ? slug : undefined;
}

export function photoName(name) {
  if (typeof name !== "string" || !/^[\p{L}\p{N}][\p{L}\p{N}._ -]*\.(?:jpe?g|png)$/iu.test(name))
    throw new Error("PostPhoto needs a JPEG or PNG filename inside the article's originals folder: " + name);
  return name;
}

export function manifestPath(album) {
  if (!albums.includes(album)) throw new Error("Unknown photo album: " + album);
  return join(process.cwd(), "media", album, "manifest.json");
}

export function readManifest(album) {
  return JSON.parse(readFileSync(manifestPath(album), "utf8"));
}

export function mediaDigest(id) {
  const album = albumForPost(id);
  return album ? hash(JSON.stringify([recipe, readManifest(album)])) : "";
}

export function photoFiles(photo) {
  const folder = "media/v1/" + hash(JSON.stringify([recipe, photo.source, photo.sdr || "", photo.sdrOrientation || 1, photo.format]));
  const widths = [...new Set([480, 960, 1600].map((w) => Math.min(w, photo.width)))];
  return {
    folder, widths,
    display: widths.map((width) => folder + "/" + width + ".webp"),
    full: folder + "/full." + photo.format,
    sdr: photo.sdr ? folder + "/full-sdr.jpg" : undefined,
  };
}

export function requirePhoto(album, name) {
  const photo = readManifest(album).photos[photoName(name)];
  if (!photo) throw new Error("Missing photo " + name + ". Put it in media/" + album + "/originals/ and run pnpm media:prepare.");
  return { photo, files: photoFiles(photo) };
}
