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

export const hurricane: Transform = ({ x, y, cx, cy, time }) => {
  const angle = time * 0.1;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx ** 2 + dy ** 2);
  const tx = cx + dx * Math.cos(angle) - dy * Math.sin(angle) * dist * 0.01;
  const ty = cy + dx * Math.sin(angle) + dy * Math.cos(angle) * dist * 0.01;
  return [tx, ty];
};

export const celestialOrbit: Transform = ({ x, y, cx, cy, time }) => {
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx ** 2 + dy ** 2);
  const initialAngle = Math.atan2(dy, dx);
  const period = 2 * Math.PI; // 한 바퀴 도는데 필요한 시간
  const orbitSpeed = 1; // 궤도 속도 조절 변수

  // 타원 궤도의 장축과 단축을 설정하여 더 다양한 궤도 생성
  const majorAxis = dist;
  const minorAxis = dist * 0.6;
  const angle = initialAngle + ((time * orbitSpeed) % period);

  const tx = cx + Math.cos(angle) * majorAxis;
  const ty = cy + Math.sin(angle) * minorAxis;
  return [tx, ty];
};

export const fractalMotion: Transform = ({ x, y, cx, cy, time }) => {
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx ** 2 + dy ** 2);
  const initialAngle = Math.atan2(dy, dx);
  const fractalScale = Math.sin(time) * 0.5 + 1.5; // 프랙탈 스케일 조정
  const angle = initialAngle + Math.sin(time * 0.5) * 2 * Math.PI; // 프랙탈 회전 동작

  const tx = cx + Math.cos(angle) * dist * fractalScale;
  const ty = cy + Math.sin(angle) * dist * fractalScale;
  return [tx, ty];
};

export const transformMap = {
  spiral,
  wave,
  zoom,
  shake,
  rotate,
  hurricane,
  celestialOrbit,
  fractalMotion,
};

export type TransformKey = keyof typeof transformMap;

export const keyToTransform = (transforms: (keyof typeof transformMap)[]) => {
  return transforms.map((t) => transformMap[t]);
};
