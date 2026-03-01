import {
  VERT_SHADER,
  CHAR_CONFIG,
  MODES,
  BEAT_SYNC,
  SWITCH_INTERVAL,
  compileShader,
} from "./shader-modes";

// ---- Colormap ----

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

// ---- Border Fragment Shader ----

const BORDER_FRAG = `#version 300 es
precision highp float;

uniform sampler2D u_frame;
uniform sampler2D u_ascii;
uniform sampler2D u_chars;
uniform vec2 u_grid;
uniform int u_mode;
uniform float u_detail;
uniform vec2 u_canvasSize;
uniform float u_tw;
uniform float u_head;

in vec2 v_uv;
out vec4 fragColor;

const float PI  = 3.14159265;
const float HP  = 1.57079632;

// ---- Dither matrices (same as overlay) ----

const float STRIPES_M[64] = float[64](
  0.2,1.0,1.0,0.2,0.2,1.0,1.0,0.2,
  0.2,0.2,1.0,1.0,0.2,0.2,1.0,1.0,
  1.0,0.2,0.2,1.0,1.0,0.2,0.2,1.0,
  1.0,1.0,0.2,0.2,1.0,1.0,0.2,0.2,
  0.2,1.0,1.0,0.2,0.2,1.0,1.0,0.2,
  0.2,0.2,1.0,1.0,0.2,0.2,1.0,1.0,
  1.0,0.2,0.2,1.0,1.0,0.2,0.2,1.0,
  1.0,1.0,0.2,0.2,1.0,1.0,0.2,0.2
);

const float CROSS_STRIPES_M[64] = float[64](
  1.0,0.2,0.2,0.2,0.2,0.2,0.2,1.0,
  0.2,1.0,0.2,0.2,0.2,0.2,1.0,0.2,
  0.2,0.2,1.0,0.2,0.2,1.0,0.2,0.2,
  0.2,0.2,0.2,1.0,1.0,0.2,0.2,0.2,
  0.2,0.2,0.2,1.0,1.0,0.2,0.2,0.2,
  0.2,0.2,1.0,0.2,0.2,1.0,0.2,0.2,
  0.2,1.0,0.2,0.2,0.2,0.2,1.0,0.2,
  1.0,0.2,0.2,0.2,0.2,0.2,0.2,1.0
);

const float BAYER_M[64] = float[64](
  0.000,0.500,0.125,0.625,0.031,0.531,0.156,0.656,
  0.750,0.250,0.875,0.375,0.781,0.281,0.906,0.406,
  0.188,0.688,0.063,0.563,0.219,0.719,0.094,0.594,
  0.938,0.438,0.813,0.313,0.969,0.469,0.844,0.344,
  0.047,0.547,0.172,0.672,0.016,0.516,0.141,0.641,
  0.797,0.297,0.922,0.422,0.766,0.266,0.891,0.391,
  0.234,0.734,0.109,0.609,0.203,0.703,0.078,0.578,
  0.984,0.484,0.859,0.359,0.953,0.453,0.828,0.328
);

// ---- CMYK helpers ----

const float CMYK_DOT_SIZE = 0.65;
const float CMYK_DENSITY  = 1.5;
const float ANGLE_C = 15.0;
const float ANGLE_M = 45.0;
const float ANGLE_Y =  0.0;
const float ANGLE_K = 75.0;

mat2 cmykRot(float deg) {
  float a = radians(deg);
  float c = cos(a), s = sin(a);
  return mat2(c,-s,s,c);
}
vec2 cmykGridUV(vec2 uv,float ang,vec2 den){ return cmykRot(ang)*(uv*den); }
vec2 cmykCellCenter(vec2 uv,float ang,vec2 den){
  vec2 g=cmykGridUV(uv,ang,den);
  return cmykRot(-ang)*(floor(g)+0.5)/den;
}
float cmykDot(vec2 uv,float ang,float cov,vec2 den){
  vec2 g=cmykGridUV(uv,ang,den);
  vec2 gv=fract(g)-0.5;
  float r=CMYK_DOT_SIZE*sqrt(clamp(cov,0.0,1.0));
  float aa=fwidth(length(gv));
  return 1.0-smoothstep(r-aa,r+aa,length(gv));
}
vec4 RGBtoCMYK(vec3 rgb){
  float k=min(1.0-rgb.r,min(1.0-rgb.g,1.0-rgb.b));
  vec3 cmy=vec3(0.0);
  if(1.0-k>0.0) cmy=(1.0-rgb-k)/(1.0-k);
  return clamp(vec4(cmy,k),0.0,1.0);
}

// ---- Track mapping ----
// Returns vec3(trackT, depth, valid)
//   trackT: 0 = bottom-right (newest), → 1 counter-clockwise
//   depth:  0 = outer edge (low freq), 1 = inner edge (high freq)
//   valid:  >= 0 if on track

vec3 mapToTrack(vec2 px) {
  float tw = u_tw;
  float W  = u_canvasSize.x;
  float H  = u_canvasSize.y;

  float sB = W - 2.0*tw;            // bottom straight
  float sL = H - 2.0*tw;            // left straight
  float sC = HP * tw * 0.5;         // corner arc (center-line)
  float total = 2.0*(sB + sL) + 4.0*sC;

  float c0=0.0, c1=sB, c2=c1+sC, c3=c2+sL, c4=c3+sC;
  float c5=c4+sB, c6=c5+sC, c7=c6+sL;

  // Bottom straight: x in [tw, W-tw], y in [H-tw, H]
  if (px.x >= tw && px.x <= W-tw && px.y >= H-tw) {
    return vec3((c0 + W-tw - px.x) / total, (H - px.y) / tw, 1.0);
  }

  // BL corner: center (tw, H-tw)
  {
    vec2 d = px - vec2(tw, H-tw);
    if (d.x <= 0.0 && d.y >= 0.0) {
      float r = length(d);
      if (r <= tw) {
        float a = atan(-d.x, d.y);
        if (a >= 0.0 && a <= HP)
          return vec3((c1 + a/HP*sC) / total, 1.0-r/tw, 1.0);
      }
    }
  }

  // Left straight: x in [0, tw], y in [tw, H-tw]
  if (px.x <= tw && px.y >= tw && px.y <= H-tw) {
    return vec3((c2 + H-tw - px.y) / total, px.x / tw, 1.0);
  }

  // TL corner: center (tw, tw)
  {
    vec2 d = px - vec2(tw, tw);
    if (d.x <= 0.0 && d.y <= 0.0) {
      float r = length(d);
      if (r <= tw) {
        float a = atan(-d.y, -d.x);
        if (a >= 0.0 && a <= HP)
          return vec3((c3 + a/HP*sC) / total, 1.0-r/tw, 1.0);
      }
    }
  }

  // Top straight: x in [tw, W-tw], y in [0, tw]
  if (px.x >= tw && px.x <= W-tw && px.y <= tw) {
    return vec3((c4 + px.x - tw) / total, px.y / tw, 1.0);
  }

  // TR corner: center (W-tw, tw)
  {
    vec2 d = px - vec2(W-tw, tw);
    if (d.x >= 0.0 && d.y <= 0.0) {
      float r = length(d);
      if (r <= tw) {
        float a = atan(d.x, -d.y);
        if (a >= 0.0 && a <= HP)
          return vec3((c5 + a/HP*sC) / total, 1.0-r/tw, 1.0);
      }
    }
  }

  // Right straight: x in [W-tw, W], y in [tw, H-tw]
  if (px.x >= W-tw && px.y >= tw && px.y <= H-tw) {
    return vec3((c6 + px.y - tw) / total, (W - px.x) / tw, 1.0);
  }

  // BR corner: center (W-tw, H-tw)
  {
    vec2 d = px - vec2(W-tw, H-tw);
    if (d.x >= 0.0 && d.y >= 0.0) {
      float r = length(d);
      if (r <= tw) {
        float a = atan(d.y, d.x);
        if (a >= 0.0 && a <= HP)
          return vec3((c7 + a/HP*sC) / total, 1.0-r/tw, 1.0);
      }
    }
  }

  return vec3(-1.0);
}

void main() {
  vec2 px = vec2(v_uv.x, 1.0 - v_uv.y) * u_canvasSize;
  vec3 tk = mapToTrack(px);

  if (tk.z < 0.0 || tk.x > u_head) {
    fragColor = vec4(0.0);
    return;
  }

  vec2 uv = vec2(tk.x, tk.y);

  float scale = (u_mode == 0 || u_mode == 2) ? 1.0 : u_detail;
  vec2 grid  = u_grid * scale;
  vec2 cellPos = floor(uv * grid);
  vec2 cellUV  = fract(uv * grid);

  vec2 dataCell = (scale <= 1.0)
    ? min(cellPos, u_grid - 1.0)
    : min(floor(cellPos / u_detail), u_grid - 1.0);
  vec2 dataUV = (dataCell + 0.5) / u_grid;
  vec3 color  = texture(u_frame, dataUV).rgb;
  float rawLuma = dot(vec3(0.2126,0.7152,0.0722), color);
  float luma = smoothstep(0.15, 0.85, rawLuma);

  vec3  outColor;
  float outAlpha;

  if (u_mode == 0) {
    float charCol = min(floor(10.0*luma*luma), 9.0);
    float charRow = mod(float((int(cellPos.y)*7 + int(cellPos.x)*13) & 0xFF), 10.0);
    vec2 asciiUV  = (vec2(charCol,charRow) + cellUV) / 10.0;
    float t = texture(u_ascii, asciiUV).r;
    outColor = color * t;
    outAlpha = mix(0.89, 1.0, t);

  } else if (u_mode == 1) {
    float lw = 0.0;
    if(luma>0.0)  lw=1.0;
    if(luma>0.3)  lw=0.7;
    if(luma>0.5)  lw=0.5;
    if(luma>0.7)  lw=0.3;
    if(luma>0.9)  lw=0.1;
    if(luma>0.99) lw=0.0;
    float t = (cellUV.y>0.05 && cellUV.y<0.95 && cellUV.x<lw) ? 1.0 : 0.0;
    outColor = color * t;
    outAlpha = mix(0.89, 1.0, t);

  } else if (u_mode == 2) {
    float cc = 8.0;
    float ci = min(floor(luma*(cc-1.0)), cc-1.0);
    vec2 cuv = vec2((ci+cellUV.x)/cc, cellUV.y);
    float t = texture(u_chars, cuv).r;
    outColor = color * t;
    outAlpha = mix(0.89, 1.0, t);

  } else if (u_mode == 3) {
    int mx = min(int(cellUV.x*8.0),7);
    int my = min(int(cellUV.y*8.0),7);
    int idx = my*8+mx;
    float thr = (luma<0.6) ? STRIPES_M[idx] : CROSS_STRIPES_M[idx];
    float t = (thr<=luma) ? 1.0 : 0.0;
    outColor = color * t;
    outAlpha = mix(0.89, 1.0, t);

  } else if (u_mode == 4) {
    vec2 den = u_grid * CMYK_DENSITY;
    vec4 cmC = RGBtoCMYK(texture(u_frame, cmykCellCenter(uv,ANGLE_C,den)).rgb);
    vec4 cmM = RGBtoCMYK(texture(u_frame, cmykCellCenter(uv,ANGLE_M,den)).rgb);
    vec4 cmY = RGBtoCMYK(texture(u_frame, cmykCellCenter(uv,ANGLE_Y,den)).rgb);
    vec4 cmK = RGBtoCMYK(texture(u_frame, cmykCellCenter(uv,ANGLE_K,den)).rgb);
    float dC = cmykDot(uv,ANGLE_C,cmC.x,den);
    float dM = cmykDot(uv,ANGLE_M,cmM.y,den);
    float dY = cmykDot(uv,ANGLE_Y,cmY.z,den);
    float dK = cmykDot(uv,ANGLE_K,cmK.w,den);
    outColor = vec3(1.0);
    outColor.r *= (1.0-0.95*dC);
    outColor.g *= (1.0-0.95*dM);
    outColor.b *= (1.0-0.95*dY);
    outColor *= (1.0-1.10*dK);
    outAlpha = 1.0;

  } else {
    int mx = int(mod(cellPos.x,8.0));
    int my = int(mod(cellPos.y,8.0));
    int idx = my*8+mx;
    float t = (BAYER_M[idx]<=luma) ? 1.0 : 0.0;
    outColor = color * t;
    outAlpha = mix(0.89, 1.0, t);
  }

  fragColor = vec4(outColor, outAlpha);
}`;

// ---- Renderer ----

const CELL_SIZE = 10; // canvas pixels per grid cell

export interface SpectroBorderRenderer {
  pushColumn(
    bins: Uint8Array,
    offset: number,
    binsPerFrame: number,
    clipTime: number,
  ): void;
}

export function createSpectroBorderRenderer(
  canvas: HTMLCanvasElement,
  trackWidthCSS: number,
): SpectroBorderRenderer {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: false,
  })!;

  const colorLUT = buildColorLUT();

  // Canvas pixel dimensions (set by caller)
  const W = canvas.width;
  const H = canvas.height;
  const dpr = W / canvas.clientWidth;
  const TW = trackWidthCSS * dpr; // track width in canvas pixels

  // Compute grid dimensions from perimeter
  const straightH = W - 2 * TW;
  const straightV = H - 2 * TW;
  const cornerArc = (Math.PI / 2) * (TW / 2);
  const totalPerimeter = 2 * (straightH + straightV) + 4 * cornerArc;

  const COLS = Math.round(totalPerimeter / CELL_SIZE);
  const ROWS = Math.max(4, Math.round(TW / CELL_SIZE));

  // ---- Shader compilation ----

  const prog = gl.createProgram()!;
  gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER, VERT_SHADER));
  gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, BORDER_FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
    console.error("Link:", gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  // ---- Fullscreen quad ----

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const aPos = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  // ---- Uniforms ----

  const uFrame = gl.getUniformLocation(prog, "u_frame");
  const uAscii = gl.getUniformLocation(prog, "u_ascii");
  const uChars = gl.getUniformLocation(prog, "u_chars");
  const uGrid = gl.getUniformLocation(prog, "u_grid");
  const uMode = gl.getUniformLocation(prog, "u_mode");
  const uDetail = gl.getUniformLocation(prog, "u_detail");
  const uCanvasSize = gl.getUniformLocation(prog, "u_canvasSize");
  const uTw = gl.getUniformLocation(prog, "u_tw");
  const uHead = gl.getUniformLocation(prog, "u_head");

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

  // Load ascii.png
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

  // Character texture
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

  // Frame texture (spectrogram RGB data)
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
  gl.uniform2f(uCanvasSize, W, H);
  gl.uniform1f(uTw, TW);
  gl.uniform1f(uHead, 0.0);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.viewport(0, 0, W, H);

  let headCol = 0;
  let lastMode = -1;

  return {
    pushColumn(
      bins: Uint8Array,
      offset: number,
      binsPerFrame: number,
      clipTime: number,
    ) {
      if (!asciiReady) return;

      // Beat-synced mode switching
      const beatTime = clipTime - BEAT_SYNC.offset;
      const mode =
        beatTime < 0
          ? 0
          : Math.floor(beatTime / SWITCH_INTERVAL) % MODES.length;
      if (mode !== lastMode) {
        gl.uniform1i(uMode, mode);
        lastMode = mode;
      }

      // Shift each row RIGHT by one pixel (new data at column 0)
      for (let row = 0; row < ROWS; row++) {
        const rowOff = row * COLS * 3;
        rgbBuffer.copyWithin(rowOff + 3, rowOff, rowOff + (COLS - 1) * 3);
      }

      // Write new column at index 0
      for (let row = 0; row < ROWS; row++) {
        // row 0 = high freq (inner), row ROWS-1 = low freq (outer)
        // In texture: row 0 maps to depth=0 (outer/low freq)
        // So texture row 0 = low freq, row ROWS-1 = high freq
        const binLo = Math.floor((row * binsPerFrame) / ROWS);
        const binHi = Math.floor(((row + 1) * binsPerFrame) / ROWS);
        let maxMag = 0;
        for (let b = binLo; b < binHi; b++) {
          if (bins[offset + b] > maxMag) maxMag = bins[offset + b];
        }
        const idx = row * COLS * 3; // column 0 of this row
        rgbBuffer[idx] = colorLUT[maxMag * 3];
        rgbBuffer[idx + 1] = colorLUT[maxMag * 3 + 1];
        rgbBuffer[idx + 2] = colorLUT[maxMag * 3 + 2];
      }

      // Progressive reveal
      if (headCol < COLS) headCol++;
      gl.uniform1f(uHead, headCol / COLS);

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
