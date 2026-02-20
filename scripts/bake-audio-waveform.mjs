#!/usr/bin/env node
/**
 * Pre-bake spectrogram data from 404-audio.wav.
 *
 * Usage: node scripts/bake-audio-waveform.mjs
 *
 * Output: public/assets/404-audio.bin
 *
 * Binary format:
 *   Header (6 bytes):
 *     u16 binsPerFrame (64)
 *     u16 fps (30)
 *     u16 frameCount
 *   Data (frameCount × binsPerFrame bytes):
 *     u8 log-magnitude (0 = silence, 255 = peak)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const WAV_FILE = join(import.meta.dirname, "404-audio.wav");
const OUT_FILE = join(import.meta.dirname, "../public/assets/404-audio.bin");

const FFT_SIZE = 2048;
const BINS = 64;
const FPS = 30;
const MIN_FREQ = 30;
const DB_RANGE = 70;

// ---- WAV Parsing ----

const wav = readFileSync(WAV_FILE);
const channels = wav.readUInt16LE(22);
const sampleRate = wav.readUInt32LE(24);
const bitsPerSample = wav.readUInt16LE(34);
const bytesPerSample = bitsPerSample / 8;

console.log(`WAV: ${sampleRate}Hz, ${bitsPerSample}-bit, ${channels}ch`);

// Find "data" chunk
let dataOffset = 12;
while (dataOffset < wav.length - 8) {
  const chunkId = wav.toString("ascii", dataOffset, dataOffset + 4);
  const chunkSize = wav.readUInt32LE(dataOffset + 4);
  if (chunkId === "data") {
    dataOffset += 8;
    break;
  }
  dataOffset += 8 + chunkSize;
}

const dataSize = wav.readUInt32LE(dataOffset - 4);
const totalSamples = Math.floor(dataSize / (bytesPerSample * channels));
const duration = totalSamples / sampleRate;

console.log(`Duration: ${duration.toFixed(2)}s, ${totalSamples} samples`);

// Read mono samples as float32 (mix channels)
const samples = new Float32Array(totalSamples);
for (let i = 0; i < totalSamples; i++) {
  const offset = dataOffset + i * channels * bytesPerSample;
  let sum = 0;
  for (let ch = 0; ch < channels; ch++) {
    sum += wav.readInt16LE(offset + ch * bytesPerSample);
  }
  samples[i] = sum / channels / 32768;
}

// ---- Radix-2 Cooley-Tukey FFT (in-place) ----

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len *= 2) {
    const half = len / 2;
    const angle = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let j = 0; j < half; j++) {
        const theta = angle * j;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
        const tRe = re[i + j + half] * cos - im[i + j + half] * sin;
        const tIm = re[i + j + half] * sin + im[i + j + half] * cos;
        re[i + j + half] = re[i + j] - tRe;
        im[i + j + half] = im[i + j] - tIm;
        re[i + j] += tRe;
        im[i + j] += tIm;
      }
    }
  }
}

// Hanning window
const hannWindow = new Float32Array(FFT_SIZE);
for (let i = 0; i < FFT_SIZE; i++) {
  hannWindow[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1)));
}

// Log-scale frequency bin edges
const maxFreq = sampleRate / 2;
const binEdges = new Uint32Array(BINS + 1);
for (let i = 0; i <= BINS; i++) {
  const freq = MIN_FREQ * Math.pow(maxFreq / MIN_FREQ, i / BINS);
  binEdges[i] = Math.min(
    Math.round((freq * FFT_SIZE) / sampleRate),
    FFT_SIZE / 2,
  );
}

// ---- Pass 1: compute FFT magnitudes ----

const frameCount = Math.floor(duration * FPS);
const rawMagnitudes = new Float32Array(frameCount * BINS);
let globalMax = 0;

console.log(`Processing ${frameCount} frames...`);

for (let f = 0; f < frameCount; f++) {
  const center = Math.floor((f / FPS) * sampleRate);
  const re = new Float64Array(FFT_SIZE);
  const im = new Float64Array(FFT_SIZE);

  for (let i = 0; i < FFT_SIZE; i++) {
    const idx = center - Math.floor(FFT_SIZE / 2) + i;
    re[i] =
      (idx >= 0 && idx < totalSamples ? samples[idx] : 0) * hannWindow[i];
  }

  fft(re, im);

  for (let b = 0; b < BINS; b++) {
    const lo = Math.max(1, binEdges[b]);
    const hi = Math.max(lo + 1, binEdges[b + 1]);
    let maxMag = 0;
    for (let k = lo; k < hi; k++) {
      const mag = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
      if (mag > maxMag) maxMag = mag;
    }
    rawMagnitudes[f * BINS + b] = maxMag;
    if (maxMag > globalMax) globalMax = maxMag;
  }
}

// ---- Pass 2: normalize to dB and write ----

const maxDb = 20 * Math.log10(globalMax + 1e-10);
const output = Buffer.alloc(6 + frameCount * BINS);

output.writeUInt16LE(BINS, 0);
output.writeUInt16LE(FPS, 2);
output.writeUInt16LE(frameCount, 4);

for (let i = 0; i < frameCount * BINS; i++) {
  const db = 20 * Math.log10(rawMagnitudes[i] + 1e-10);
  const normalized = Math.max(0, (db - (maxDb - DB_RANGE)) / DB_RANGE);
  output[6 + i] = Math.round(normalized * 255);
}

writeFileSync(OUT_FILE, output);
console.log(
  `Written ${OUT_FILE} (${(output.length / 1024).toFixed(1)} KB, ` +
    `${frameCount} frames @ ${FPS}fps, ${BINS} bins/frame)`,
);
