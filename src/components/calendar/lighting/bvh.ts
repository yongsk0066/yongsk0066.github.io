import type { BufferGeometry } from 'three';

type Node = {lo:number[]; hi:number[]; left:number; right:number; ids?:number[]};

/** Median-split BVH. Topology is fixed while the paper deforms. */
export class DynamicBVH {
  nodes: Node[] = [];
  order: number[] = [];
  indices: number[];
  nodeData: Float32Array<ArrayBuffer>;
  private packed?: Float32Array<ArrayBuffer>;
  private packedDirty = true;

  constructor(public geometry: BufferGeometry) {
    this.indices = Array.from(geometry.index!.array);
    const positions = geometry.attributes.position.array;
    const count = this.indices.length / 3;
    const centers = new Float64Array(count * 3);
    for (let t = 0; t < count; t++) {
      const a = 3 * this.indices[3*t], b = 3 * this.indices[3*t+1], c = 3 * this.indices[3*t+2];
      for (let k = 0; k < 3; k++) centers[3*t+k] = (positions[a+k]+positions[b+k]+positions[c+k])/3;
    }
    const build = (ids:number[]):number => {
      const index = this.nodes.length;
      const node: Node = {lo:[0,0,0],hi:[0,0,0],left:0,right:0};
      this.nodes.push(node);
      if (ids.length <= 4) {
        node.ids = ids;
        node.left = -(this.order.length + 1);
        node.right = ids.length;
        this.order.push(...ids);
        return index;
      }
      const lo = [Infinity,Infinity,Infinity], hi = [-Infinity,-Infinity,-Infinity];
      for (const t of ids) {
        for (let k = 0; k < 3; k++) {
          const v = centers[3*t+k];
          lo[k] = Math.min(lo[k],v);
          hi[k] = Math.max(hi[k],v);
        }
      }
      let axis = 0;
      for (let k = 1; k < 3; k++) if (hi[k]-lo[k] > hi[axis]-lo[axis]) axis = k;
      ids.sort((a,b) => centers[3*a+axis]-centers[3*b+axis]);
      const mid = ids.length >> 1;
      node.left = build(ids.slice(0,mid));
      node.right = build(ids.slice(mid));
      return index;
    };
    build(Array.from({length:count},(_,i)=>i));
    this.nodeData = new Float32Array(this.nodes.length * 8);
    const nodeBits = new Int32Array(this.nodeData.buffer);
    // Precompute where a ray continues after a missed box or an exhausted leaf.
    // Visit the right child first, as in the original LIFO traversal, including coplanar ties.
    const thread = (index: number, escape: number) => {
      const node = this.nodes[index];
      const offset = 8 * index;
      nodeBits[offset + 7] = escape;
      if (node.ids) {
        const first = -node.left - 1;
        nodeBits[offset + 3] = ~(first * 4 + node.ids.length - 1);
      } else {
        nodeBits[offset + 3] = node.right;
        thread(node.right, node.left);
        thread(node.left, escape);
      }
    };
    thread(0, this.nodes.length);
    this.refit();
  }

  refit(normalsReady = false) {
    if (!normalsReady) this.geometry.computeVertexNormals();
    this.packedDirty = true;
    const p = this.geometry.attributes.position.array;
    for (let i = this.nodes.length-1; i >= 0; i--) {
      const {lo,hi,ids,left,right} = this.nodes[i];
      if (ids) {
        lo.fill(Infinity);
        hi.fill(-Infinity);
        for (const id of ids) {
          for (let v = 0; v < 3; v++) {
            const start = 3 * this.indices[3*id+v];
            for (let k = 0; k < 3; k++) {
              lo[k] = Math.min(lo[k],p[start+k]);
              hi[k] = Math.max(hi[k],p[start+k]);
            }
          }
        }
      } else {
        const a = this.nodes[left], b = this.nodes[right];
        for (let k = 0; k < 3; k++) {
          lo[k] = Math.min(a.lo[k],b.lo[k]);
          hi[k] = Math.max(a.hi[k],b.hi[k]);
        }
      }
      for (let k = 0; k < 3; k++) {
        this.nodeData[8*i+k] = lo[k]-.0001;
        this.nodeData[8*i+4+k] = hi[k]+.0001;
      }
    }
  }

  /** Contiguous triangles for the CPU upload path and the reference renderer. */
  get triData() {
    const data = this.packed ??= new Float32Array(this.order.length*32);
    if (!this.packedDirty) return data;
    const {position,normal,uv} = this.geometry.attributes;
    for (let t = 0; t < this.order.length; t++) {
      for (let v = 0; v < 3; v++) {
        const index = this.indices[3*this.order[t]+v];
        const dest = t*32+4*v;
        for (let k = 0; k < 3; k++) {
          data[dest+k] = position.array[index*3+k];
          data[dest+12+k] = normal.array[index*3+k];
        }
        data[t*32+24+2*v] = uv.array[2*index];
        data[t*32+25+2*v] = uv.array[2*index+1];
      }
    }
    this.packedDirty = false;
    return data;
  }

  audit() {
    let violations = 0;
    const p = this.geometry.attributes.position.array;
    for (const node of this.nodes) {
      for (const id of node.ids ?? []) for (let v=0;v<3;v++) for (let k=0;k<3;k++) {
        const value = p[this.indices[id*3+v]*3+k];
        if (value<node.lo[k]-1e-6 || value>node.hi[k]+1e-6) violations++;
      }
    }
    return {nodes:this.nodes.length,triangles:this.order.length,violations};
  }
}
