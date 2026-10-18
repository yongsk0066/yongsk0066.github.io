import test from "node:test";
import assert from "node:assert/strict";
import { bloch, cantor, chsh, lorenz } from "./physics.ts";

test("all 16 local answer sheets obey CHSH and the signed winning-probability identity", () => {
  const rates = new Set();
  for (let bits = 0; bits < 16; bits++) {
    const answer = Array.from({ length: 4 }, (_, i) => (bits >> i) & 1);
    const result = chsh(answer);
    assert.equal(Math.abs(result.signed), 2);
    assert.equal(result.probability, 0.5 + result.signed / 8);
    assert.ok(result.probability <= 0.75);
    rates.add(result.probability);
  }
  assert.deepEqual([...rates].sort(), [0.25, 0.75]);
});

test("Cantor stages keep endpoints, disjoint intervals and the expected total length", () => {
  for (let n = 0; n <= 5; n++) {
    const intervals = cantor(n);
    assert.equal(intervals.length, 2 ** n);
    assert.equal(intervals[0][0], 0);
    assert.equal(intervals.at(-1)[1], 1);
    let length = 0;
    intervals.forEach(([a, b], i) => {
      assert.ok(Math.abs(b - a - 3 ** -n) < 1e-12);
      if (i) assert.ok(intervals[i - 1][1] < a);
      length += b - a;
    });
    assert.ok(Math.abs(length - (2 / 3) ** n) < 1e-12);
  }
});

test("Bloch vectors have unit norm and z measurement probabilities ignore azimuth", () => {
  for (const theta of [0, 30, 60, 90, 150, 180]) {
    for (const phi of [0, 45, 90, 180, 360]) {
      const v = bloch(theta, phi);
      assert.ok(Math.abs(v.x ** 2 + v.y ** 2 + v.z ** 2 - 1) < 1e-12);
      assert.ok(Math.abs(v.p0 + v.p1 - 1) < 1e-12);
      assert.equal(v.p0, bloch(theta, 0).p0);
    }
  }
  assert.equal(bloch(0, 0).p0, 1);
  assert.ok(bloch(180, 0).p0 < 1e-12);
  // The lesson's two presets: same z statistics, opposite x statistics.
  const plus = bloch(90, 0),
    minus = bloch(90, 180);
  assert.equal(plus.p0, minus.p0);
  assert.ok(Math.abs((1 + plus.x) / 2 - 1) < 1e-12);
  assert.ok(Math.abs((1 + minus.x) / 2) < 1e-12);
});

test("Lorenz trajectory is reproducible, finite and stays inside the diagram's bounds", () => {
  const points = lorenz();
  assert.equal(points.length, 2501);
  assert.deepEqual(points, lorenz());
  assert.ok(
    points.every(
      ([x, y, z]) =>
        Number.isFinite(x + y + z) &&
        Math.abs(x) < 22 &&
        Math.abs(y) < 35 &&
        z > 0 &&
        z < 55
    )
  );
});

test("Lorenz integration includes the chosen initial state and preserves analytical equilibria", () => {
  const edge = Math.sqrt((8 / 3) * (28 - 1));
  for (const initial of [
    [0, 0, 0],
    [edge, edge, 27],
    [-edge, -edge, 27],
  ]) {
    const points = lorenz(initial, 0, 2);
    assert.equal(points.length, 101);
    assert.deepEqual(points[0], initial);
    assert.ok(
      points.every(
        (q) => Math.hypot(...q.map((v, i) => v - initial[i])) < 1e-10
      )
    );
  }
});

test("the illustrated nearby Lorenz states start one millionth apart and separate under the same flow", () => {
  const start = lorenz()[0];
  const perturbed = [start[0] + 1e-6, start[1], start[2]];
  const a = lorenz(start, 0, 30);
  const b = lorenz(perturbed, 0, 30);
  const distance = (i) =>
    Math.hypot(...a[i].map((value, j) => value - b[i][j]));
  assert.deepEqual(a[0], start);
  assert.deepEqual(b[0], perturbed);
  assert.equal(a.length, 1501);
  assert.equal(b.length, a.length);
  assert.ok(Math.abs(distance(0) - 1e-6) < 1e-14);
  assert.ok(distance(500) < 0.01); // t=10: still close at the diagram's scale.
  assert.ok(distance(1000) > 1); // t=20: same-time states have visibly separated.
  assert.deepEqual(a, lorenz(start, 0, 30));
  for (const points of [a, b]) {
    assert.ok(
      points.every(
        ([x, y, z]) =>
          Number.isFinite(x + y + z) &&
          Math.abs(x) < 22 &&
          Math.abs(y) < 35 &&
          z > 0 &&
          z < 55
      )
    );
  }
});
