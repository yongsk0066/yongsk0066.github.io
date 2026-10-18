/** Pure models shared by the diagrams and their numerical checks. */
export function chsh(answers: readonly number[]) {
  const [a0, a1, b0, b1] = answers;
  const wins = [a0 === b0, a0 === b1, a1 === b0, a1 !== b1];
  const signed =
    (1 - 2 * a0) * (1 - 2 * b0) +
    (1 - 2 * a0) * (1 - 2 * b1) +
    (1 - 2 * a1) * (1 - 2 * b0) -
    (1 - 2 * a1) * (1 - 2 * b1);
  return { wins, signed, probability: wins.filter(Boolean).length / 4 };
}

export function cantor(stage: number): [number, number][] {
  let segments: [number, number][] = [[0, 1]];
  for (let n = 0; n < stage; n++) {
    segments = segments.flatMap(([a, b]) => {
      const third = (b - a) / 3;
      return [
        [a, a + third],
        [b - third, b],
      ] as [number, number][];
    });
  }
  return segments;
}

export function bloch(theta: number, phi: number) {
  const t = (theta * Math.PI) / 180;
  const p = (phi * Math.PI) / 180;
  return {
    x: Math.sin(t) * Math.cos(p),
    y: Math.sin(t) * Math.sin(p),
    z: Math.cos(t),
    p0: Math.cos(t / 2) ** 2,
    p1: Math.sin(t / 2) ** 2,
  };
}

type State = [number, number, number];
const flow = ([x, y, z]: State): State => [
  10 * (y - x),
  x * (28 - z) - y,
  x * y - (8 * z) / 3,
];
const advance = (q: State, v: State, dt: number): State =>
  q.map((x, i) => x + v[i] * dt) as State;

/** Lorenz system, RK4, dt=.005; samples include t=0 after the warmup. */
export function lorenz(
  initial: State = [1, 1, 1],
  warmup = 20,
  duration = 50
): State[] {
  let q: State = [...initial];
  const dt = 0.005;
  const step = (state: State): State => {
    const k1 = flow(state);
    const k2 = flow(advance(state, k1, dt / 2));
    const k3 = flow(advance(state, k2, dt / 2));
    const k4 = flow(advance(state, k3, dt));
    return state.map(
      (x, j) => x + (dt * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j])) / 6
    ) as State;
  };
  for (let i = 0; i < Math.round(warmup / dt); i++) q = step(q);
  const points: State[] = [q];
  for (let i = 1; i <= Math.round(duration / dt); i++) {
    q = step(q);
    if (i % 4 === 0) points.push(q);
  }
  return points;
}
