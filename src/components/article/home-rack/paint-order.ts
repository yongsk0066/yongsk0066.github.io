import * as A from './vendor/anatomy/iso-kit';
import type { Part, V3 } from './model';

type Flat = A.Flat;
export type PaintShape = { bounds: [V3, V3]; hull: Flat[] };
export type PaintItem = PaintShape & { i: number; depth: number; constrained: boolean };
const cross = (a: Flat, b: Flat, c: Flat) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);

function hull(points: Flat[]): Flat[] {
  const sorted = [...points].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const chain = (values: Flat[]) => {
    const out: Flat[] = [];
    for (const p of values) {
      while (out.length>1 && cross(out[out.length-2],out[out.length-1],p)<=0) out.pop();
      out.push(p);
    }
    return out.slice(0,-1);
  };
  return [...chain(sorted),...chain([...sorted].reverse())];
}

export function paintShape(p: Part, P: A.Projection): PaintShape {
  let vertices: V3[];
  if (p.shape==='line') vertices=p.points!;
  else if (p.shape==='face') vertices=A.roundedPlan({x:p.p[0],y:p.p[2],w:p.size[0],d:p.size[2],r:p.radius},5).map(([x,z])=>[x,p.p[1],z]);
  else {
    const plan: Flat[]=p.shape==='disc'
      ? Array.from({length:64},(_,i)=>[p.p[0]+p.radius*Math.cos(i*Math.PI/32),p.p[1]+p.radius*Math.sin(i*Math.PI/32)])
      : A.roundedPlan({x:p.p[0],y:p.p[1],w:p.size[0],d:p.size[1],r:p.radius},6);
    vertices=[p.p[2],p.p[2]+p.size[2]].flatMap(z=>plan.map(([x,y])=>[x,y,z] as V3));
  }
  return {
    bounds: [0,1].map(end=>[0,1,2].map(axis=>(end?Math.max:Math.min)(...vertices.map(v=>v[axis])))) as [V3,V3],
    hull:hull(vertices.map(v=>A.iso(v,P))),
  };
}

// Convex silhouettes, rather than screen rectangles, avoid false overlap at
// the rounded AP edge. Every hull is cached; movement only translates it.
function overlaps(a: Flat[], b: Flat[]): boolean {
  for (const polygon of [a,b]) for (let i=0;i<polygon.length;i++) {
    const p=polygon[i],q=polygon[(i+1)%polygon.length],axis:Flat=[p[1]-q[1],q[0]-p[0]];
    // Compare extrema directly instead of allocating four projected arrays
    // for every edge of every pair on every animation frame.
    let amin=Infinity,amax=-Infinity,bmin=Infinity,bmax=-Infinity;
    for(const [x,y] of a){const v=x*axis[0]+y*axis[1];if(v<amin)amin=v;if(v>amax)amax=v;}
    for(const [x,y] of b){const v=x*axis[0]+y*axis[1];if(v<bmin)bmin=v;if(v>bmax)bmax=v;}
    if (amax<=bmin||bmax<=amin) return false;
  }
  return true;
}

// The camera sees positive x/y/z. A separating world plane gives the physical
// order of overlapping silhouettes, even when the centres say the opposite.
// Apply these constraints to the continuous uprights, roof and cable loops; preserve the
// existing ordering of unrelated device surfaces.
export function orderPaintItems(items: PaintItem[]): PaintItem[] {
  const sorted=[...items].sort((a,b)=>a.depth-b.depth||a.i-b.i);
  // Most parts do not even share a screen rectangle. Cache this broad phase
  // once per item, before the exact convex-silhouette test below.
  const rectangles=sorted.map(({hull})=>{
    let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
    for(const [x,y] of hull){if(x<xmin)xmin=x;if(x>xmax)xmax=x;if(y<ymin)ymin=y;if(y>ymax)ymax=y;}
    return [xmin,ymin,xmax,ymax];
  });
  const edges=sorted.map(()=>new Set<number>()),incoming=sorted.map(()=>0);
  for (let a=0;a<sorted.length;a++) for (let b=a+1;b<sorted.length;b++) {
    const x=sorted[a],y=sorted[b];
    if (!x.constrained&&!y.constrained) continue;
    const xr=rectangles[a],yr=rectangles[b];
    if(xr[2]<=yr[0]||yr[2]<=xr[0]||xr[3]<=yr[1]||yr[3]<=xr[1])continue;
    let behind=false,ahead=false;
    for (let axis=0;axis<3;axis++) {
      if (x.bounds[1][axis]<=y.bounds[0][axis]) behind=true;
      if (y.bounds[1][axis]<=x.bounds[0][axis]) ahead=true;
    }
    if (behind===ahead||!overlaps(x.hull,y.hull)) continue;
    const from=behind?a:b,to=behind?b:a;
    edges[from].add(to);incoming[to]++;
  }
  const result:PaintItem[]=[],remaining=new Set(sorted.map((_,i)=>i));
  while (remaining.size) {
    // Intersecting geometry can form a painter cycle. Keep its stable baseline
    // order; disjoint roof/AP/Fiber surfaces use the plane constraints above.
    const next=[...remaining].find(i=>incoming[i]===0)??remaining.values().next().value!;
    remaining.delete(next);result.push(sorted[next]);
    for (const to of edges[next]) incoming[to]--;
  }
  return result;
}
