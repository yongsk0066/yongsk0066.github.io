import { expect, test } from '@playwright/test';
import { PaperPhysics } from '../../src/components/calendar/paper-physics';
import { ClothSim, PAPER_PARAMS } from '../../src/components/calendar/vendor/holocloth/cloth';
import type { PhysicsReply, PhysicsRequest } from '../../src/components/calendar/physics-worker';

type Step = Extract<PhysicsRequest, {type: 'step'}>;
let worker: ControlledWorker;

class ControlledWorker {
  steps: Step[] = [];
  onmessage!: (event: {data: PhysicsReply}) => void;
  constructor() { worker = this; }
  postMessage(request: PhysicsRequest, transfer: ArrayBuffer[]) {
    if (request.type === 'step') this.steps.push(structuredClone(request, {transfer}));
  }
  finish(step: Step, position: number) {
    new Float32Array(step.state.buffer)[17] = position;
    this.onmessage({data: {type:'pose', generation:step.generation, state:step.state, delta:1}});
  }
  terminate() {}
}

const original = Object.getOwnPropertyDescriptor(globalThis, 'Worker');
test.beforeEach(() => Object.defineProperty(globalThis, 'Worker', {value:ControlledWorker, configurable:true}));
test.afterEach(() => {
  if (original) Object.defineProperty(globalThis, 'Worker', original);
  else Reflect.deleteProperty(globalThis, 'Worker');
});

test('pending input starts on reply while the last completed pose remains available to display', () => {
  const sim = new ClothSim(4, 5, 3, 4), physics = new PaperPhysics(sim, true, () => {});
  worker.onmessage({data:{type:'ready'}});
  physics.step(1/60, PAPER_PARAMS);
  physics.step(1/120, PAPER_PARAMS);
  worker.finish(worker.steps[0], .25);
  expect(worker.steps).toHaveLength(2);
  expect(worker.steps[1].dt).toBe(1/120);
  expect(new Float32Array(worker.steps[1].state.buffer)[17]).toBe(.25);
  expect(sim.positions[17]).toBe(0);
  physics.step(0, PAPER_PARAMS);
  expect(sim.positions[17]).toBe(.25);
  worker.finish(worker.steps[1], .5);
  expect(worker.steps).toHaveLength(2);
  physics.step(1/60, PAPER_PARAMS);
  expect(sim.positions[17]).toBe(.5);
  physics.dispose();
});

test('an interrupted grab discards its outstanding pose and all its queued time', () => {
  const sim = new ClothSim(4, 5, 3, 4), physics = new PaperPhysics(sim, true, () => {});
  worker.onmessage({data:{type:'ready'}});
  physics.step(1/60, PAPER_PARAMS);
  physics.step(1/30, PAPER_PARAMS);
  physics.interrupt();
  worker.finish(worker.steps[0], 1);
  expect(worker.steps).toHaveLength(1);
  physics.step(1/120, PAPER_PARAMS);
  expect(worker.steps[1].dt).toBe(1/120);
  expect(new Float32Array(worker.steps[1].state.buffer)[17]).toBe(0);
  expect(sim.positions[17]).toBe(0);
  physics.dispose();
});
