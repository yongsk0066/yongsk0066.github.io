import type { ClothSim, ClothPhysicsParams } from './vendor/holocloth/cloth';
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
        if (data.generation === this.generation) this.result = data;
        else this.spare = data.state.buffer;
        this.wake();
      };
      this.send({type:'init', width:sim.width, height:sim.height, segX:sim.segX, segY:sim.segY});
    } catch { this.fallback(); }
  }

  private send(message: PhysicsRequest, transfer: Transferable[] = []) {
    this.worker!.postMessage(message, transfer);
  }

  private fallback() {
    if (this.busy && this.sentGeneration === this.generation) this.elapsed += this.sentTime;
    this.worker?.terminate();
    this.worker = undefined;
    this.ready = this.busy = false;
    this.wake();
  }

  interrupt() {
    this.generation++;
    this.regionChanged = true;
    this.elapsed = 0;
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
    this.elapsed = Math.min(this.elapsed + dt, .033);
    if (this.busy) return delta;
    const elapsed = this.elapsed;
    this.elapsed = 0;
    if (this.ready && this.worker) {
      const state = this.sim.saveMotion(this.spare);
      this.spare = undefined;
      try {
        this.send({type:'step', generation:this.generation, state, dt:elapsed, params, wall,
          region:this.regionChanged ? this.sim.grabRegion : undefined, cursor:this.sim.grabCursor}, [state.buffer]);
        this.regionChanged = false;
        this.sentTime = elapsed;
        this.sentGeneration = this.generation;
        this.busy = true;
        return delta;
      } catch { this.fallback(); }
    }
    this.previous.set(this.sim.positions);
    this.sim.step(elapsed, params);
    if (wall !== undefined) this.sim.constrainWall(wall);
    let change = delta ?? 0;
    for (let i = 0; i < this.previous.length; i++) change = Math.max(change, Math.abs(this.sim.positions[i] - this.previous[i]));
    return change;
  }

  dispose() { this.worker?.terminate(); }
}
