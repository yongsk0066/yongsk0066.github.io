#!/usr/bin/env node
/**
 * Pre-bake ASCII frame data from a YouTube video.
 *
 * Usage: node scripts/generate-ascii-data.mjs
 *
 * Requirements: yt-dlp, ffmpeg
 * Output: public/assets/404-ascii.bin
 *
 * Binary format:
 *   Header (8 bytes):
 *     u16 cols (60)
 *     u16 rows (40)
 *     u16 fps  (5)
 *     u16 frameCount
 *   Frames (frameCount * cols * rows * 3 bytes):
 *     Per cell: u8 R, u8 G, u8 B
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";

const VIDEO_ID = "zhHB4dZTChw";
const START = 32;
const DURATION = null; // null = to the end
const FPS = 10;
const COLS = 60;
const ROWS = 40;

const TMP_DIR = join(import.meta.dirname, "../.tmp-ascii");
const OUT_FILE = join(import.meta.dirname, "../public/assets/404-ascii.bin");

try {
  mkdirSync(TMP_DIR, { recursive: true });

  // 1. Download clip (needs Chrome cookies for YouTube auth)
  console.log("Downloading video clip...");
  execSync(
    `yt-dlp --cookies-from-browser chrome ` +
      `-f "best[height<=480]" ` +
      `--download-sections "*${START}-${DURATION ? START + DURATION : ""}" ` +
      `--force-keyframes-at-cuts ` +
      `-o "${join(TMP_DIR, "clip.%(ext)s")}" ` +
      `-- ${VIDEO_ID}`,
    { stdio: "inherit" },
  );

  // Find the downloaded file (extension may vary)
  const clipFile = readdirSync(TMP_DIR).find((f) => f.startsWith("clip."));
  if (!clipFile) throw new Error("Clip download failed");
  const clipPath = join(TMP_DIR, clipFile);

  // 2. Extract frames as raw RGB at target grid resolution
  console.log(`Extracting frames at ${FPS}fps (${COLS}x${ROWS})...`);
  execSync(
    `ffmpeg -y -i "${clipPath}" ` +
      `-vf "fps=${FPS},scale=${COLS}:${ROWS}:flags=area" ` +
      `-f rawvideo -pix_fmt rgb24 ` +
      `"${join(TMP_DIR, "frames.raw")}"`,
    { stdio: "inherit" },
  );

  // 3. Read raw frames and build binary
  const raw = readFileSync(join(TMP_DIR, "frames.raw"));
  const bytesPerFrame = COLS * ROWS * 3;
  const frameCount = Math.floor(raw.length / bytesPerFrame);
  console.log(`Got ${frameCount} frames (${(raw.length / 1024).toFixed(1)} KB raw)`);

  // Header: 4 x u16 = 8 bytes
  const header = Buffer.alloc(8);
  header.writeUInt16LE(COLS, 0);
  header.writeUInt16LE(ROWS, 2);
  header.writeUInt16LE(FPS, 4);
  header.writeUInt16LE(frameCount, 6);

  // Frame data: just copy the raw RGB directly
  const frameData = raw.subarray(0, frameCount * bytesPerFrame);

  const out = Buffer.concat([header, frameData]);
  writeFileSync(OUT_FILE, out);

  console.log(
    `Written ${OUT_FILE} (${(out.length / 1024).toFixed(1)} KB, ` +
      `${frameCount} frames, ${COLS}x${ROWS} @ ${FPS}fps)`,
  );
} finally {
  // Clean up temp files
  rmSync(TMP_DIR, { recursive: true, force: true });
}
