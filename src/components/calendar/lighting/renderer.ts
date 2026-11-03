import shader from './tracer.wgsl?raw';
import {DynamicBVH} from './bvh';
import {slabRT} from './material';
import type {PerspectiveCamera} from 'three';

/** Progressive paper path tracer. All resources belong to this preview instance. */
export class PaperTracer {
 device!:GPUDevice; context!:GPUCanvasContext; pipeline!:GPUComputePipeline; display!:GPURenderPipeline;
 nodes!:GPUBuffer; triangles!:GPUBuffer; uniform!:GPUBuffer; accum!:GPUBuffer; target!:GPUTexture; texture!:GPUTexture;
 group!:GPUBindGroup; displayGroup!:GPUBindGroup; sampler!:GPUSampler;
 width=0; height=0; samples=0; seed=0; epoch=0; lastReason='initial';
 values=new Float32Array(36); textureWidth=0; textureHeight=0; disposed=false;
 static async create(canvas:HTMLCanvasElement,bvh:DynamicBVH,ink:HTMLCanvasElement) {
  if(!navigator.gpu)throw Error('WebGPU unavailable');
  const adapter=await navigator.gpu.requestAdapter({powerPreference:'low-power'});
  if(!adapter)throw Error('WebGPU adapter unavailable');
  const r=new PaperTracer();
  try {
   r.device=await adapter.requestDevice();r.context=canvas.getContext('webgpu')!;
   if(!r.context)throw Error('WebGPU canvas unavailable');
   r.context.configure({device:r.device,format:navigator.gpu.getPreferredCanvasFormat(),alphaMode:'premultiplied'});
   const module=r.device.createShaderModule({code:shader});
   const info=await module.getCompilationInfo();if(info.messages.some(x=>x.type==='error'))throw Error(info.messages.map(x=>x.message).join('\n'));
   r.pipeline=await r.device.createComputePipelineAsync({layout:'auto',compute:{module,entryPoint:'main'}});
   const display=r.device.createShaderModule({code:`
    @group(0) @binding(0) var image:texture_2d<f32>;
    @vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {let x=f32((i<<1u)&2u);let y=f32(i&2u);return vec4f(x*2.-1.,y*2.-1.,0,1);}
    @fragment fn fs(@builtin(position) p:vec4f)->@location(0) vec4f {
     let sample=textureLoad(image,vec2i(p.xy),0);let alpha=sample.a;
     let x=max(sample.rgb/max(alpha,.00001),vec3f(0));
     // ACES fitted display curve; preserve linear accumulation until presentation.
     let mapped=clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),vec3f(0),vec3f(1));
     let color=select(12.92*mapped,1.055*pow(mapped,vec3f(1./2.4))-.055,mapped>vec3f(.0031308));
     return vec4f(color*alpha,alpha);
    }`});
   r.display=await r.device.createRenderPipelineAsync({layout:'auto',vertex:{module:display,entryPoint:'vs'},fragment:{module:display,entryPoint:'fs',targets:[{format:navigator.gpu.getPreferredCanvasFormat()}]},primitive:{topology:'triangle-list'}});
   const buffer=(size:number)=>r.device.createBuffer({size,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
   r.nodes=buffer(bvh.nodeData.byteLength);r.triangles=buffer(bvh.triData.byteLength);
   r.uniform=r.device.createBuffer({size:144,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
   r.sampler=r.device.createSampler({magFilter:'linear',minFilter:'linear'});
   const rt=slabRT(.25,65,.07);
   r.values.set([-6,8,20,14],8);r.values.set([12,-.22,20,-1],12);
   r.values.set([rt.R,rt.T,.025,.48],16);r.values.set([6,1,1,0],20);
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
   this.accum?.destroy();this.target?.destroy();
   this.accum=this.device.createBuffer({size:width*height*16,usage:GPUBufferUsage.STORAGE});
   this.target=this.device.createTexture({size:[width,height],format:'rgba16float',usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING});
   this.bind();changed=true;
  }
  if(changed)this.reset('camera');
 }
 setBackground(color:{r:number;g:number;b:number}){
  if(this.values[28]===Math.fround(color.r)&&this.values[29]===Math.fround(color.g)&&this.values[30]===Math.fround(color.b))return;
  this.values.set([color.r,color.g,color.b,0],28);this.reset('background');
 }
 private bind(){
  this.group=this.device.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.nodes}},{binding:1,resource:{buffer:this.triangles}},{binding:2,resource:{buffer:this.accum}},{binding:3,resource:this.target.createView()},{binding:4,resource:{buffer:this.uniform}},{binding:5,resource:this.texture.createView()},{binding:6,resource:this.sampler}]});
  this.displayGroup=this.device.createBindGroup({layout:this.display.getBindGroupLayout(0),entries:[{binding:0,resource:this.target.createView()}]});
 }
 upload(bvh:DynamicBVH){this.device.queue.writeBuffer(this.nodes,0,bvh.nodeData);this.device.queue.writeBuffer(this.triangles,0,bvh.triData);this.reset('deformation');}
 reset(reason:string){this.samples=0;this.epoch++;this.lastReason=reason;}
 render(){
  if(!this.group||this.disposed)return;
  const u=new Uint32Array(this.values.buffer);u[0]=this.width;u[1]=this.height;u[2]=this.samples;u[3]=this.seed++;
  this.device.queue.writeBuffer(this.uniform,0,this.values);
  const encoder=this.device.createCommandEncoder(),pass=encoder.beginComputePass();pass.setPipeline(this.pipeline);pass.setBindGroup(0,this.group);pass.dispatchWorkgroups(Math.ceil(this.width/8),Math.ceil(this.height/8));pass.end();
  const draw=encoder.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}]});
  draw.setPipeline(this.display);draw.setBindGroup(0,this.displayGroup);draw.draw(3);draw.end();this.device.queue.submit([encoder.finish()]);this.samples++;
 }
 dispose(){this.disposed=true;this.nodes?.destroy();this.triangles?.destroy();this.uniform?.destroy();this.accum?.destroy();this.target?.destroy();this.texture?.destroy();this.context?.unconfigure();this.device?.destroy();}
}
