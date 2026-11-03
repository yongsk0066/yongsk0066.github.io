import * as THREE from 'three';
type Node={lo:number[];hi:number[];left:number;right:number;ids?:number[]};
export class DynamicBVH{
 nodes:Node[]=[];order:number[]=[];nodeData:Float32Array;triData:Float32Array;indices:number[];
 constructor(public geometry:THREE.BufferGeometry){
  this.indices=Array.from(geometry.index!.array);const pos=geometry.attributes.position.array;
  const center=(id:number,k:number)=>(pos[this.indices[id*3]*3+k]+pos[this.indices[id*3+1]*3+k]+pos[this.indices[id*3+2]*3+k])/3;
  const build=(ids:number[]):number=>{const i=this.nodes.length,n:Node={lo:[0,0,0],hi:[0,0,0],left:0,right:0};this.nodes.push(n);if(ids.length<=4){n.left=-(this.order.length+1);n.right=ids.length;n.ids=ids;this.order.push(...ids);}else{const ranges=[0,1,2].map(k=>Math.max(...ids.map(id=>center(id,k)))-Math.min(...ids.map(id=>center(id,k))));const axis=ranges.indexOf(Math.max(...ranges));ids.sort((a,b)=>center(a,axis)-center(b,axis));const m=ids.length>>1;n.left=build(ids.slice(0,m));n.right=build(ids.slice(m));}return i;};
  build(Array.from({length:this.indices.length/3},(_,i)=>i));this.nodeData=new Float32Array(this.nodes.length*8);this.triData=new Float32Array(this.order.length*32);this.refit();
 }
 refit(){
  this.geometry.computeVertexNormals();const p=this.geometry.attributes.position.array,n=this.geometry.attributes.normal.array,u=this.geometry.attributes.uv.array;
  for(let j=0;j<this.order.length;j++){const id=this.order[j],off=j*32;for(let v=0;v<3;v++){const ix=this.indices[id*3+v];for(let k=0;k<3;k++){this.triData[off+v*4+k]=p[ix*3+k];this.triData[off+12+v*4+k]=n[ix*3+k];}this.triData[off+24+v*2]=u[ix*2];this.triData[off+25+v*2]=u[ix*2+1];}}
  const bits=new Int32Array(this.nodeData.buffer);
  for(let i=this.nodes.length-1;i>=0;i--){const node=this.nodes[i];node.lo=[Infinity,Infinity,Infinity];node.hi=[-Infinity,-Infinity,-Infinity];if(node.ids){for(const id of node.ids)for(let v=0;v<3;v++)for(let k=0;k<3;k++){const x=p[this.indices[id*3+v]*3+k];node.lo[k]=Math.min(node.lo[k],x);node.hi[k]=Math.max(node.hi[k],x);}}else for(const ci of [node.left,node.right])for(let k=0;k<3;k++){node.lo[k]=Math.min(node.lo[k],this.nodes[ci].lo[k]);node.hi[k]=Math.max(node.hi[k],this.nodes[ci].hi[k]);}for(let k=0;k<3;k++){this.nodeData[i*8+k]=node.lo[k]-.0001;this.nodeData[i*8+4+k]=node.hi[k]+.0001;}bits[i*8+3]=node.left;bits[i*8+7]=node.right;}
 }
 audit(){let violations=0;const p=this.geometry.attributes.position.array;for(const node of this.nodes)if(node.ids)for(const id of node.ids)for(let v=0;v<3;v++)for(let k=0;k<3;k++){const x=p[this.indices[id*3+v]*3+k];if(x<node.lo[k]-1e-6||x>node.hi[k]+1e-6)violations++;}return {nodes:this.nodes.length,triangles:this.order.length,violations};}
}
