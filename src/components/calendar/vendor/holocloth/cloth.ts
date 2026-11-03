import * as THREE from 'three';
// Adapted from holocloth a6078ba: flat paper, gravity, pinned top edge. MIT.

export interface ClothPhysicsParams {
  viscosity: number;
  iterations: number;
  /** Normalized elastic compliances, not measured paper constants. */
  stretchCompliance: number;
  bendCompliance: number;
  /** Across-grain / along-grain bending ratio. */
  grainRatio: number;
  memoryRate: number;
  memoryFraction: number;
  relaxationTime: number;
  relaxationPower: number;
  yieldCurvature: number;
  plasticRate: number;
  grabCompliance: number;
}

export const PAPER_PARAMS: ClothPhysicsParams = {
  viscosity:.075, iterations:20, stretchCompliance:1e-8,
  // Softer bending, not softer in-plane metric. Visual thin-paper calibration.
  bendCompliance:0.0012, grainRatio:1.6,
  memoryRate:1.2, memoryFraction:.55, relaxationTime:1.5,
  relaxationPower:.45, yieldCurvature:1.5, plasticRate:1.8,
  grabCompliance:.0015,
};

interface GrabState {
  indices: number[];
  weights: number[];
  /** offset of each grabbed vertex from the grab origin, 3 floats per entry */
  offsets: Float32Array;
  target: THREE.Vector3;
  cursor: THREE.Vector3;
  lambda: Float64Array;
}

const SUBSTEP = 1 / 120;
const MAX_SUBSTEPS = 4;

/** Holocloth Verlet integration, grid topology and weighted grabs, extended with
 * XPBD membrane constraints and elastic dihedral hinges for thin paper.
 * Top row has zero inverse mass. Viscoelastic rest-angle memory and yielding
 * are reduced-order approximations; no self-collision or adaptive remeshing.
 */
export class ClothSim {
  readonly cols: number;
  readonly rows: number;
  readonly count: number;
  readonly positions: Float32Array;
  private prev: Float32Array;
  private rest: Float32Array;

  // constraints as flat arrays: [ia, ib] pairs + rest length + strength mul
  private cA: Int32Array;
  private cB: Int32Array;
  private cRest: Float32Array;
  private cMul: Float32Array;
  private stretchLambda: Float64Array;
  private stretchAlpha: Float64Array;
  private cachedStretchCompliance = NaN;
  private hinges: Int32Array;
  private hingeLambda: Float64Array;
  private hingeScale: Float64Array;
  private memoryAngle: Float64Array;
  private plasticAngle: Float64Array;
  private releaseAge: Float64Array;
  private hingeSpan: Float64Array;
  private hingeGrain: Float64Array;
  private bendAlpha: Float64Array;
  private gradient = new Float64Array(12);


  /** 4-neighborhood for laplacian smoothing: -1 padded */
  private neighbors: Int32Array;

  private grab: GrabState | null = null;
  private accumulator = 0;

  constructor(
    readonly width: number,
    readonly height: number,
    readonly segX: number,
    readonly segY: number,
  ) {
    this.cols = segX + 1;
    this.rows = segY + 1;
    this.count = this.cols * this.rows;
    this.positions = new Float32Array(this.count * 3);
    this.prev = new Float32Array(this.count * 3);
    this.rest = new Float32Array(this.count * 3);

    this.initPositions();

    // Structural + both shear diagonals preserve printed cell shape; bending is separate.
    const a: number[] = [];
    const b: number[] = [];
    const mul: number[] = [];
    const idx = (x: number, y: number) => y * this.cols + x;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (x + 1 < this.cols) { a.push(idx(x, y)); b.push(idx(x + 1, y)); mul.push(1.0); }
        if (y + 1 < this.rows) { a.push(idx(x, y)); b.push(idx(x, y + 1)); mul.push(1.0); }
        if (x + 1 < this.cols && y + 1 < this.rows) {
          a.push(idx(x, y)); b.push(idx(x + 1, y + 1)); mul.push(0.85);
          a.push(idx(x + 1, y)); b.push(idx(x, y + 1)); mul.push(0.85);
        }
      }
    }
    this.cA = new Int32Array(a);
    this.cB = new Int32Array(b);
    this.cMul = new Float32Array(mul);
    this.cRest = new Float32Array(a.length);
    this.computeRestLengths();
    this.stretchLambda = new Float64Array(a.length);
    this.stretchAlpha = new Float64Array(a.length);
    // Match THREE.PlaneGeometry triangles; each shared edge has a signed hinge.
    const edges = new Map<string, number[]>(), hinges:number[]=[];
    const face=(a:number,b:number,c:number)=>{
      for(const [u,v,o] of [[a,b,c],[b,c,a],[c,a,b]]){
        const key=Math.min(u,v)+':'+Math.max(u,v),other=edges.get(key);
        if(other) hinges.push(other[2],o,other[0],other[1]);
        else edges.set(key,[u,v,o]);
      }
    };
    for(let y=0;y<segY;y++)for(let x=0;x<segX;x++){
      const a=idx(x,y),b=idx(x,y+1),c=idx(x+1,y+1),d=idx(x+1,y);
      face(a,b,d);face(b,c,d);
    }
    this.hinges=new Int32Array(hinges);
    this.hingeLambda=new Float64Array(hinges.length/4);
    this.hingeScale=new Float64Array(hinges.length/4);
    this.memoryAngle=new Float64Array(hinges.length/4);
    this.plasticAngle=new Float64Array(hinges.length/4);
    this.releaseAge=new Float64Array(hinges.length/4);
    this.hingeSpan=new Float64Array(hinges.length/4);
    this.hingeGrain=new Float64Array(hinges.length/4);
    this.bendAlpha=new Float64Array(hinges.length/4);
    const area=(width/segX)*(height/segY);
    for(let h=0;h<this.hingeScale.length;h++){
      const a=hinges[h*4+2]*3,b=hinges[h*4+3]*3;
      const dx=this.rest[a]-this.rest[b],dy=this.rest[a+1]-this.rest[b+1];
      this.hingeScale[h]=(dx*dx+dy*dy)/area;
      this.hingeSpan[h]=area/Math.hypot(dx,dy);
      this.hingeGrain[h]=dy*dy/(dx*dx+dy*dy);
    }

    this.neighbors = new Int32Array(this.count * 4).fill(-1);
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const i = idx(x, y) * 4;
        this.neighbors[i + 0] = x > 0 ? idx(x - 1, y) : -1;
        this.neighbors[i + 1] = x + 1 < this.cols ? idx(x + 1, y) : -1;
        this.neighbors[i + 2] = y > 0 ? idx(x, y - 1) : -1;
        this.neighbors[i + 3] = y + 1 < this.rows ? idx(x, y + 1) : -1;
      }
    }
  }

  /** Stress-free flat sheet. */
  private initPositions() {
    for(let y=0;y<this.rows;y++) for(let x=0;x<this.cols;x++) {
      const k=(y*this.cols+x)*3;
      this.positions[k]=(x/this.segX-.5)*this.width;
      this.positions[k+1]=(.5-y/this.segY)*this.height;
      this.positions[k+2]=0;
    }
    this.prev.set(this.positions);
    this.rest.set(this.positions);
  }

  private computeRestLengths() {
    // rest lengths come from the flat, unbillowed grid so the cloth
    // relaxes toward its true rectangle
    const stepX = this.width / this.segX;
    const stepY = this.height / this.segY;
    for (let c = 0; c < this.cA.length; c++) {
      const ia = this.cA[c], ib = this.cB[c];
      const ax = ia % this.cols, ay = Math.floor(ia / this.cols);
      const bx = ib % this.cols, by = Math.floor(ib / this.cols);
      const dx = (ax - bx) * stepX;
      const dy = (ay - by) * stepY;
      this.cRest[c] = Math.hypot(dx, dy);
    }
  }

  reset() {
    this.memoryAngle.fill(0);this.plasticAngle.fill(0);this.releaseAge.fill(0);
    this.initPositions();
    this.grab = null;
    this.accumulator = 0;
  }

  /** Give a random gentle impulse — a "poke" from nowhere. */
  poke(strength = 0.5) {
    const p = this.positions;
    const ci = Math.floor(Math.random() * this.count);
    const cx = p[ci * 3], cy = p[ci * 3 + 1], cz = p[ci * 3 + 2];
    const dir = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5,
    ).normalize().multiplyScalar(strength * 0.09);
    const radius = Math.max(this.width, this.height) * 0.28;
    for (let i = this.cols; i < this.count; i++) {
      const dx = p[i * 3] - cx, dy = p[i * 3 + 1] - cy, dz = p[i * 3 + 2] - cz;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > radius) continue;
      const w = 1 - d / radius;
      const s = w * w * (3 - 2 * w); // smoothstep
      this.prev[i * 3] -= dir.x * s;
      this.prev[i * 3 + 1] -= dir.y * s;
      this.prev[i * 3 + 2] -= dir.z * s;
    }
  }

  /** Begin a grab around a world-space point. Returns false if nothing near. */
  startGrab(point: THREE.Vector3, radius: number): boolean {
    const p = this.positions;
    const indices: number[] = [];
    const weights: number[] = [];
    const offsets: number[] = [];
    let best = Infinity;
    for (let i = this.cols; i < this.count; i++) {
      const dx = p[i * 3] - point.x;
      const dy = p[i * 3 + 1] - point.y;
      const dz = p[i * 3 + 2] - point.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      best = Math.min(best, d);
      if (d > radius) continue;
      const t = 1 - d / radius;
      const w = t * t * (3 - 2 * t);
      indices.push(i);
      weights.push(w);
      offsets.push(dx, dy, dz);
    }
    if (indices.length === 0 || best > radius) return false;
    this.grab = {
      indices,
      weights,
      offsets: new Float32Array(offsets),
      target: point.clone(),
      cursor: point.clone(),
      lambda: new Float64Array(indices.length*3),
    };
    return true;
  }

  moveGrab(target: THREE.Vector3) {
    if (this.grab && [target.x,target.y,target.z].every(Number.isFinite)) this.grab.cursor.copy(target);
  }

  endGrab() {
    this.grab = null;
  }

  get isGrabbing() {
    return this.grab !== null;
  }

  private cavityScratch: Float32Array | null = null;

  /**
   * Per-vertex cavity term for ambient occlusion: how deeply a vertex sits
   * inside a concave fold. Uses the discrete Laplacian projected onto the
   * vertex normal — concave (valley) vertices score > 0 — then one smoothing
   * pass to avoid grid artifacts. Writes [0,1] into `out`.
   */
  computeCavity(normals: ArrayLike<number>, out: Float32Array, gain = 6) {
    const p = this.positions;
    const nb = this.neighbors;
    const n = this.count;
    const invStep = 1 / Math.min(this.width / this.segX, this.height / this.segY);
    if (!this.cavityScratch || this.cavityScratch.length < n) {
      this.cavityScratch = new Float32Array(n);
    }
    const tmp = this.cavityScratch;
    for (let i = 0; i < n; i++) {
      let ax = 0, ay = 0, az = 0, cnt = 0;
      for (let j = 0; j < 4; j++) {
        const ni = nb[i * 4 + j];
        if (ni < 0) continue;
        ax += p[ni * 3]; ay += p[ni * 3 + 1]; az += p[ni * 3 + 2];
        cnt++;
      }
      if (cnt === 0) { tmp[i] = 0; continue; }
      const inv = 1 / cnt;
      const lx = ax * inv - p[i * 3];
      const ly = ay * inv - p[i * 3 + 1];
      const lz = az * inv - p[i * 3 + 2];
      const c = (lx * normals[i * 3] + ly * normals[i * 3 + 1] + lz * normals[i * 3 + 2]) * invStep;
      tmp[i] = Math.min(1, Math.max(0, c * gain));
    }
    // soften: blend each vertex with its neighborhood average
    for (let i = 0; i < n; i++) {
      let sum = 0, cnt = 0;
      for (let j = 0; j < 4; j++) {
        const ni = nb[i * 4 + j];
        if (ni < 0) continue;
        sum += tmp[ni];
        cnt++;
      }
      out[i] = cnt > 0 ? tmp[i] * 0.5 + (sum / cnt) * 0.5 : tmp[i];
    }
  }

  step(dt: number, params: ClothPhysicsParams) {
    // Preserve the original Float64 expression and invalidate on live parameter edits.
    if (params.stretchCompliance !== this.cachedStretchCompliance) {
      for (let c = 0; c < this.stretchAlpha.length; c++)
        this.stretchAlpha[c] = params.stretchCompliance / (SUBSTEP * SUBSTEP * this.cMul[c]);
      this.cachedStretchCompliance = params.stretchCompliance;
    }
    this.accumulator += Math.min(dt, 0.05);
    let steps = 0;
    while (this.accumulator >= SUBSTEP && steps < MAX_SUBSTEPS) {
      this.substep(params);
      this.accumulator -= SUBSTEP;
      steps++;
    }
    if (steps === MAX_SUBSTEPS) this.accumulator = 0;
  }

  private substep(params: ClothPhysicsParams) {
    const p = this.positions;
    const prev = this.prev;
    const n = this.count;

    // integrate: damping expressed per 60Hz-frame, converted to substep rate
    const damp = Math.pow(1 - Math.min(params.viscosity, 0.99), SUBSTEP * 60);
    for (let i = this.cols * 3; i < n * 3; i++) {
      const cur = p[i];
      const vel = (cur - prev[i]) * damp;
      prev[i] = cur;
      p[i] = cur + vel + (i % 3 === 1 ? -2.5 * SUBSTEP * SUBSTEP : 0);
    }

    // Reset XPBD multipliers once per physical substep, never per iteration.
    this.stretchLambda.fill(0);this.hingeLambda.fill(0);
    if(this.grab){
      const g=this.grab;g.lambda.fill(0);
      // Input filtering is independent of slow material relaxation. The old
      // 3 units/s cap added ~330ms lag to a one-unit pointer movement.
      g.target.lerp(g.cursor,1-Math.exp(-SUBSTEP/.012));
    }
    // Rest geometry and damage do not change during relaxation iterations.
    for(let h=0;h<this.bendAlpha.length;h++){
      const grain=1+(params.grainRatio-1)*this.hingeGrain[h];
      const damage=Math.min(.65,Math.abs(this.plasticAngle[h])/this.hingeSpan[h]*.22);
      this.bendAlpha[h]=params.bendCompliance/(SUBSTEP*SUBSTEP*this.hingeScale[h]*grain*(1-damage));
    }
    const iters=Math.max(1,Math.round(params.iterations));
    for(let it=0;it<iters;it++){
      this.applyGrab(params);
      this.solveBending(params,it%2===1);
      // Finish with metric preservation, so grabbing cannot overwrite the paper.
      this.solveStretch(params,it%2===1);
      this.solveStretch(params,it%2===0);
      for(let k=0;k<this.cols*3;k++){p[k]=this.rest[k];prev[k]=this.rest[k];}
    }
    // Constitutive history evolves once per physical substep (not solver pass).
    this.updateMaterialHistory(params);
  }

  private updateMaterialHistory(params:ClothPhysicsParams){
    const memoryBlend=1-Math.exp(-params.memoryRate*SUBSTEP);
    const plasticBlend=1-Math.exp(-params.plasticRate*SUBSTEP);
    for(let h=0;h<this.hingeLambda.length;h++){
      const angle=this.hingeAngle(h,false);if(!Number.isFinite(angle))continue;
      const span=this.hingeSpan[h];
      const elastic=angle-this.plasticAngle[h];
      const loaded=this.isGrabbing && Math.abs(elastic)/span>.12;
      if(loaded){
        this.releaseAge[h]=0;
        const target=params.memoryFraction*elastic;
        this.memoryAngle[h]+=(target-this.memoryAngle[h])*memoryBlend;
        const yieldAngle=params.yieldCurvature*span;
        if(Math.abs(elastic)>yieldAngle){
          const flow=(elastic-Math.sign(elastic)*yieldAngle)*plasticBlend;
          this.plasticAngle[h]=Math.max(-1.25,Math.min(1.25,this.plasticAngle[h]+flow));
          this.memoryAngle[h]-=flow;
        }
      }else{
        const age=this.releaseAge[h],tau=params.relaxationTime;
        // Power-law recovery has a logarithmic clock: rapid early recovery,
        // then a long tail. Inspired by paper relaxation studies, not a fit.
        this.memoryAngle[h]*=Math.pow((tau+age)/(tau+age+SUBSTEP),params.relaxationPower);
        this.releaseAge[h]+=SUBSTEP;
      }
    }
  }

  private solveStretch(params:ClothPhysicsParams,reverse:boolean){
    const p=this.positions;
    for(let j=0;j<this.cA.length;j++){
      const c=reverse?this.cA.length-1-j:j;
      const a=this.cA[c],b=this.cB[c],ia=a*3,ib=b*3;
      const wa=a<this.cols?0:1,wb=b<this.cols?0:1;if(!wa&&!wb)continue;
      const dx=p[ib]-p[ia],dy=p[ib+1]-p[ia+1],dz=p[ib+2]-p[ia+2];
      // Float32 positions keep squared differences within Float64 range.
      const length=Math.sqrt(dx*dx+dy*dy+dz*dz);if(length<1e-9)continue;
      const alpha=this.stretchAlpha[c];
      const dl=(-(length-this.cRest[c])-alpha*this.stretchLambda[c])/(wa+wb+alpha);
      this.stretchLambda[c]+=dl;
      const scale=dl/length;
      p[ia]-=wa*scale*dx;p[ib]+=wb*scale*dx;
      p[ia+1]-=wa*scale*dy;p[ib+1]+=wb*scale*dy;
      p[ia+2]-=wa*scale*dz;p[ib+2]+=wb*scale*dz;
    }
  }

  /** Signed dihedral gradient (opposite vertices 0/1, shared edge 2/3).
   * Formulation reference: PositionBasedDynamics dihedral constraint, MIT.
   * atan2 keeps the sign continuous through the stress-free flat state.
   */
  private hingeAngle(h:number, withGradient=true){
    const p=this.positions,ids=this.hinges,g=this.gradient;
    const a=ids[h*4]*3,b=ids[h*4+1]*3,c=ids[h*4+2]*3,d=ids[h*4+3]*3;
    const ex=p[d]-p[c],ey=p[d+1]-p[c+1],ez=p[d+2]-p[c+2];
    const len=Math.sqrt(ex*ex+ey*ey+ez*ez);if(len<1e-8)return NaN;
    const ux=p[c]-p[a],uy=p[c+1]-p[a+1],uz=p[c+2]-p[a+2];
    const vx=p[d]-p[b],vy=p[d+1]-p[b+1],vz=p[d+2]-p[b+2];
    const nx=uy*ez-uz*ey,ny=uz*ex-ux*ez,nz=ux*ey-uy*ex;
    const mx=ey*vz-ez*vy,my=ez*vx-ex*vz,mz=ex*vy-ey*vx;
    const n2=nx*nx+ny*ny+nz*nz,m2=mx*mx+my*my+mz*mz;
    if(n2<1e-14||m2<1e-14)return NaN;
    if(withGradient){
      const t=((p[a]-p[d])*ex+(p[a+1]-p[d+1])*ey+(p[a+2]-p[d+2])*ez)/len;
      const u=((p[b]-p[d])*ex+(p[b+1]-p[d+1])*ey+(p[b+2]-p[d+2])*ez)/len;
      const v=(ux*ex+uy*ey+uz*ez)/len;
      const w=((p[c]-p[b])*ex+(p[c+1]-p[b+1])*ey+(p[c+2]-p[b+2])*ez)/len;
      // Avoid allocating two temporary arrays for every hinge/iteration.
      const nxs=nx/n2,nys=ny/n2,nzs=nz/n2,mxs=mx/m2,mys=my/m2,mzs=mz/m2;
      g[0]=-len*nxs;g[1]=-len*nys;g[2]=-len*nzs;
      g[3]=-len*mxs;g[4]=-len*mys;g[5]=-len*mzs;
      g[6]=-t*nxs-u*mxs;g[7]=-t*nys-u*mys;g[8]=-t*nzs-u*mzs;
      g[9]=-v*nxs-w*mxs;g[10]=-v*nys-w*mys;g[11]=-v*nzs-w*mzs;
    }
    return Math.atan2(((ny*mz-nz*my)*ex+(nz*mx-nx*mz)*ey+(nx*my-ny*mx)*ez)/len,nx*mx+ny*my+nz*mz);
  }

  private solveBending(params:ClothPhysicsParams,reverse:boolean){
    const p=this.positions,g=this.gradient;
    for(let j=0;j<this.hingeLambda.length;j++){
      const h=reverse?this.hingeLambda.length-1-j:j,angle=this.hingeAngle(h);
      if(!Number.isFinite(angle))continue;
      const alpha=this.bendAlpha[h];
      const a=this.hinges[h*4],b=this.hinges[h*4+1],c=this.hinges[h*4+2],d=this.hinges[h*4+3];
      let denom=alpha;
      // Keep the original vertex and addition order; specialize the fixed four-vertex stencil.
      if(a>=this.cols)denom+=g[0]**2+g[1]**2+g[2]**2;
      if(b>=this.cols)denom+=g[3]**2+g[4]**2+g[5]**2;
      if(c>=this.cols)denom+=g[6]**2+g[7]**2+g[8]**2;
      if(d>=this.cols)denom+=g[9]**2+g[10]**2+g[11]**2;
      if(denom<1e-9)continue;
      const restAngle=this.plasticAngle[h]+this.memoryAngle[h];
      const error=Math.atan2(Math.sin(angle-restAngle),Math.cos(angle-restAngle));
      const dl=(-error-alpha*this.hingeLambda[h])/denom;
      this.hingeLambda[h]+=dl;
      if(a>=this.cols){const i=a*3;p[i]+=dl*g[0];p[i+1]+=dl*g[1];p[i+2]+=dl*g[2];}
      if(b>=this.cols){const i=b*3;p[i]+=dl*g[3];p[i+1]+=dl*g[4];p[i+2]+=dl*g[5];}
      if(c>=this.cols){const i=c*3;p[i]+=dl*g[6];p[i+1]+=dl*g[7];p[i+2]+=dl*g[8];}
      if(d>=this.cols){const i=d*3;p[i]+=dl*g[9];p[i+1]+=dl*g[10];p[i+2]+=dl*g[11];}
    }
  }

  private applyGrab(params:ClothPhysicsParams){
    const g=this.grab;if(!g)return;const p=this.positions;
    for(let k=0;k<g.indices.length;k++){
      const id=g.indices[k],i=id*3;
      let tx=g.target.x+g.offsets[k*3],ty=g.target.y+g.offsets[k*3+1],tz=g.target.z+g.offsets[k*3+2];
      // A material point cannot travel farther from its pinned anchor than
      // its material distance along the sheet; resist impossible mouse pulls.
      const anchorX=this.rest[i],anchorY=this.height/2;
      const reach=Math.floor(id/this.cols)*this.height/this.segY;
      const dx=tx-anchorX,dy=ty-anchorY,dz=tz;
      const length=Math.hypot(dx,dy,dz);
      if(length>reach){const scale=reach/length;tx=anchorX+dx*scale;ty=anchorY+dy*scale;tz=dz*scale;}
      const alpha=params.grabCompliance/(Math.max(g.weights[k],.01)*SUBSTEP*SUBSTEP);
      for(let axis=0;axis<3;axis++){
        const target=axis===0?tx:axis===1?ty:tz;
        const l=k*3+axis,dl=(-(p[i+axis]-target)-alpha*g.lambda[l])/(1+alpha);
        g.lambda[l]+=dl;p[i+axis]+=dl;
      }
    }
  }

  /** Diagnostics used by the physical regression checks. */
  measure(){
    let maxStrain=0,sum=0,maxAngle=0,bend=0;
    for(let c=0;c<this.cA.length;c++){
      const a=this.cA[c]*3,b=this.cB[c]*3;
      const strain=Math.abs(Math.hypot(this.positions[b]-this.positions[a],this.positions[b+1]-this.positions[a+1],this.positions[b+2]-this.positions[a+2])/this.cRest[c]-1);
      maxStrain=Math.max(maxStrain,strain);sum+=strain;
    }
    for(let h=0;h<this.hingeLambda.length;h++){
      const angle=this.hingeAngle(h);if(Number.isFinite(angle)){maxAngle=Math.max(maxAngle,Math.abs(angle));bend+=angle*angle;}
    }
    const memory=this.memoryAngle.reduce((sum,a)=>sum+a*a,0);
    const plastic=this.plasticAngle.reduce((sum,a)=>sum+a*a,0);
    const creaseCount=this.plasticAngle.reduce((sum,a,h)=>sum+(Math.abs(a)/this.hingeSpan[h]>.05?1:0),0);
    return {maxStrain,meanStrain:sum/this.cA.length,maxAngle,bend,memory,plastic,creaseCount};
  }
}
