import {Color, type PlaneGeometry, type PerspectiveCamera} from 'three';
import {DynamicBVH} from './bvh';
import {PaperTracer} from './renderer';

export async function createPaperLighting(stage:HTMLElement, fallback:HTMLCanvasElement, geometry:PlaneGeometry, ink:HTMLCanvasElement, camera:PerspectiveCamera){
 const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');
 canvas.dataset.paperLighting='path-traced';
 let bvh=new DynamicBVH(geometry),currentGeometry=geometry,active=false,failed=false,busy=false,visible=true;
 const tracer=await PaperTracer.create(canvas,bvh,ink);
 const background=new Color();
 function fail(){
  if(failed)return;failed=true;active=false;fallback.style.opacity='1';canvas.remove();stage.dataset.lighting='fallback';tracer.dispose();
 }
 tracer.device.addEventListener('uncapturederror',fail);
 void tracer.device.lost.then(()=>{if(!tracer.disposed)fail();});
 function layout(){
  canvas.style.cssText=fallback.style.cssText;canvas.style.pointerEvents='none';canvas.style.opacity=active?'1':'0';
  tracer.setCamera(camera,fallback.width,fallback.height);
 }
 function syncBackground(){background.setStyle(getComputedStyle(document.body).backgroundColor);tracer.setBackground(background);}
 stage.append(canvas);layout();syncBackground();
 return {
  draw(next:PlaneGeometry,changed:boolean){
   if(failed||!visible)return;
   try{
    if(next!==currentGeometry){
     // Calendar rows have a fixed aspect ratio; an unexpected topology change
     // falls back safely instead of writing beyond the existing GPU buffers.
     fail();return;
    }
    if(changed){bvh.refit();tracer.upload(bvh);}
    if(busy)return;
    layout();
    if(tracer.samples>=128)return;
    busy=true;tracer.render();
    void tracer.device.queue.onSubmittedWorkDone().then(()=>{
     busy=false;if(failed||!visible)return;active=true;canvas.style.opacity='1';fallback.style.opacity='0';stage.dataset.lighting='path-traced';
    }).catch(fail);
   }catch{fail();}
  },
  paint(){if(failed)return;try{tracer.setInk(ink);syncBackground();}catch{fail();}},
  setVisible(value:boolean){visible=value;canvas.hidden=!value;},
  get active(){return active&&!failed;},
  get state(){return {active,failed,samples:tracer.samples,epoch:tracer.epoch,width:tracer.width,height:tracer.height};},
  dispose:fail,
 };
}
