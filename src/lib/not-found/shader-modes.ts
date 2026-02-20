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

void main() {
  vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);

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

  float t = 0.0;

  if (u_mode == 0) {
    // Original ASCII (ascii.png, 10x10 grid)
    float charCol = min(floor(10.0 * luma * luma), 9.0);
    float charRow = mod(float((int(cellPos.y) * 7 + int(cellPos.x) * 13) & 0xFF), 10.0);
    vec2 asciiUV = (vec2(charCol, charRow) + cellUV) / 10.0;
    t = texture(u_ascii, asciiUV).r;
  } else if (u_mode == 1) {
    // Receipt: horizontal bar width based on luma
    float lineWidth = 0.0;
    if (luma > 0.0)  lineWidth = 1.0;
    if (luma > 0.3)  lineWidth = 0.7;
    if (luma > 0.5)  lineWidth = 0.5;
    if (luma > 0.7)  lineWidth = 0.3;
    if (luma > 0.9)  lineWidth = 0.1;
    if (luma > 0.99) lineWidth = 0.0;
    t = (cellUV.y > 0.05 && cellUV.y < 0.95 && cellUV.x > 0.0 && cellUV.x < lineWidth)
      ? 1.0 : 0.0;
  } else if (u_mode == 2) {
    // ノハメラマ木 ASCII (charCanvas, 8 characters)
    float charCount = 8.0;
    float charIdx = min(floor(luma * (charCount - 1.0)), charCount - 1.0);
    vec2 charUV = vec2((charIdx + cellUV.x) / charCount, cellUV.y);
    t = texture(u_chars, charUV).r;
  } else if (u_mode == 3) {
    // Stripes
    int mx = min(int(cellUV.x * 8.0), 7);
    int my = min(int(cellUV.y * 8.0), 7);
    int idx = my * 8 + mx;
    float threshold = (luma < 0.6) ? STRIPES_M[idx] : CROSS_STRIPES_M[idx];
    t = (threshold <= luma) ? 1.0 : 0.0;
  } else {
    // Weave
    int mx = min(int(cellUV.x * 8.0), 7);
    int my = min(int(cellUV.y * 8.0), 7);
    int idx = my * 8 + mx;
    t = (WEAVE_M[idx] <= luma) ? 1.0 : 0.0;
  }

  fragColor = vec4(color * t, mix(0.89, 1.0, t));
}`;
