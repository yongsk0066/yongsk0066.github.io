// ---- Mode Registry ----
// To add a new mode:
//   1. Append name to MODES
//   2. Add `else if (u_mode == N)` branch in FRAG_SHADER

export const MODES = [
  "ASCII",
  "Receipt",
  "ノハメラマ木",
  "Stripes",
  "Weave",
  "CMYK",
] as const;

export type ModeName = (typeof MODES)[number];

// ---- Beat-sync Configuration ----

export const BEAT_SYNC = {
  bpm: 128,
  beatsPerSwitch: 4,
  offset: 0.805,
} as const;

export const SWITCH_INTERVAL =
  (60 / BEAT_SYNC.bpm) * BEAT_SYNC.beatsPerSwitch;

// ---- Character Texture Configuration ----

export const CHAR_CONFIG = {
  blockSize: 38,
  chars: "./ノハメラマ木",
  detail: 3.0,
} as const;

// ---- GLSL Shaders ----

export const VERT_SHADER = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

export const FRAG_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_frame;
uniform sampler2D u_ascii;
uniform sampler2D u_chars;
uniform vec2 u_grid;
uniform int u_mode;
uniform float u_detail;

in vec2 v_uv;
out vec4 fragColor;

const float STRIPES_M[64] = float[64](
  0.2, 1.0, 1.0, 0.2, 0.2, 1.0, 1.0, 0.2,
  0.2, 0.2, 1.0, 1.0, 0.2, 0.2, 1.0, 1.0,
  1.0, 0.2, 0.2, 1.0, 1.0, 0.2, 0.2, 1.0,
  1.0, 1.0, 0.2, 0.2, 1.0, 1.0, 0.2, 0.2,
  0.2, 1.0, 1.0, 0.2, 0.2, 1.0, 1.0, 0.2,
  0.2, 0.2, 1.0, 1.0, 0.2, 0.2, 1.0, 1.0,
  1.0, 0.2, 0.2, 1.0, 1.0, 0.2, 0.2, 1.0,
  1.0, 1.0, 0.2, 0.2, 1.0, 1.0, 0.2, 0.2
);

const float CROSS_STRIPES_M[64] = float[64](
  1.0, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 1.0,
  0.2, 1.0, 0.2, 0.2, 0.2, 0.2, 1.0, 0.2,
  0.2, 0.2, 1.0, 0.2, 0.2, 1.0, 0.2, 0.2,
  0.2, 0.2, 0.2, 1.0, 1.0, 0.2, 0.2, 0.2,
  0.2, 0.2, 0.2, 1.0, 1.0, 0.2, 0.2, 0.2,
  0.2, 0.2, 1.0, 0.2, 0.2, 1.0, 0.2, 0.2,
  0.2, 1.0, 0.2, 0.2, 0.2, 0.2, 1.0, 0.2,
  1.0, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 1.0
);

const float WEAVE_M[64] = float[64](
  0.99, 0.75, 0.2,  0.2,  0.2,  0.2,  0.99, 0.99,
  0.99, 0.99, 0.75, 0.2,  0.2,  0.99, 0.99, 0.75,
  0.2,  0.99, 0.99, 0.75, 0.99, 0.99, 0.2,  0.2,
  0.2,  0.2,  0.99, 0.99, 0.99, 0.2,  0.2,  0.2,
  0.2,  0.2,  0.2,  0.99, 0.99, 0.99, 0.2,  0.2,
  0.2,  0.2,  0.99, 0.99, 0.75, 0.99, 0.99, 0.2,
  0.75, 0.99, 0.99, 0.2,  0.2,  0.75, 0.99, 0.99,
  0.99, 0.99, 0.2,  0.2,  0.2,  0.2,  0.75, 0.99
);

// ---- CMYK Halftone helpers ----

const float CMYK_DOT_SIZE = 0.65;
const float CMYK_DENSITY = 1.5;
const float ANGLE_C = 15.0;
const float ANGLE_M = 45.0;
const float ANGLE_Y = 0.0;
const float ANGLE_K = 75.0;

mat2 cmykRot(float deg) {
  float a = radians(deg);
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

vec2 cmykGridUV(vec2 uv, float angleDeg, vec2 density) {
  return cmykRot(angleDeg) * (uv * density);
}

vec2 cmykCellCenter(vec2 uv, float angleDeg, vec2 density) {
  vec2 gridUV = cmykGridUV(uv, angleDeg, density);
  vec2 cellCenter = floor(gridUV) + 0.5;
  return cmykRot(-angleDeg) * cellCenter / density;
}

float cmykDot(vec2 uv, float angleDeg, float coverage, vec2 density) {
  vec2 gridUV = cmykGridUV(uv, angleDeg, density);
  vec2 gv = fract(gridUV) - 0.5;
  float r = CMYK_DOT_SIZE * sqrt(clamp(coverage, 0.0, 1.0));
  float aa = fwidth(length(gv));
  float d = length(gv);
  return 1.0 - smoothstep(r - aa, r + aa, d);
}

vec4 RGBtoCMYK(vec3 rgb) {
  float k = min(1.0 - rgb.r, min(1.0 - rgb.g, 1.0 - rgb.b));
  vec3 cmy = vec3(0.0);
  float invK = 1.0 - k;
  if (invK > 0.0) {
    cmy = (1.0 - rgb - k) / invK;
  }
  return clamp(vec4(cmy, k), 0.0, 1.0);
}

void main() {
  vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);

  // Common preamble — used by modes 0–4
  vec2 grid = (u_mode == 0 || u_mode == 2) ? u_grid : u_grid * u_detail;
  vec2 cellPos = floor(uv * grid);
  vec2 cellUV = fract(uv * grid);

  vec2 dataCell = (u_mode == 0 || u_mode == 2)
    ? cellPos
    : min(floor(cellPos / u_detail), u_grid - 1.0);
  vec2 dataUV = (dataCell + 0.5) / u_grid;
  vec3 color = texture(u_frame, dataUV).rgb;
  float rawLuma = dot(vec3(0.2126, 0.7152, 0.0722), color);
  float luma = smoothstep(0.15, 0.85, rawLuma);

  vec3 outColor;
  float outAlpha;

  if (u_mode == 0) {
    // Original ASCII (ascii.png, 10x10 grid)
    float charCol = min(floor(10.0 * luma * luma), 9.0);
    float charRow = mod(float((int(cellPos.y) * 7 + int(cellPos.x) * 13) & 0xFF), 10.0);
    vec2 asciiUV = (vec2(charCol, charRow) + cellUV) / 10.0;
    float t = texture(u_ascii, asciiUV).r;
    outColor = color * t;
    outAlpha = mix(0.89, 1.0, t);
  } else if (u_mode == 1) {
    // Receipt: horizontal bar width based on luma
    float lineWidth = 0.0;
    if (luma > 0.0)  lineWidth = 1.0;
    if (luma > 0.3)  lineWidth = 0.7;
    if (luma > 0.5)  lineWidth = 0.5;
    if (luma > 0.7)  lineWidth = 0.3;
    if (luma > 0.9)  lineWidth = 0.1;
    if (luma > 0.99) lineWidth = 0.0;
    float t = (cellUV.y > 0.05 && cellUV.y < 0.95 && cellUV.x > 0.0 && cellUV.x < lineWidth)
      ? 1.0 : 0.0;
    outColor = color * t;
    outAlpha = mix(0.89, 1.0, t);
  } else if (u_mode == 2) {
    // ノハメラマ木 ASCII (charCanvas, 8 characters)
    float charCount = 8.0;
    float charIdx = min(floor(luma * (charCount - 1.0)), charCount - 1.0);
    vec2 charUV = vec2((charIdx + cellUV.x) / charCount, cellUV.y);
    float t = texture(u_chars, charUV).r;
    outColor = color * t;
    outAlpha = mix(0.89, 1.0, t);
  } else if (u_mode == 3) {
    // Stripes
    int mx = min(int(cellUV.x * 8.0), 7);
    int my = min(int(cellUV.y * 8.0), 7);
    int idx = my * 8 + mx;
    float threshold = (luma < 0.6) ? STRIPES_M[idx] : CROSS_STRIPES_M[idx];
    float t = (threshold <= luma) ? 1.0 : 0.0;
    outColor = color * t;
    outAlpha = mix(0.89, 1.0, t);
  } else if (u_mode == 4) {
    // Weave
    int mx = min(int(cellUV.x * 8.0), 7);
    int my = min(int(cellUV.y * 8.0), 7);
    int idx = my * 8 + mx;
    float t = (WEAVE_M[idx] <= luma) ? 1.0 : 0.0;
    outColor = color * t;
    outAlpha = mix(0.89, 1.0, t);
  } else {
    // CMYK Halftone
    vec2 density = u_grid * CMYK_DENSITY;

    vec2 uvC = cmykCellCenter(uv, ANGLE_C, density);
    vec2 uvM = cmykCellCenter(uv, ANGLE_M, density);
    vec2 uvY = cmykCellCenter(uv, ANGLE_Y, density);
    vec2 uvK = cmykCellCenter(uv, ANGLE_K, density);

    vec4 cmykC = RGBtoCMYK(texture(u_frame, uvC).rgb);
    vec4 cmykM = RGBtoCMYK(texture(u_frame, uvM).rgb);
    vec4 cmykY = RGBtoCMYK(texture(u_frame, uvY).rgb);
    vec4 cmykK = RGBtoCMYK(texture(u_frame, uvK).rgb);

    float dotC = cmykDot(uv, ANGLE_C, cmykC.x, density);
    float dotM = cmykDot(uv, ANGLE_M, cmykM.y, density);
    float dotY = cmykDot(uv, ANGLE_Y, cmykY.z, density);
    float dotK = cmykDot(uv, ANGLE_K, cmykK.w, density);

    outColor = vec3(1.0);
    outColor.r *= (1.0 - 0.95 * dotC);
    outColor.g *= (1.0 - 0.95 * dotM);
    outColor.b *= (1.0 - 0.95 * dotY);
    outColor *= (1.0 - 1.10 * dotK);
    outAlpha = 1.0;
  }

  fragColor = vec4(outColor, outAlpha);
}`;
