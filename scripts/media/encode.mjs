import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { photoFiles } from "../../src/lib/post-media.mjs";
import { atomicWrite, maybeRead } from "./album.mjs";

const run = promisify(execFile);
const cache = join(".cache", "post-media");
export const variantPath = (key) => join(cache, key);

async function fullResolution(source, format, orientation) {
  const dir = await mkdtemp(join(tmpdir(), "post-photo-"));
  try {
    const input = join(dir, "input." + format);
    const output = join(dir, "full." + format);
    await writeFile(input, source);
    // Keep the primary JPEG scan, orientation, ICC profile and embedded MPF HDR gain map.
    // An all-metadata strip also drops colour/HDR information from these phone photos.
    await run("exiftool", ["-q", "-q", "-o", output, "-EXIF:GPS=", "-GPS:all=", "-MakerNotes=",
      "-XMP-exif:all=", "-XMP-iptcCore:all=", "-XMP-iptcExt:all=", "-XMP-dc:all=", "-XMP-photoshop:all=",
      "-IPTC:all=", "-Artist=", "-Copyright=", "-OwnerName=", "-SerialNumber=", "-LensSerialNumber=",
      ...(orientation ? ["-IFD0:Orientation#=" + orientation] : []), "-BodySerialNumber=", "-UserComment=", "-Comment=", "-Author=", "-Description=", input]);
    const { stdout } = await run("exiftool", ["-s3", "-GPS:all", "-GPSCoordinates", "-GPSLatitude", "-GPSLongitude", output]);
    if (stdout.trim()) throw new Error("Unexpected location metadata in the public copy.");
    return await readFile(output);
  } finally { await rm(dir, { recursive: true, force: true }); }
}

export async function* variants(photo, primary, alternate, existing = new Set()) {
  const files = photoFiles(photo);
  for (const [i, key] of files.display.entries()) {
    if (existing.has(key)) continue;
    let bytes = await maybeRead(variantPath(key));
    if (!bytes) {
      const image = sharp(primary).autoOrient().resize({ width: files.widths[i], withoutEnlargement: true });
      if (photo.format === "jpg" && (await sharp(primary).metadata()).hasProfile) image.withIccProfile("p3");
      bytes = await image.webp(photo.format === "png" ? { lossless: true } : { quality: 92, smartSubsample: true, effort: 5 }).toBuffer();
      await atomicWrite(variantPath(key), bytes);
    }
    yield { key, bytes, type: "image/webp" };
  }
  for (const [key, source] of [[files.full, primary], ...(alternate ? [[files.sdr, alternate]] : [])]) {
    if (existing.has(key)) continue;
    let bytes = await maybeRead(variantPath(key));
    if (!bytes) { bytes = await fullResolution(source, photo.format, key === files.sdr ? photo.sdrOrientation : undefined); await atomicWrite(variantPath(key), bytes); }
    yield { key, bytes, type: photo.format === "jpg" ? "image/jpeg" : "image/png" };
  }
}
