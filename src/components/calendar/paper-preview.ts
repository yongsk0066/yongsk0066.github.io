import * as THREE from 'three';
import {createPaperFallbackMaterial} from './paper-webgl';
import {PaperPhysics} from './paper-physics';
import {ClothSim,PAPER_PARAMS} from './vendor/holocloth/cloth';

// Canvas is the existing HTML-in-Canvas surface (or its explicit SVG fallback).
export function createPaperPreview(panel:HTMLElement, canvas:HTMLCanvasElement, options:{rail?:boolean;compact?:boolean;overflow?:number;pixelRatio?:number;lighting?:boolean;worker?:boolean}={}){
 const stage=panel.querySelector('.paper-stage') as HTMLElement;
 const status=panel.querySelector('[role=status]')!;
 let renderer:THREE.WebGLRenderer, scene:THREE.Scene, camera:THREE.PerspectiveCamera;
 let sim:ClothSim, mesh:THREE.Mesh, geometry:THREE.PlaneGeometry, material:THREE.MeshLambertMaterial;
 let texture:THREE.CanvasTexture, rail:THREE.Mesh, height=5, frame=0, last=0, visible=false, paused=false;
 let loaded=false, textureRevision=0, geometryDirty=true;
 let textureWidth=0,textureHeight=0;
 let lighting:Awaited<ReturnType<typeof import('./lighting/preview').createPaperLighting>>|undefined;
 let physics:PaperPhysics|undefined,quietFrames=0,sleeping=false;
 let fallbackDirty=true;
 function invalidate(){fallbackDirty=true;start();}
 function wake(){physics?.interrupt();sleeping=false;quietFrames=0;start();}
 // Keep the last completed paint while the native source canvas is resized.
 const paintedCanvas=document.createElement('canvas');
 const paintedContext=paintedCanvas.getContext('2d')!;
 function syncTexture(){
  if(paintedCanvas.width!==canvas.width)paintedCanvas.width=canvas.width;
  if(paintedCanvas.height!==canvas.height)paintedCanvas.height=canvas.height;
  paintedContext.clearRect(0,0,paintedCanvas.width,paintedCanvas.height);
  paintedContext.drawImage(canvas,0,0);
  if(!texture || textureWidth!==canvas.width || textureHeight!==canvas.height){
   const old=texture;texture=new THREE.CanvasTexture(paintedCanvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
   textureWidth=canvas.width;textureHeight=canvas.height;
   if(material)material.map=texture;old?.dispose();
  }
  texture.needsUpdate=true;lighting?.paint();invalidate();
 }
 const params={...PAPER_PARAMS};
 const motionEpsilon=1e-6;
 const pointer=new THREE.Vector2(), ray=new THREE.Raycaster(), dragPlane=new THREE.Plane(), hit=new THREE.Vector3();
 const grabOrigin = new THREE.Vector3();
 let liftProgress = 0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let sourceAspect:string|undefined;
 function rebuild(){
  const nextHeight=4*canvas.height/canvas.width;
  const aspect=canvas.dataset.paperAspect;
  if(sim && (aspect ? aspect===sourceAspect : Math.abs(nextHeight-height)<.01))return;
  sourceAspect=aspect;
  height=nextHeight;sim=new ClothSim(4,height,24,Math.round(24*height/4));
  physics?.dispose();physics=new PaperPhysics(sim,options.worker===true,start);
  geometry?.dispose();geometry=new THREE.PlaneGeometry(4,height,sim.segX,sim.segY);
  geometry.setIndex(sim.triangleIndices);
  geometry.setAttribute('position',new THREE.BufferAttribute(sim.positions,3));geometryDirty=true;wake();
  if(mesh)mesh.geometry=geometry;else{mesh=new THREE.Mesh(geometry,material);scene.add(mesh);}
  if(rail){scene.remove(rail);rail.geometry.dispose();(rail.material as THREE.Material).dispose();}
  if(options.rail!==false){rail=new THREE.Mesh(new THREE.BoxGeometry(4.12,.065,.065),new THREE.MeshLambertMaterial({color:0x817e75}));
  rail.position.set(0,height/2+.015,.035);scene.add(rail);}
  resize();
 }
 let surfaceWidth=0,surfaceHeight=0,reservedRatio=0;
 function syncDrawingSize(notifyLighting=true){
  if(!renderer||!surfaceWidth||!surfaceHeight)return;
  const ratio=options.pixelRatio??Math.min(Math.max(devicePixelRatio,2),3);
  const width=Math.floor(surfaceWidth*ratio),height=Math.floor(surfaceHeight*ratio);
  if(!lighting?.active&&(renderer.domElement.width!==width||renderer.domElement.height!==height||renderer.getPixelRatio()!==ratio)){
   renderer.setDrawingBufferSize(surfaceWidth,surfaceHeight,ratio);
  }
  if(notifyLighting)lighting?.resize(width,height,Math.floor(surfaceWidth*reservedRatio),Math.floor(surfaceHeight*reservedRatio));
 }
 function resize(){
  if(!renderer || !visible)return;
  const w=stage.clientWidth,h=Math.round(options.compact?w*1.34:Math.min(900,Math.max(480,w*1.12)));
  const padding=options.overflow||0;
  stage.style.height=h+'px';stage.style.position='relative';
  if(padding)stage.style.overflow='visible';
  surfaceWidth=w+padding*2;surfaceHeight=h+padding*2;
  renderer.domElement.style.width=surfaceWidth+'px';renderer.domElement.style.height=surfaceHeight+'px';
  Object.assign(renderer.domElement.style,{position:'absolute',left:-padding+'px',top:-padding+'px',display:'block'});
  camera.aspect=w/h;
  const fov=THREE.MathUtils.degToRad(camera.fov/2);
  camera.position.set(0,0,Math.max(height/2/Math.tan(fov),2/Math.tan(fov)/camera.aspect)*(options.compact?1.06:1.19));
  camera.lookAt(0,0,0);
  if(padding)camera.setViewOffset(w,h,-padding,-padding,w+padding*2,h+padding*2);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();camera.updateMatrixWorld();syncDrawingSize();invalidate();
 }
 function init(){
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});}
  catch(e){status.textContent='WebGL을 사용할 수 없습니다. Canvas 탭에서 달력을 볼 수 있습니다.';return false;}
  renderer.outputColorSpace=THREE.SRGBColorSpace;stage.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','윗변이 고정된 종이 달력. 드래그로 움직이거나 살짝 흔들기 버튼을 사용하세요.');
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(36,1,.1,100);
  scene.add(new THREE.HemisphereLight(0xffffff,0xffffff,2.3));
  const light=new THREE.DirectionalLight(0xffffff,1.3);light.position.set(-3,5,7);scene.add(light);
  syncTexture();
  material=createPaperFallbackMaterial(texture);
  rebuild();
  const el=renderer.domElement;el.addEventListener('webglcontextrestored',invalidate);el.style.touchAction='none';el.style.cursor='grab';
  // The enlarged transparent surface must not block article links. Hit-test
  // document pointer events against the paper and capture only real grabs.
  const events=options.overflow?document:el;
  if(options.overflow)el.style.pointerEvents='none';
  function cast(e:PointerEvent){const r=el.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);}
  function calendarPointer(kind:string,contact?:THREE.Intersection){const uv=contact?.uv;canvas.dispatchEvent(new CustomEvent('calendarpointer',{detail:{kind:uv?kind:'leave',x:uv?.x??0,y:uv?1-uv.y:0}}));}
  el.addEventListener('pointerleave',()=>calendarPointer('leave'));
  events.addEventListener('pointerdown',(event)=>{
   const e=event as PointerEvent;if(!visible || e.button!==0)return;cast(e);const contact=ray.intersectObject(mesh)[0];if(!contact){canvas.dispatchEvent(new Event('paperoutside'));return;}calendarPointer('move',contact);if(canvas.dataset.interactive==='true'){calendarPointer('click',contact);return;}if(contact.point.y>height/2-.1)return;
   if(sim.startGrab(contact.point,.42)){
    grabOrigin.copy(contact.point);
    liftProgress = 0;
    dragPlane.setComponents(0, 0, 1, -grabOrigin.z);
    wake();e.preventDefault();el.setPointerCapture(e.pointerId);el.style.cursor='grabbing';
   }
  });
  events.addEventListener('pointermove',event=>{
   const e = event as PointerEvent;
   if (!visible) return;
   cast(e);
   if (!sim.isGrabbing) {
    calendarPointer('move', ray.intersectObject(mesh)[0]);
    el.style.cursor = canvas.dataset.interactive === 'true' ? 'pointer' : 'grab';
    return;
   }
   if (!ray.ray.intersectPlane(dragPlane, hit)) return;
   // Keep the achieved lift for this grab, including when the pointer doubles back.
   const travel = Math.hypot(hit.x - grabOrigin.x, hit.y - grabOrigin.y) / (sim.width * .07);
   liftProgress = Math.max(liftProgress, Math.min(1, travel));
   const lift = liftProgress * liftProgress * (3 - 2 * liftProgress);
   hit.z = grabOrigin.z + Math.max(0, .7 - grabOrigin.z) * lift;
   hit.x = THREE.MathUtils.clamp(hit.x, -3.8, 3.8);
   hit.y = THREE.MathUtils.clamp(hit.y, -height * .85, height * .48);
   sim.moveGrab(hit);
  });
  const end=()=>{if(sim?.isGrabbing){sim.endGrab();wake();}el.style.cursor='grab';};
  events.addEventListener('pointerup',end);events.addEventListener('pointercancel',end);el.addEventListener('lostpointercapture',end);
  loaded=true;
  if(options.lighting){
   stage.dataset.lighting='initializing';
   void import('./lighting/preview').then(m=>m.createPaperLighting(stage,el,geometry,paintedCanvas,camera,invalidate)).then(next=>{
    lighting=next;lighting.setVisible(visible);syncDrawingSize();lighting.paint();geometryDirty=true;invalidate();
   }).catch(()=>{stage.dataset.lighting='fallback';invalidate();});
  }
  return true;
 }
 function tick(now:number){
  if(!visible || document.hidden){frame=0;return;}
  const dt=(now-last)/1000;last=now;
  if((!paused&&!sleeping) || sim.isGrabbing){
   const delta=physics!.step(dt,params,lighting?.active?lighting.wallMinZ:undefined);
   if(delta!==undefined){
    if(delta>motionEpsilon){geometryDirty=true;quietFrames=0;}
    else if(++quietFrames>60 && !sim.isGrabbing && (lighting?.active || sim.flatAtRest(motionEpsilon))){
     sleeping=true;physics!.interrupt();
    }
   }
  }
  const changed=geometryDirty;
  if(changed){geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();geometryDirty=false;}
  lighting?.draw(geometry,changed);
  if(!lighting?.active && (changed || fallbackDirty)){syncDrawingSize(false);renderer.render(scene,camera);fallbackDirty=false;}
  const running=(!paused&&!sleeping)||sim.isGrabbing||lighting?.needsFrame;
  frame=running?requestAnimationFrame(tick):0;
 }
 function start(){if(!frame && loaded && visible && !document.hidden){last=performance.now();frame=requestAnimationFrame(tick);}}
 canvas.addEventListener('calendarpaint',()=>{if(!loaded)return;syncTexture();textureRevision++;rebuild();status.textContent=`${canvas.dataset.date?.replace('-','년 ')}월 · 윗변 고정 · 무광 종이 · ${canvas.dataset.mode==='native'?'HTML-in-Canvas':'SVG Canvas 대체 경로'}`;});
 panel.querySelector('[data-paper-reset]')!.addEventListener('click',()=>{sim?.reset();wake();geometryDirty=true;});
 panel.querySelector('[data-paper-poke]')!.addEventListener('click',()=>{if(!sim)return;wake();geometryDirty=true;for(let i=sim.cols;i<sim.count;i++){const y=Math.floor(i/sim.cols)/sim.segY;sim.positions[i*3+2]+=.075*Math.sin(i%sim.cols/sim.segX*Math.PI)*y*y;}});
 panel.querySelector('[data-paper-pause]')!.addEventListener('click',e=>{paused=!paused;wake();(e.currentTarget as HTMLElement).textContent=paused?'움직임 재개':'일시정지';(e.currentTarget as HTMLElement).setAttribute('aria-pressed',String(paused));});
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){cancelAnimationFrame(frame);frame=0;}
  else start();
 });
 new ResizeObserver(resize).observe(stage);
 const api={reservePixelRatio(ratio:number){
  if(reservedRatio===ratio)return;
  reservedRatio=ratio;syncDrawingSize();invalidate();
 },setPixelRatio(ratio:number){
  if(options.pixelRatio===ratio)return;
  options.pixelRatio=ratio;
  if(!renderer)return;
  syncDrawingSize();invalidate();
  // Resize and redraw in the same task; never present a cleared WebGL buffer.
  if(lighting?.active)lighting.draw(geometry,false);else renderer.render(scene,camera);
 },getTopOffset(){if(!camera)return 0;const top=new THREE.Vector3(0,height/2,0).project(camera);return (1-top.y)/2*(stage.clientHeight+2*(options.overflow||0))-(options.overflow||0);},show(){visible=true;lighting?.setVisible(true);if(!loaded && !init())return;rebuild();syncTexture();resize();start();},hide(){visible=false;lighting?.setVisible(false);sim?.endGrab();physics?.interrupt();cancelAnimationFrame(frame);frame=0;},getState(){return {loaded,lighting:lighting?.state,textureRevision,positions:sim?Array.from(sim.positions):[],cols:sim?.cols,height,grabbing:sim?.isGrabbing,paused,visible,material:sim?.measure()};}};
 if(reduced){paused=true;panel.querySelector('[data-paper-pause]')!.textContent='움직임 재개';panel.querySelector('[data-paper-pause]')!.setAttribute('aria-pressed','true');}
 return api;
};

(window as any).createPaperPreview=createPaperPreview;
