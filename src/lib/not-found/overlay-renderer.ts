import {
  MODES,
  BEAT_SYNC,
  SWITCH_INTERVAL,
  CHAR_CONFIG,
  VERT_SHADER,
  FRAG_SHADER,
} from "./shader-modes";

export interface OverlayRenderer {
  start(): void;
  toggleAutoMode(): void;
  getModeName(): string;
}

export function createOverlayRenderer(
  canvas: HTMLCanvasElement,
  getClipTime: () => number | null,
  onModeChange?: (name: string) => void,
): OverlayRenderer {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: false,
  })!;

  let currentMode = 0;
  let lastMode = -1;
  let autoMode = true;

  // ---- Shader compilation ----

  function compile(type: number, src: string) {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", gl.getShaderInfoLog(s));
    }
    return s;
  }

  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT_SHADER));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG_SHADER));
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
  };
  asciiImg.src = "/assets/images/ascii.png";

  // Generate character canvas → texture unit 2
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

  // Static uniforms
  gl.uniform1i(uFrame, 0);
  gl.uniform1i(uAscii, 1);
  gl.uniform1i(uChars, 2);
  gl.uniform1f(uDetail, DETAIL);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.viewport(0, 0, canvas.width, canvas.height);

  // ---- Pre-baked frame data ----

  let asciiData: {
    cols: number;
    rows: number;
    fps: number;
    frameCount: number;
    frames: Uint8Array;
  } | null = null;

  fetch("/assets/404-ascii.bin")
    .then((r) => r.arrayBuffer())
    .then((buf) => {
      const v = new DataView(buf);
      asciiData = {
        cols: v.getUint16(0, true),
        rows: v.getUint16(2, true),
        fps: v.getUint16(4, true),
        frameCount: v.getUint16(6, true),
        frames: new Uint8Array(buf, 8),
      };
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, frameTex);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGB8,
        asciiData.cols,
        asciiData.rows,
        0,
        gl.RGB,
        gl.UNSIGNED_BYTE,
        null,
      );
      gl.uniform2f(uGrid, asciiData.cols, asciiData.rows);
    });

  // ---- Render loop ----

  let lastFrameIdx = -1;

  function render() {
    requestAnimationFrame(render);
    if (!asciiData) return;
    if (currentMode === 0 && !asciiImg.complete) return;

    const clipTime = getClipTime();
    if (clipTime == null) return;

    if (autoMode) {
      const beatTime = clipTime - BEAT_SYNC.offset;
      currentMode =
        beatTime < 0
          ? 0
          : Math.floor(beatTime / SWITCH_INTERVAL) % MODES.length;
    }

    const frameIdx =
      Math.floor(clipTime * asciiData.fps) % asciiData.frameCount;
    if (frameIdx === lastFrameIdx && currentMode === lastMode) return;
    lastFrameIdx = frameIdx;

    if (lastMode !== currentMode) {
      onModeChange?.(MODES[currentMode]);
    }
    lastMode = currentMode;

    const { cols, rows, frames } = asciiData;
    const bpf = cols * rows * 3;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, frameTex);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      cols,
      rows,
      gl.RGB,
      gl.UNSIGNED_BYTE,
      frames.subarray(frameIdx * bpf, (frameIdx + 1) * bpf),
    );

    gl.uniform1i(uMode, currentMode);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // ---- Public API ----

  return {
    start() {
      requestAnimationFrame(render);
    },
    toggleAutoMode() {
      autoMode = !autoMode;
      if (!autoMode) {
        currentMode = (currentMode + 1) % MODES.length;
      }
      onModeChange?.(MODES[currentMode]);
    },
    getModeName() {
      return MODES[currentMode];
    },
  };
}
