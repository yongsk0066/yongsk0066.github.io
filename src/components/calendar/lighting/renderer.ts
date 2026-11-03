import shader from './tracer.wgsl?raw';
import commonShader from './common.wgsl?raw';
import displayShader from './display.wgsl?raw';
import filterShader from './filter.wgsl?raw';
import {DynamicBVH} from './bvh';
import {slabRT} from './material';
import type {PerspectiveCamera} from 'three';

type Frame = {direct:GPUTexture; indirect:GPUTexture; moments:GPUTexture; guide:GPUTexture; surface:GPUTexture};
type LightPair = {direct:GPUTexture; indirect:GPUTexture};

/** Analytic direct light, independently reconstructed shadows/GI, full-resolution paper raster. */
export class PaperTracer {
 device!:GPUDevice; context!:GPUCanvasContext;
 pipeline!:GPUComputePipeline; filters:GPUComputePipeline[]=[];
 display!:GPURenderPipeline; paper!:GPURenderPipeline;
 nodes!:GPUBuffer; triangles!:GPUBuffer; previousTriangles!:GPUBuffer; uniform!:GPUBuffer;
 texture!:GPUTexture; sampler!:GPUSampler; depth!:GPUTexture;
 frames:Frame[]=[]; scratch:LightPair[]=[];
 groups:GPUBindGroup[]=[]; filterGroups:GPUBindGroup[][]=[]; displayGroups:GPUBindGroup[]=[]; paperGroups:GPUBindGroup[]=[];
 width=0; height=0; lightingWidth=0; lightingHeight=0; samples=0; seed=0; epoch=0; lastReason='initial';
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
   r.pipeline=await r.device.createComputePipelineAsync({layout:'auto',compute:{module,entryPoint:'main'}});
   const filtering=r.device.createShaderModule({code:filterShader});
   for(const step of [1,2,4])r.filters.push(await r.device.createComputePipelineAsync({layout:'auto',compute:{module:filtering,entryPoint:'main',constants:{0:step}}}));
   const display=r.device.createShaderModule({code:commonShader+'\n'+displayShader});
   r.display=await r.device.createRenderPipelineAsync({layout:'auto',vertex:{module:display,entryPoint:'vs'},fragment:{module:display,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'},depthStencil:{format:'depth24plus',depthWriteEnabled:false,depthCompare:'always'}});
   r.paper=await r.device.createRenderPipelineAsync({layout:'auto',vertex:{module:display,entryPoint:'vsPaper'},fragment:{module:display,entryPoint:'fsPaper',targets:[{format}]},primitive:{topology:'triangle-list',cullMode:'none'},depthStencil:{format:'depth24plus',depthWriteEnabled:true,depthCompare:'less'}});
   const buffer=(size:number)=>r.device.createBuffer({size,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC});
   r.nodes=buffer(bvh.nodeData.byteLength);r.triangles=buffer(bvh.triData.byteLength);r.previousTriangles=buffer(bvh.triData.byteLength);r.triangleCount=bvh.order.length;
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
 setCamera(camera:PerspectiveCamera,width:number,height:number){
  const p=camera.projectionMatrix.elements;
  const next=[camera.position.x,camera.position.y,camera.position.z,0,1/p[0],1/p[5],p[8]/p[0],p[9]/p[5]];let changed=false;
  for(let i=0;i<4;i++){if(this.values[4+i]!==Math.fround(next[i]))changed=true;this.values[4+i]=next[i];}
  for(let i=0;i<4;i++){if(this.values[24+i]!==Math.fround(next[4+i]))changed=true;this.values[24+i]=next[4+i];}
  width=Math.max(1,Math.round(width));height=Math.max(1,Math.round(height));
  if(width!==this.width||height!==this.height){
   this.width=width;this.height=height;const canvas=this.context.canvas as HTMLCanvasElement;canvas.width=width;canvas.height=height;
   this.destroyTargets();this.lightingWidth=Math.ceil(width/2);this.lightingHeight=Math.ceil(height/2);
   const make=()=>this.device.createTexture({size:[this.lightingWidth,this.lightingHeight],format:'rgba16float',usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING});
   this.frames=Array.from({length:2},()=>({direct:make(),indirect:make(),moments:make(),guide:make(),surface:make()}));
   this.scratch=Array.from({length:2},()=>({direct:make(),indirect:make()}));
   this.depth=this.device.createTexture({size:[width,height],format:'depth24plus',usage:GPUTextureUsage.RENDER_ATTACHMENT});
   this.frameIndex=0;this.bind();changed=true;
  }
  if(changed)this.reset('camera');
 }
 setBackground(color:{r:number;g:number;b:number}){
  if(this.values[28]===Math.fround(color.r)&&this.values[29]===Math.fround(color.g)&&this.values[30]===Math.fround(color.b))return;
  this.values.set([color.r,color.g,color.b,0],28);this.reset('background');
 }
 private bind(){
  const entry=(binding:number,texture:GPUTexture):GPUBindGroupEntry=>({binding,resource:texture.createView()});
  this.groups=[];this.filterGroups=[];this.displayGroups=[];this.paperGroups=[];
  for(let i=0;i<2;i++){
   const f=this.frames[i],old=this.frames[1-i];
   this.groups.push(this.device.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.nodes}},{binding:1,resource:{buffer:this.triangles}},{binding:2,resource:{buffer:this.previousTriangles}},entry(3,f.direct),{binding:4,resource:{buffer:this.uniform}},entry(5,this.texture),{binding:6,resource:this.sampler},entry(7,f.guide),entry(8,f.moments),entry(9,old.indirect),entry(10,old.guide),entry(11,old.surface),entry(12,f.indirect),entry(13,f.surface),entry(14,old.direct),entry(15,old.moments)]}));
   this.filterGroups.push(this.filters.map((pipeline,j)=>{
    const input=j===0?f:this.scratch[(j-1)%2],output=this.scratch[j%2];
    return this.device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[entry(0,input.direct),entry(1,input.indirect),entry(2,f.guide),entry(3,f.surface),entry(4,f.moments),entry(5,output.direct),entry(6,output.indirect)]});
   }));
   this.displayGroups.push(this.device.createBindGroup({layout:this.display.getBindGroupLayout(0),entries:[entry(0,this.scratch[0].direct),entry(5,f.surface)]}));
   this.paperGroups.push(this.device.createBindGroup({layout:this.paper.getBindGroupLayout(0),entries:[entry(0,this.scratch[0].direct),entry(1,this.scratch[0].indirect),entry(2,this.texture),{binding:3,resource:this.sampler},entry(4,f.guide),entry(5,f.surface),{binding:6,resource:{buffer:this.triangles}},{binding:7,resource:{buffer:this.uniform}}]}));
  }
 }
 upload(bvh:DynamicBVH){this.device.queue.writeBuffer(this.nodes,0,bvh.nodeData);this.device.queue.writeBuffer(this.triangles,0,bvh.triData);this.samples=0;this.moving=true;this.lastReason='deformation';}
 reset(reason:string){this.historyValid=false;this.samples=0;this.epoch++;this.lastReason=reason;}
 render(){
  if(!this.groups.length||this.disposed)return;
  const u=new Uint32Array(this.values.buffer);u[0]=this.lightingWidth;u[1]=this.lightingHeight;u[2]=this.samples;u[3]=this.seed++;
  this.values[40]=this.historyValid?1:0;this.values[41]=this.moving?1:0;this.device.queue.writeBuffer(this.uniform,0,this.values);
  const encoder=this.device.createCommandEncoder();
  const compute=(pipeline:GPUComputePipeline,group:GPUBindGroup)=>{const pass=encoder.beginComputePass();pass.setPipeline(pipeline);pass.setBindGroup(0,group);pass.dispatchWorkgroups(Math.ceil(this.lightingWidth/8),Math.ceil(this.lightingHeight/8));pass.end();};
  compute(this.pipeline,this.groups[this.frameIndex]);
  for(let j=0;j<this.filters.length;j++)compute(this.filters[j],this.filterGroups[this.frameIndex][j]);
  const draw=encoder.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}],depthStencilAttachment:{view:this.depth.createView(),depthClearValue:1,depthLoadOp:'clear',depthStoreOp:'discard'}});
  draw.setPipeline(this.display);draw.setBindGroup(0,this.displayGroups[this.frameIndex]);draw.draw(3);
  draw.setPipeline(this.paper);draw.setBindGroup(0,this.paperGroups[this.frameIndex]);draw.draw(this.triangleCount*3);draw.end();
  encoder.copyBufferToBuffer(this.triangles,0,this.previousTriangles,0,this.triangles.size);
  this.device.queue.submit([encoder.finish()]);this.samples++;this.historyValid=true;this.moving=false;this.frameIndex=1-this.frameIndex;
  this.values.set(this.values.subarray(4,8),32);this.values.set(this.values.subarray(24,28),36);
 }
 private destroyTargets(){for(const f of [...this.frames,...this.scratch])for(const t of Object.values(f))t.destroy();this.frames=[];this.scratch=[];this.depth?.destroy();}
 dispose(){this.disposed=true;this.nodes?.destroy();this.triangles?.destroy();this.previousTriangles?.destroy();this.uniform?.destroy();this.destroyTargets();this.texture?.destroy();this.context?.unconfigure();this.device?.destroy();}
}
