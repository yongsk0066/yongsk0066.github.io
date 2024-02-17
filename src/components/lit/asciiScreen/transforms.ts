export interface TransformProps {
  x: number;
  y: number;
  cx: number;
  cy: number;
  time: number;
}

export type Transform = (props: TransformProps) => [number, number];

export const spiral: Transform = ({ x, y, cx, cy, time }) => {
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx ** 2 + dy ** 2);
  const currAngle = Math.atan2(dy, dx);
  const newAngle = currAngle - Math.sqrt(dist) * time * 0.1;
  const tx = cx + Math.cos(newAngle) * dist;
  const ty = cy + Math.sin(newAngle) * dist;

  return [tx, ty];
};

export const wave: Transform = ({ x, y, time }) => {
  const waveSpeed = 2;
  const waveHeight = Math.sin(x * 10 + time * waveSpeed);
  return [x, y + waveHeight * 0.05];
};

export const zoom: Transform = ({ x, y, cx, cy, time }) => {
  const scale = Math.sin(time) * 0.5 + 1;
  const dx = x - cx;
  const dy = y - cy;
  const tx = cx + dx * scale;
  const ty = cy + dy * scale;
  return [tx, ty];
};

export const shake: Transform = ({ x, y, time }) => {
  const shakeIntensity = Math.sin(time * 10) * 0.1;
  return [x + shakeIntensity, y];
};

export const rotate: Transform = ({ x, y, cx, cy, time }) => {
  const angle = time * 0.1;
  const dx = x - cx;
  const dy = y - cy;
  const tx = cx + dx * Math.cos(angle) - dy * Math.sin(angle);
  const ty = cy + dx * Math.sin(angle) + dy * Math.cos(angle);
  return [tx, ty];
};

export const transformMap = {
  spiral,
  wave,
  zoom,
  shake,
  rotate,
};

export type TransformKey = keyof typeof transformMap;

export const keyToTransform = (transforms: (keyof typeof transformMap)[]) => {
  return transforms.map((t) => transformMap[t]);
};
