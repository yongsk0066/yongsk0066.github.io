import { expect, test } from '@playwright/test';
import { ClothSim, PAPER_PARAMS } from '../../src/components/calendar/vendor/holocloth/cloth';

test('each paper quad alternates its shared hinge and keeps both faces pointing forward', () => {
  const paper = new ClothSim(4, 5, 7, 6);
  const indices = paper.triangleIndices;
  expect(indices.length).toBe(6 * paper.segX * paper.segY);
  for (let y = 0; y < paper.segY; y++) {
    for (let x = 0; x < paper.segX; x++) {
      const offset = 6 * (y * paper.segX + x);
      const topLeft = y * paper.cols + x, bottomLeft = topLeft + paper.cols;
      const tri = indices.slice(offset, offset + 3);
      const shared = indices.slice(offset + 3, offset + 6).filter(id => tri.includes(id));
      const diagonal = (x + y) % 2 === 0 ? [bottomLeft, topLeft + 1] : [topLeft, bottomLeft + 1];
      expect(new Set(shared)).toEqual(new Set(diagonal));
      for (const start of [offset, offset + 3]) {
        const [a, b, c] = indices.slice(start, start + 3).map(id => id * 3);
        const p = paper.positions;
        expect((p[b]-p[a])*(p[c+1]-p[a+1]) - (p[b+1]-p[a+1])*(p[c]-p[a])).toBeGreaterThan(0);
      }
    }
  }
});

test('fold, release and wall contact produce the same material state at 30, 60 and 120 Hz', () => {
  function replay(hz: number) {
    const sim = new ClothSim(4, 5, 8, 10);
    const pins = sim.positions.slice(0, 3 * sim.cols);
    expect(sim.startGrab({x: 1.5, y: -2, z: 0}, .42)).toBe(true);
    for (let i = 0; i < 2 * hz; i++) {
      if (i === hz / 2) sim.moveGrab({x: -.75, y: .5, z: -.3});
      if (i === hz) sim.endGrab();
      sim.step(1 / hz, PAPER_PARAMS, -.028);
      for (let z = 2; z < sim.positions.length; z += 3) {
        if (sim.positions[z] < Math.fround(-.028)) throw Error('paper passed through wall');
      }
    }
    expect(sim.positions.slice(0, pins.length)).toEqual(pins);
    return Buffer.from(sim.saveMotion().buffer);
  }
  const reference = replay(120);
  expect(replay(30).equals(reference)).toBe(true);
  expect(replay(60).equals(reference)).toBe(true);
});

test('a late frame runs at most four substeps and retains at most four more', () => {
  const delayed = new ClothSim(4, 5, 8, 10), regular = new ClothSim(4, 5, 8, 10);
  delayed.step(2, PAPER_PARAMS);
  for (let i = 0; i < 4; i++) regular.step(1 / 120, PAPER_PARAMS);
  expect(Buffer.from(delayed.saveMotion().buffer).equals(Buffer.from(regular.saveMotion().buffer))).toBe(true);
  delayed.step(0, PAPER_PARAMS);
  for (let i = 0; i < 4; i++) regular.step(1 / 120, PAPER_PARAMS);
  expect(Buffer.from(delayed.saveMotion().buffer).equals(Buffer.from(regular.saveMotion().buffer))).toBe(true);
  expect(delayed.saveMotion().accumulator).toBeCloseTo(0, 12);
});
