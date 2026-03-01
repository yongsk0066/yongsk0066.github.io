import {
  VERT_SHADER,
  FRAG_SHADER,
  CHAR_CONFIG,
  MODES,
  BEAT_SYNC,
  SWITCH_INTERVAL,
  compileShader,
} from "./shader-modes";

const COLS = 100;
const ROWS = 10;

// Inferno-inspired spectrogram colormap
const COLOR_STOPS: [number, number, number, number][] = [
  [0.0, 0, 0, 4],
  [0.14, 30, 4, 90],
  [0.28, 80, 18, 123],
  [0.42, 137, 34, 95],
  [0.56, 190, 55, 46],
  [0.7, 230, 107, 10],
  [0.84, 250, 175, 35],
  [1.0, 252, 255, 164],
];

function buildColorLUT(): Uint8Array {
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let si = 0;
    for (let j = 0; j < COLOR_STOPS.length - 1; j++) {
      if (t >= COLOR_STOPS[j][0]) si = j;
    }
    const s =
      (t - COLOR_STOPS[si][0]) /
      (COLOR_STOPS[si + 1][0] - COLOR_STOPS[si][0]);
    lut[i * 3] = Math.round(
      COLOR_STOPS[si][1] + s * (COLOR_STOPS[si + 1][1] - COLOR_STOPS[si][1]),
    );
    lut[i * 3 + 1] = Math.round(
      COLOR_STOPS[si][2] + s * (COLOR_STOPS[si + 1][2] - COLOR_STOPS[si][2]),
    );
    lut[i * 3 + 2] = Math.round(
      COLOR_STOPS[si][3] + s * (COLOR_STOPS[si + 1][3] - COLOR_STOPS[si][3]),
    );
  }
  return lut;
}

export interface SpectroAsciiRenderer {
  pushColumn(
    bins: Uint8Array,
    offset: number,
    binsPerFrame: number,
    clipTime: number,
  ): void;
}

export function createSpectroAsciiRenderer(
  canvas: HTMLCanvasElement,
): SpectroAsciiRenderer {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: false,
  })!;

  const colorLUT = buildColorLUT();

  // ---- Shader compilation ----

  const prog = gl.createProgram()!;
  gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER, VERT_SHADER));
  gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SHADER));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  // ---- Fullscreen quad ----

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const aPos = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  // ---- Uniform locations ----

  const uFrame = gl.getUniformLocation(prog, "u_frame");
  const uAscii = gl.getUniformLocation(prog, "u_ascii");
  const uChars = gl.getUniformLocation(prog, "u_chars");
  const uGrid = gl.getUniformLocation(prog, "u_grid");
  const uMode = gl.getUniformLocation(prog, "u_mode");
  const uDetail = gl.getUniformLocation(prog, "u_detail");

  // ---- Textures ----

  function createTex(unit: number) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  const frameTex = createTex(0);
  const asciiTex = createTex(1);
  const charsTex = createTex(2);

  // Load ascii.png → texture unit 1
  let asciiReady = false;
  const asciiImg = new Image();
  asciiImg.onload = () => {
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, asciiTex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      asciiImg,
    );
    asciiReady = true;
  };
  asciiImg.src = "/assets/images/ascii.png";

  // Character texture (required by shader for mode 2)
  const { blockSize: BLOCK, chars, detail: DETAIL } = CHAR_CONFIG;
  const charCanvas = document.createElement("canvas");
  const charCtx = charCanvas.getContext("2d")!;
  charCanvas.width = BLOCK * chars.length;
  charCanvas.height = BLOCK;
  charCtx.fillStyle = "black";
  charCtx.fillRect(0, 0, charCanvas.width, charCanvas.height);
  charCtx.fillStyle = "white";
  charCtx.font = `${BLOCK}px monospace`;
  charCtx.textBaseline = "middle";
  charCtx.textAlign = "center";
  [...chars].forEach((char, i) => {
    charCtx.fillText(char, (i + 0.5) * BLOCK, BLOCK / 2);
  });
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, charsTex);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    charCanvas,
  );

  // ---- Frame texture (scrolling spectrogram RGB) ----

  const rgbBuffer = new Uint8Array(COLS * ROWS * 3);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, frameTex);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGB8,
    COLS,
    ROWS,
    0,
    gl.RGB,
    gl.UNSIGNED_BYTE,
    null,
  );

  // Static uniforms
  gl.uniform1i(uFrame, 0);
  gl.uniform1i(uAscii, 1);
  gl.uniform1i(uChars, 2);
  gl.uniform2f(uGrid, COLS, ROWS);
  gl.uniform1i(uMode, 0);
  gl.uniform1f(uDetail, DETAIL);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.viewport(0, 0, canvas.width, canvas.height);

  let lastMode = -1;

  return {
    pushColumn(
      bins: Uint8Array,
      offset: number,
      binsPerFrame: number,
      clipTime: number,
    ) {
      if (!asciiReady) return;

      // Beat-synced mode switching (same as video overlay)
      const beatTime = clipTime - BEAT_SYNC.offset;
      const mode =
        beatTime < 0
          ? 0
          : Math.floor(beatTime / SWITCH_INTERVAL) % MODES.length;
      if (mode !== lastMode) {
        gl.uniform1i(uMode, mode);
        lastMode = mode;
      }

      // Shift each row left by one pixel (3 bytes)
      for (let row = 0; row < ROWS; row++) {
        const rowOff = row * COLS * 3;
        rgbBuffer.copyWithin(rowOff, rowOff + 3, rowOff + COLS * 3);
      }

      // New column on right edge
      for (let row = 0; row < ROWS; row++) {
        // row 0 = high freq, row ROWS-1 = low freq
        const binLo = Math.floor(
          ((ROWS - 1 - row) * binsPerFrame) / ROWS,
        );
        const binHi = Math.floor(((ROWS - row) * binsPerFrame) / ROWS);
        let maxMag = 0;
        for (let b = binLo; b < binHi; b++) {
          if (bins[offset + b] > maxMag) maxMag = bins[offset + b];
        }
        const idx = row * COLS * 3 + (COLS - 1) * 3;
        rgbBuffer[idx] = colorLUT[maxMag * 3];
        rgbBuffer[idx + 1] = colorLUT[maxMag * 3 + 1];
        rgbBuffer[idx + 2] = colorLUT[maxMag * 3 + 2];
      }

      // Upload and draw
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, frameTex);
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        COLS,
        ROWS,
        gl.RGB,
        gl.UNSIGNED_BYTE,
        rgbBuffer,
      );
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}
