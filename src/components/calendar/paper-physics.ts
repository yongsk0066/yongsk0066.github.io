import { MAX_PHYSICS_BACKLOG, type ClothSim, type ClothPhysicsParams, type MotionSnapshot } from './vendor/holocloth/cloth';
import type { PhysicsReply, PhysicsRequest } from './physics-worker';

/** The displayed solver remains a complete recovery point, including spring memory. */
export class PaperPhysics {
  private worker?: Worker;
  private ready = false;
  private busy = false;
  private regionChanged = true;
  private generation = 0;
  private elapsed = 0;
  private sentTime = 0;
  private sentGeneration = 0;
  private pendingParams?: ClothPhysicsParams;
  private pendingWall?: number;
  private spare?: ArrayBuffer;
  private result?: Extract<PhysicsReply, {type:'pose'}>;
  private previous: Float32Array;

  constructor(private sim: ClothSim, enabled: boolean, private wake: () => void) {
    this.previous = new Float32Array(sim.positions.length);
    if (!enabled || typeof Worker === 'undefined') return;
    try {
      this.worker = new Worker(new URL('./physics-worker.ts', import.meta.url), {type:'module', name:'calendar-physics'});
      this.worker.onerror = e => { e.preventDefault(); this.fallback(); };
      this.worker.onmessageerror = () => this.fallback();
      this.worker.onmessage = ({data}: MessageEvent<PhysicsReply>) => {
        if (data.type === 'ready') { this.ready = true; return; }
        this.busy = false;
        if (data.generation === this.generation) {
          if (this.result) {
            this.spare = this.result.state.buffer;
            data.delta += this.result.delta;
          }
          this.result = data;
          // A display tick may already have supplied the next input while this pose was in flight.
          // Keep the completed pose available to draw while the Worker advances from it.
          if (this.pendingParams && this.elapsed > 0) {
            const params = this.pendingParams;
            this.pendingParams = undefined;
            if (this.sendStep(this.elapsed, params, this.pendingWall, data.state)) this.elapsed = 0;
          }
        } else this.spare = data.state.buffer;
        this.wake();
      };
      this.send({type:'init', width:sim.width, height:sim.height, segX:sim.segX, segY:sim.segY});
    } catch { this.fallback(); }
  }

  private send(message: PhysicsRequest, transfer: Transferable[] = []) {
    this.worker!.postMessage(message, transfer);
  }

  private sendStep(dt: number, params: ClothPhysicsParams, wall?: number, completed?: MotionSnapshot) {
    let state: MotionSnapshot;
    if (completed) {
      const buffer = this.spare ?? new ArrayBuffer(completed.buffer.byteLength);
      new Uint8Array(buffer).set(new Uint8Array(completed.buffer));
      state = {...completed, buffer};
    } else {
      state = this.sim.saveMotion(this.spare);
    }
    this.spare = undefined;
    try {
      this.send({type:'step', generation:this.generation, state, dt, params, wall,
        region:this.regionChanged ? this.sim.grabRegion : undefined, cursor:this.sim.grabCursor}, [state.buffer]);
      this.regionChanged = false;
      this.sentTime = dt;
      this.sentGeneration = this.generation;
      this.busy = true;
      return true;
    } catch {
      this.fallback();
      return false;
    }
  }

  private fallback() {
    if (this.busy && this.sentGeneration === this.generation) this.elapsed += this.sentTime;
    this.worker?.terminate();
    this.worker = undefined;
    this.ready = this.busy = false;
    this.pendingParams = undefined;
    this.wake();
  }

  interrupt() {
    this.generation++;
    this.regionChanged = true;
    this.elapsed = 0;
    this.pendingParams = undefined;
    if (this.result) this.spare = this.result.state.buffer;
    this.result = undefined;
  }

  step(dt: number, params: ClothPhysicsParams, wall?: number) {
    let delta: number | undefined;
    if (this.result) {
      this.sim.restoreMotion(this.result.state);
      delta = this.result.delta;
      this.spare = this.result.state.buffer;
      this.result = undefined;
    }
    this.elapsed = Math.min(this.elapsed + Math.min(Math.max(0, dt), .05), MAX_PHYSICS_BACKLOG);
    if (this.busy) {
      this.pendingParams = params;
      this.pendingWall = wall;
      return delta;
    }
    const elapsed = this.elapsed;
    this.elapsed = 0;
    this.pendingParams = undefined;
    if (this.ready && this.worker && this.sendStep(elapsed, params, wall)) return delta;
    this.previous.set(this.sim.positions);
    this.sim.step(elapsed, params, wall);
    let change = delta ?? 0;
    for (let i = 0; i < this.previous.length; i++) change = Math.max(change, Math.abs(this.sim.positions[i] - this.previous[i]));
    return change;
  }

  dispose() { this.worker?.terminate(); }
}
