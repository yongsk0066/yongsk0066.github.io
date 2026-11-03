import shader from './tracer.wgsl?raw';
import displayShader from './display.wgsl?raw';
import filterShader from './filter.wgsl?raw';
import {DynamicBVH} from './bvh';
import {slabRT} from './material';
import type {PerspectiveCamera} from 'three';

/** Progressive paper path tracer. All resources belong to this preview instance. */
export class PaperTracer {
 device!:GPUDevice; context!:GPUCanvasContext; pipeline!:GPUComputePipeline; display!:GPURenderPipeline; filter!:GPUComputePipeline; filterGroup!:GPUBindGroup; filtered!:GPUTexture;
 nodes!:GPUBuffer; triangles!:GPUBuffer; uniform!:GPUBuffer; previousTriangles!:GPUBuffer; history!:GPUTexture; previousHistory!:GPUTexture; previousGuide!:GPUTexture; surface!:GPUTexture; previousSurface!:GPUTexture; target!:GPUTexture; texture!:GPUTexture; guide!:GPUTexture; albedo!:GPUTexture;
 group!:GPUBindGroup; displayGroup!:GPUBindGroup; sampler!:GPUSampler;
 width=0; height=0; lightingWidth=0; lightingHeight=0; samples=0; seed=0; epoch=0; lastReason='initial';
 historyValid=false; moving=false;
 values=new Float32Array(44); textureWidth=0; textureHeight=0; disposed=false;
 static async create(canvas:HTMLCanvasElement,bvh:DynamicBVH,ink:HTMLCanvasElement) {
  if(!navigator.gpu)throw Error('WebGPU unavailable');
  const adapter=await navigator.gpu.requestAdapter({powerPreference:'low-power'});
  if(!adapter)throw Error('WebGPU adapter unavailable');
  const r=new PaperTracer();
  try {
   r.device=await adapter.requestDevice({requiredLimits:{maxStorageTexturesPerShaderStage:5}});r.context=canvas.getContext('webgpu')!;
   if(!r.context)throw Error('WebGPU canvas unavailable');
   r.context.configure({device:r.device,format:navigator.gpu.getPreferredCanvasFormat(),alphaMode:'premultiplied'});
   const module=r.device.createShaderModule({code:shader});
   const info=await module.getCompilationInfo();if(info.messages.some(x=>x.type==='error'))throw Error(info.messages.map(x=>x.message).join('\n'));
   r.pipeline=await r.device.createComputePipelineAsync({layout:'auto',compute:{module,entryPoint:'main'}});
   r.filter=await r.device.createComputePipelineAsync({layout:'auto',compute:{module:r.device.createShaderModule({code:filterShader}),entryPoint:'main'}});
   const display=r.device.createShaderModule({code:displayShader});
   r.display=await r.device.createRenderPipelineAsync({layout:'auto',vertex:{module:display,entryPoint:'vs'},fragment:{module:display,entryPoint:'fs',targets:[{format:navigator.gpu.getPreferredCanvasFormat()}]},primitive:{topology:'triangle-list'}});
   const buffer=(size:number)=>r.device.createBuffer({size,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC});
   r.nodes=buffer(bvh.nodeData.byteLength);r.triangles=buffer(bvh.triData.byteLength);r.previousTriangles=buffer(bvh.triData.byteLength);
   r.uniform=r.device.createBuffer({size:176,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
   r.sampler=r.device.createSampler({magFilter:'linear',minFilter:'linear'});
   const rt=slabRT(.25,65,.07);
   // Distant neutral softbox: uniform irradiance over a flat calendar.
   // Radiance calibrated against the nominal white paper reflectance, not its pose.
   r.values.set([-20,30,200,140],8);r.values.set([120,-.04,10.7,-1],12);
   r.values.set([rt.R,rt.T,.001,.75],16);r.values.set([6,1,1,0],20);
   r.upload(bvh);r.setInk(ink);return r;
  } catch(error){r.dispose();throw error;}
 }
 setInk(ink:HTMLCanvasElement){
  if(this.textureWidth!==ink.width||this.textureHeight!==ink.height){
   this.texture?.destroy();this.textureWidth=ink.width;this.textureHeight=ink.height;
   this.texture=this.device.createTexture({size:[ink.width,ink.height],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});
   if(this.target)this.bind();
  }
  this.device.queue.copyExternalImageToTexture({source:ink},{texture:this.texture},[ink.width,ink.height]);this.reset('calendarpaint');
 }
 setCamera(camera:PerspectiveCamera,width:number,height:number){
  const p=camera.projectionMatrix.elements;
  const next=[camera.position.x,camera.position.y,camera.position.z,0,1/p[0],1/p[5],p[8]/p[0],p[9]/p[5]];
  let changed=false;
  for(let i=0;i<4;i++){if(this.values[4+i]!==Math.fround(next[i]))changed=true;this.values[4+i]=next[i];}
  for(let i=0;i<4;i++){if(this.values[24+i]!==Math.fround(next[4+i]))changed=true;this.values[24+i]=next[4+i];}
  width=Math.max(1,Math.round(width));height=Math.max(1,Math.round(height));
  if(width!==this.width||height!==this.height){
   this.width=width;this.height=height;const canvas=this.context.canvas as HTMLCanvasElement;canvas.width=width;canvas.height=height;
   this.destroyTargets();
   this.lightingWidth=Math.ceil(width/2);this.lightingHeight=Math.ceil(height/2);
   const make=()=>this.device.createTexture({size:[this.lightingWidth,this.lightingHeight],format:'rgba16float',usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST});
   this.filtered=make();this.target=make();this.guide=make();this.albedo=make();this.history=make();this.previousHistory=make();this.previousGuide=make();this.surface=make();this.previousSurface=make();
   this.bind();changed=true;
  }
  if(changed)this.reset('camera');
 }
 setBackground(color:{r:number;g:number;b:number}){
  if(this.values[28]===Math.fround(color.r)&&this.values[29]===Math.fround(color.g)&&this.values[30]===Math.fround(color.b))return;
  this.values.set([color.r,color.g,color.b,0],28);this.reset('background');
 }
 private bind(){
  this.group=this.device.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.nodes}},{binding:1,resource:{buffer:this.triangles}},{binding:2,resource:{buffer:this.previousTriangles}},{binding:3,resource:this.target.createView()},{binding:4,resource:{buffer:this.uniform}},{binding:5,resource:this.texture.createView()},{binding:6,resource:this.sampler},{binding:7,resource:this.guide.createView()},{binding:8,resource:this.albedo.createView()},{binding:9,resource:this.previousHistory.createView()},{binding:10,resource:this.previousGuide.createView()},{binding:11,resource:this.previousSurface.createView()},{binding:12,resource:this.history.createView()},{binding:13,resource:this.surface.createView()}]});
  this.filterGroup=this.device.createBindGroup({layout:this.filter.getBindGroupLayout(0),entries:[{binding:0,resource:this.target.createView()},{binding:1,resource:this.guide.createView()},{binding:2,resource:this.albedo.createView()},{binding:3,resource:this.filtered.createView()}]});
  this.displayGroup=this.device.createBindGroup({layout:this.display.getBindGroupLayout(0),entries:[{binding:0,resource:this.filtered.createView()},{binding:1,resource:this.surface.createView()},{binding:2,resource:this.texture.createView()},{binding:3,resource:this.sampler}]});
 }
 upload(bvh:DynamicBVH){this.device.queue.writeBuffer(this.nodes,0,bvh.nodeData);this.device.queue.writeBuffer(this.triangles,0,bvh.triData);this.samples=0;this.moving=true;this.lastReason='deformation';}
 reset(reason:string){this.historyValid=false;this.samples=0;this.epoch++;this.lastReason=reason;}
 render(){
  if(!this.group||this.disposed)return;
  const u=new Uint32Array(this.values.buffer);u[0]=this.lightingWidth;u[1]=this.lightingHeight;u[2]=this.samples;u[3]=this.seed++;
  this.values[40]=this.historyValid?1:0;this.values[41]=this.moving?1:0;
  this.device.queue.writeBuffer(this.uniform,0,this.values);
  const encoder=this.device.createCommandEncoder(),pass=encoder.beginComputePass();pass.setPipeline(this.pipeline);pass.setBindGroup(0,this.group);pass.dispatchWorkgroups(Math.ceil(this.lightingWidth/8),Math.ceil(this.lightingHeight/8));pass.end();
  const filter=encoder.beginComputePass();filter.setPipeline(this.filter);filter.setBindGroup(0,this.filterGroup);filter.dispatchWorkgroups(Math.ceil(this.lightingWidth/8),Math.ceil(this.lightingHeight/8));filter.end();
  const draw=encoder.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}]});
  draw.setPipeline(this.display);draw.setBindGroup(0,this.displayGroup);draw.draw(3);draw.end();
  for(const [from,to] of [[this.history,this.previousHistory],[this.guide,this.previousGuide],[this.surface,this.previousSurface]])encoder.copyTextureToTexture({texture:from},{texture:to},[this.lightingWidth,this.lightingHeight]);
  encoder.copyBufferToBuffer(this.triangles,0,this.previousTriangles,0,this.triangles.size);
  this.device.queue.submit([encoder.finish()]);this.samples++;this.historyValid=true;this.moving=false;
  this.values.set(this.values.subarray(4,8),32);this.values.set(this.values.subarray(24,28),36);
 }
 private destroyTargets(){for(const t of [this.filtered,this.target,this.guide,this.albedo,this.history,this.previousHistory,this.previousGuide,this.surface,this.previousSurface])t?.destroy();}
 dispose(){this.disposed=true;this.nodes?.destroy();this.triangles?.destroy();this.previousTriangles?.destroy();this.uniform?.destroy();this.destroyTargets();this.texture?.destroy();this.context?.unconfigure();this.device?.destroy();}
}
