import { ClothSim, type ClothPhysicsParams, type GrabRegion, type MotionSnapshot, type PaperPoint } from './vendor/holocloth/cloth';

export type PhysicsRequest =
  | {type:'init'; width:number; height:number; segX:number; segY:number}
  | {type:'step'; generation:number; state:MotionSnapshot; region?:GrabRegion|null;
     cursor?:PaperPoint; dt:number; params:ClothPhysicsParams; wall?:number};
export type PhysicsReply =
  | {type:'ready'}
  | {type:'pose'; generation:number; state:MotionSnapshot; delta:number};

let sim: ClothSim;
self.onmessage = ({data}: MessageEvent<PhysicsRequest>) => {
  if (data.type === 'init') {
    sim = new ClothSim(data.width, data.height, data.segX, data.segY);
    self.postMessage({type:'ready'} satisfies PhysicsReply);
    return;
  }
  if (data.region !== undefined) sim.setGrabRegion(data.region);
  sim.restoreMotion(data.state);
  if (data.cursor) sim.moveGrab(data.cursor);
  sim.step(data.dt, data.params);
  if (data.wall !== undefined) sim.constrainWall(data.wall);
  const previous = new Float32Array(data.state.buffer, 0, sim.positions.length);
  let delta = 0;
  for (let i = 0; i < previous.length; i++) delta = Math.max(delta, Math.abs(previous[i] - sim.positions[i]));
  const state = sim.saveMotion(data.state.buffer);
  const reply: PhysicsReply = {type:'pose', generation:data.generation, state, delta};
  self.postMessage(reply, {transfer:[state.buffer]});
};
