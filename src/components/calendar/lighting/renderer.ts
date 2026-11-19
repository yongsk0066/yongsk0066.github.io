import meshShader from './mesh.wgsl?raw';
import shader from './tracer.wgsl?raw';
import commonShader from './common.wgsl?raw';
import displayShader from './display.wgsl?raw';
import filterShader from './filter.wgsl?raw';
import {DynamicBVH} from './bvh';
import {slabRT} from './material';
import type {PerspectiveCamera} from 'three';

type Frame = {direct:GPUTexture; indirect:GPUTexture; moments:GPUTexture; guide:GPUTexture; surface:GPUTexture};
type FilterTargets = {direct:GPUTexture; indirect:GPUTexture; intermediate:GPUTexture};

/** Analytic direct light, independently reconstructed shadows/GI, full-resolution paper raster. */
export class PaperTracer {
 device!:GPUDevice; context!:GPUCanvasContext;
 private expand?:GPUComputePipeline;
 private meshGroup?:GPUBindGroup;
 private meshIndices?:GPUBuffer;
 private meshVertices?:GPUBuffer;
 private vertexData?:Float32Array<ArrayBuffer>;
 private topology?:DynamicBVH;
 pipeline!:GPUComputePipeline; filters:GPUComputePipeline[]=[];
 display!:GPURenderPipeline; paper!:GPURenderPipeline;
 nodes!:GPUBuffer; triangles!:GPUBuffer; previousTriangles!:GPUBuffer; uniform!:GPUBuffer;
 texture!:GPUTexture; sampler!:GPUSampler; depth!:GPUTexture;
 frames:Frame[]=[]; scratch?:FilterTargets;
 groups:GPUBindGroup[]=[]; filterGroups:GPUBindGroup[][]=[]; displayGroups:GPUBindGroup[]=[]; paperGroups:GPUBindGroup[]=[];
 width=0; height=0; lightingWidth=0; lightingHeight=0; samples=0; seed=0; epoch=0; lastReason='initial';
 capacityWidth=0; capacityHeight=0;
 historyValid=false; moving=false; frameIndex=0; triangleCount=0;
 values=new Float32Array(44); textureWidth=0; textureHeight=0; disposed=false;
 static async create(canvas:HTMLCanvasElement,bvh:DynamicBVH,ink:HTMLCanvasElement){
  if(!navigator.gpu)throw Error('WebGPU unavailable');
  const adapter=await navigator.gpu.requestAdapter({powerPreference:'low-power'});
  if(!adapter)throw Error('WebGPU adapter unavailable');
  const r=new PaperTracer();
  try{
   r.device=await adapter.requestDevice({requiredLimits:{maxStorageTexturesPerShaderStage:5}});
   r.context=canvas.getContext('webgpu')!;if(!r.context)throw Error('WebGPU canvas unavailable');
   const format=navigator.gpu.getPreferredCanvasFormat();r.context.configure({device:r.device,format,alphaMode:'premultiplied'});
   const module=r.device.createShaderModule({code:commonShader+'\n'+shader});
   const info=await module.getCompilationInfo();if(info.messages.some(x=>x.type==='error'))throw Error(info.messages.map(x=>x.message).join('\n'));
   [r.pipeline,r.expand]=await Promise.all([
    r.device.createComputePipelineAsync({layout:'auto',compute:{module,entryPoint:'main'}}),
    r.device.createComputePipelineAsync({label:'Calendar mesh expansion',layout:'auto',compute:{module:r.device.createShaderModule({code:meshShader}),entryPoint:'expand'}}).catch(()=>undefined),
   ]);
   const filtering=r.device.createShaderModule({code:filterShader});
   r.filters=await Promise.all(['tight','wide2','wide4'].map(entryPoint=>r.device.createComputePipelineAsync({layout:'auto',compute:{module:filtering,entryPoint}})));
   const display=r.device.createShaderModule({code:commonShader+'\n'+displayShader});
   r.display=await r.device.createRenderPipelineAsync({layout:'auto',vertex:{module:display,entryPoint:'vs'},fragment:{module:display,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'},depthStencil:{format:'depth24plus',depthWriteEnabled:false,depthCompare:'always'}});
   r.paper=await r.device.createRenderPipelineAsync({layout:'auto',vertex:{module:display,entryPoint:'vsPaper'},fragment:{module:display,entryPoint:'fsPaper',targets:[{format}]},primitive:{topology:'triangle-list',cullMode:'none'},depthStencil:{format:'depth24plus',depthWriteEnabled:true,depthCompare:'less'}});
   const buffer=(size:number)=>r.device.createBuffer({size,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC});
   r.nodes=buffer(bvh.nodeData.byteLength);r.triangleCount=bvh.order.length;
   const triangleBytes=r.triangleCount*32*Float32Array.BYTES_PER_ELEMENT;
   r.triangles=buffer(triangleBytes);r.previousTriangles=buffer(triangleBytes);
   if(r.expand){
    r.vertexData=new Float32Array(8*bvh.geometry.attributes.position.count);
    r.meshIndices=buffer(3*r.triangleCount*Uint32Array.BYTES_PER_ELEMENT);
    r.meshVertices=buffer(r.vertexData.byteLength);
    r.meshGroup=r.device.createBindGroup({layout:r.expand.getBindGroupLayout(0),entries:[
     {binding:0,resource:{buffer:r.meshIndices}},{binding:1,resource:{buffer:r.meshVertices}},{binding:2,resource:{buffer:r.triangles}},
    ]});
   }
   r.uniform=r.device.createBuffer({size:176,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
   r.sampler=r.device.createSampler({magFilter:'linear',minFilter:'linear'});
   const rt=slabRT(.25,65,.07);
   r.values.set([-20,30,200,140],8);r.values.set([120,-.04,10.7,-1],12);
   r.values.set([rt.R,rt.T,.001,.75],16);r.values.set([6,1,1,0],20);
   r.upload(bvh);r.setInk(ink);return r;
  }catch(error){r.dispose();throw error;}
 }
 setInk(ink:HTMLCanvasElement){
  if(this.textureWidth!==ink.width||this.textureHeight!==ink.height){
   this.texture?.destroy();this.textureWidth=ink.width;this.textureHeight=ink.height;
   this.texture=this.device.createTexture({size:[ink.width,ink.height],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});
   if(this.frames.length)this.bind();
  }
  this.device.queue.copyExternalImageToTexture({source:ink},{texture:this.texture},[ink.width,ink.height]);this.reset('calendarpaint');
 }
 setCamera(camera:PerspectiveCamera,width:number,height:number,reserveWidth=0,reserveHeight=0){
  const p=camera.projectionMatrix.elements;
  const next=[camera.position.x,camera.position.y,camera.position.z,0,1/p[0],1/p[5],p[8]/p[0],p[9]/p[5]];let changed=false;
  for(let i=0;i<4;i++){if(this.values[4+i]!==Math.fround(next[i]))changed=true;this.values[4+i]=next[i];}
  for(let i=0;i<4;i++){if(this.values[24+i]!==Math.fround(next[4+i]))changed=true;this.values[24+i]=next[4+i];}
  width=Math.max(1,Math.round(width));height=Math.max(1,Math.round(height));
  if(width!==this.width||height!==this.height){
   this.width=width;this.height=height;
   const canvas=this.context.canvas as HTMLCanvasElement;
   canvas.width=width;canvas.height=height;
   this.lightingWidth=Math.ceil(width/2);this.lightingHeight=Math.ceil(height/2);
   // WebGPU requires the depth and current presentation attachments to match.
   this.depth?.destroy();
   this.depth=this.device.createTexture({size:[width,height],format:'depth24plus',usage:GPUTextureUsage.RENDER_ATTACHMENT});
   changed=true;
  }
  const capacityWidth=reserveWidth?Math.max(this.capacityWidth,this.lightingWidth,Math.ceil(reserveWidth/2)):this.lightingWidth;
  const capacityHeight=reserveHeight?Math.max(this.capacityHeight,this.lightingHeight,Math.ceil(reserveHeight/2)):this.lightingHeight;
  if(capacityWidth!==this.capacityWidth||capacityHeight!==this.capacityHeight){
   const oldFrames=this.frames, oldTargets=this.historyTextures();
   this.capacityWidth=capacityWidth;this.capacityHeight=capacityHeight;
   const make=(copyable=false)=>this.device.createTexture({size:[capacityWidth,capacityHeight],format:'rgba16float',usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|(copyable?GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST:0)});
   this.frames=Array.from({length:2},()=>({direct:make(true),indirect:make(true),moments:make(true),guide:make(true),surface:make(true)}));
   this.scratch={direct:make(),indirect:make(),intermediate:make()};
   if(!changed && this.historyValid){
    // Switching capacity alone preserves the previous sample used for reprojection.
    const previous=1-this.frameIndex, encoder=this.device.createCommandEncoder();
    for(const key of Object.keys(oldFrames[previous]) as (keyof Frame)[]){
     encoder.copyTextureToTexture({texture:oldFrames[previous][key]},{texture:this.frames[previous][key]},[this.lightingWidth,this.lightingHeight]);
    }
    this.device.queue.submit([encoder.finish()]);
   }
   for(const texture of oldTargets)texture.destroy();
   this.bind();
  }
  if(changed)this.frameIndex=0;
  if(changed)this.reset('camera');
 }
 setBackground(color:{r:number;g:number;b:number}){
  if(this.values[28]===Math.fround(color.r)&&this.values[29]===Math.fround(color.g)&&this.values[30]===Math.fround(color.b))return;
  this.values.set([color.r,color.g,color.b,0],28);this.reset('background');
 }
 private bind(){
  const scratch=this.scratch!;
  const entry=(binding:number,texture:GPUTexture):GPUBindGroupEntry=>({binding,resource:texture.createView()});
  this.groups=[];this.filterGroups=[];this.displayGroups=[];this.paperGroups=[];
  for(let i=0;i<2;i++){
   const f=this.frames[i],old=this.frames[1-i];
   this.groups.push(this.device.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.nodes}},{binding:1,resource:{buffer:this.triangles}},{binding:2,resource:{buffer:this.previousTriangles}},entry(3,f.direct),{binding:4,resource:{buffer:this.uniform}},entry(5,this.texture),{binding:6,resource:this.sampler},entry(7,f.guide),entry(8,f.moments),entry(9,old.indirect),entry(10,old.guide),entry(11,old.surface),entry(12,f.indirect),entry(13,f.surface),entry(14,old.direct),entry(15,old.moments)]}));
   // The tight pass finishes direct light. Only indirect light alternates in the two wide passes.
   this.filterGroups.push(this.filters.map((pipeline,j)=>{
    const input=j===0?f.indirect:j===1?scratch.indirect:scratch.intermediate;
    const output=j===1?scratch.intermediate:scratch.indirect;
    const entries=[entry(0,j===0?f.direct:scratch.direct),entry(1,input),entry(2,f.guide),entry(3,f.surface),entry(4,f.moments),entry(6,output),{binding:7,resource:{buffer:this.uniform}}];
    if(j===0)entries.push(entry(5,scratch.direct));
    return this.device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries});
   }));
   this.displayGroups.push(this.device.createBindGroup({layout:this.display.getBindGroupLayout(0),entries:[entry(0,scratch.direct),entry(5,f.surface),{binding:7,resource:{buffer:this.uniform}}]}));
   this.paperGroups.push(this.device.createBindGroup({layout:this.paper.getBindGroupLayout(0),entries:[entry(0,scratch.direct),entry(1,scratch.indirect),entry(2,this.texture),{binding:3,resource:this.sampler},entry(4,f.guide),entry(5,f.surface),{binding:6,resource:{buffer:this.triangles}},{binding:7,resource:{buffer:this.uniform}}]}));
  }
 }
 upload(bvh:DynamicBVH){
  const queue=this.device.queue;
  queue.writeBuffer(this.nodes,0,bvh.nodeData);
  if(this.vertexData && this.meshIndices && this.meshVertices){
   if(this.topology!==bvh){
    const indices=new Uint32Array(3*bvh.order.length);
    for(let i=0;i<bvh.order.length;i++){
     const source=3*bvh.order[i];
     for(let j=0;j<3;j++)indices[3*i+j]=bvh.indices[source+j];
    }
    queue.writeBuffer(this.meshIndices,0,indices);
    this.topology=bvh;
   }
   const {position,normal,uv}=bvh.geometry.attributes;
   this.vertexData.set(position.array,0);
   this.vertexData.set(normal.array,position.count*3);
   this.vertexData.set(uv.array,position.count*6);
   queue.writeBuffer(this.meshVertices,0,this.vertexData);
  }else{
   queue.writeBuffer(this.triangles,0,bvh.triData);
  }
  this.samples=0;this.moving=true;this.lastReason='deformation';
 }
 reset(reason:string){this.historyValid=false;this.samples=0;this.epoch++;this.lastReason=reason;}
 render(){
  if(!this.groups.length||this.disposed)return;
  const u=new Uint32Array(this.values.buffer);u[0]=this.lightingWidth;u[1]=this.lightingHeight;u[2]=this.samples;u[3]=this.seed++;
  this.values[40]=this.historyValid?1:0;this.values[41]=this.moving?1:0;this.device.queue.writeBuffer(this.uniform,0,this.values);
  const encoder=this.device.createCommandEncoder();
  if(this.moving && this.expand && this.meshGroup){
   const pass=encoder.beginComputePass({label:'Expand calendar mesh'});
   pass.setPipeline(this.expand);pass.setBindGroup(0,this.meshGroup);
   pass.dispatchWorkgroups(Math.ceil(this.triangleCount/64));pass.end();
  }
  const compute=(pipeline:GPUComputePipeline,group:GPUBindGroup)=>{const pass=encoder.beginComputePass();pass.setPipeline(pipeline);pass.setBindGroup(0,group);pass.dispatchWorkgroups(Math.ceil(this.lightingWidth/8),Math.ceil(this.lightingHeight/8));pass.end();};
  compute(this.pipeline,this.groups[this.frameIndex]);
  for(let j=0;j<this.filters.length;j++)compute(this.filters[j],this.filterGroups[this.frameIndex][j]);
  const draw=encoder.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}],depthStencilAttachment:{view:this.depth.createView(),depthClearValue:1,depthLoadOp:'clear',depthStoreOp:'discard'}});
  draw.setPipeline(this.display);draw.setBindGroup(0,this.displayGroups[this.frameIndex]);draw.draw(3);
  draw.setPipeline(this.paper);draw.setBindGroup(0,this.paperGroups[this.frameIndex]);draw.draw(this.triangleCount*3);draw.end();
  if(this.moving)encoder.copyBufferToBuffer(this.triangles,0,this.previousTriangles,0,this.triangles.size);
  this.device.queue.submit([encoder.finish()]);this.samples++;this.historyValid=true;this.moving=false;this.frameIndex=1-this.frameIndex;
  this.values.set(this.values.subarray(4,8),32);this.values.set(this.values.subarray(24,28),36);
 }
 private historyTextures(){
  const textures=this.frames.flatMap(frame=>Object.values(frame));
  if(this.scratch)textures.push(...Object.values(this.scratch));
  return textures;
 }
 private destroyHistory(){for(const texture of this.historyTextures())texture.destroy();this.frames=[];this.scratch=undefined;}
 dispose(){this.disposed=true;this.meshIndices?.destroy();this.meshVertices?.destroy();this.nodes?.destroy();this.triangles?.destroy();this.previousTriangles?.destroy();this.uniform?.destroy();this.destroyHistory();this.depth?.destroy();this.texture?.destroy();this.context?.unconfigure();this.device?.destroy();}
}
