import packedStock from './textures/paper-stock-data';

export {paperSlopeScale, paperMeanSlopePower} from './textures/paper-stock-data';
export type PaperStockLevel = {width: number; height: number; data: Uint8Array<ArrayBuffer>};
let cached: PaperStockLevel[] | undefined;

function decodeStock() {
  const bytes = Uint8Array as typeof Uint8Array & {fromBase64?(s: string): Uint8Array<ArrayBuffer>};
  if (bytes.fromBase64) return bytes.fromBase64(packedStock);
  const text = atob(packedStock);
  const data = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) data[i] = text.charCodeAt(i);
  return data;
}

/** One shared RGBA8 pyramid. R is centred formation, GB are mean tangent
 * slopes and A stores mean squared slope. Signed channels decode as
 * (byte - 128) / 127. See scripts/bake-calendar-paper.py. */
export function getPaperStockLevels(): PaperStockLevel[] {
  if (cached) return cached;
  const packed = decodeStock();
  const baseBytes = 128 * 128 * 4;
  let previous = packed.subarray(0, baseBytes);
  const levels: PaperStockLevel[] = [{width: 128, height: 128, data: previous}];
  let offset = baseBytes;
  // The prefiltered value differs from a box filter on quantised texels by
  // at most one. Four two-bit corrections reproduce one exact mip texel.
  for (let width = 64; width >= 1; width /= 2) {
    const data = new Uint8Array(width * width * 4);
    const rowBytes = 2 * width * 4;
    let dst = 0;
    for (let y = 0; y < width; y++) {
      for (let x = 0; x < width; x++) {
        const a = 2 * y * rowBytes + 8 * x;
        const b = a + rowBytes;
        let residuals = packed[offset++];
        for (let c = 0; c < 4; c++) {
          const sum = previous[a + c] + previous[a + c + 4] + previous[b + c] + previous[b + c + 4];
          data[dst++] = ((sum + 2) >> 2) + (residuals & 3) - 1;
          residuals >>= 2;
        }
      }
    }
    levels.push({width, height: width, data});
    previous = data;
  }
  cached = levels;
  return cached;
}
