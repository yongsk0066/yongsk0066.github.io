import * as THREE from 'three';
import paperColor from './textures/paper001-color.jpg?url';
import paperBump from './textures/paper001-bump.jpg?url';
import {ClothSim,PAPER_PARAMS} from './vendor/holocloth/cloth';

// Canvas is the existing HTML-in-Canvas surface (or its explicit SVG fallback).
export function createPaperPreview(panel:HTMLElement, canvas:HTMLCanvasElement, options:{rail?:boolean;compact?:boolean;overflow?:number;pixelRatio?:number;lighting?:boolean}={}){
 const stage=panel.querySelector('.paper-stage') as HTMLElement;
 const status=panel.querySelector('[role=status]')!;
 let renderer:THREE.WebGLRenderer, scene:THREE.Scene, camera:THREE.PerspectiveCamera;
 let sim:ClothSim, mesh:THREE.Mesh, geometry:THREE.PlaneGeometry, material:THREE.MeshLambertMaterial;
 let texture:THREE.CanvasTexture, rail:THREE.Mesh, height=5, frame=0, last=0, visible=false, paused=false;
 let loaded=false, time=0, textureRevision=0, geometryDirty=true;
 let textureWidth=0,textureHeight=0;
 let lighting:Awaited<ReturnType<typeof import('./lighting/preview').createPaperLighting>>|undefined;
 let previousPositions:Float32Array|undefined,quietFrames=0,sleeping=false;
 const wake=()=>{sleeping=false;quietFrames=0;};
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
  texture.needsUpdate=true;lighting?.paint();
 }
 const params={...PAPER_PARAMS};
 const pointer=new THREE.Vector2(), ray=new THREE.Raycaster(), dragPlane=new THREE.Plane(), hit=new THREE.Vector3();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const fiber=new THREE.TextureLoader().load(paperColor);fiber.colorSpace=THREE.SRGBColorSpace;fiber.wrapS=fiber.wrapT=THREE.RepeatWrapping;fiber.repeat.set(3,4);
 const bump=new THREE.TextureLoader().load(paperBump);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;bump.repeat.set(3,4);
 function rebuild(){
  const nextHeight=4*canvas.height/canvas.width;
  if(sim && Math.abs(nextHeight-height)<.01)return;
  height=nextHeight;sim=new ClothSim(4,height,24,Math.round(24*height/4));
  geometry?.dispose();geometry=new THREE.PlaneGeometry(4,height,sim.segX,sim.segY);
  geometry.setAttribute('position',new THREE.BufferAttribute(sim.positions,3));geometryDirty=true;previousPositions=new Float32Array(sim.positions);wake();
  if(mesh)mesh.geometry=geometry;else{mesh=new THREE.Mesh(geometry,material);scene.add(mesh);}
  if(rail){scene.remove(rail);rail.geometry.dispose();(rail.material as THREE.Material).dispose();}
  if(options.rail!==false){rail=new THREE.Mesh(new THREE.BoxGeometry(4.12,.065,.065),new THREE.MeshLambertMaterial({color:0x817e75}));
  rail.position.set(0,height/2+.015,.035);scene.add(rail);}
  resize();
 }
 function resize(){
  if(!renderer || !visible)return;
  const w=stage.clientWidth,h=Math.round(options.compact?w*1.34:Math.min(900,Math.max(480,w*1.12)));
  const padding=options.overflow||0;
  stage.style.height=h+'px';stage.style.position='relative';
  if(padding)stage.style.overflow='visible';
  renderer.setPixelRatio(options.pixelRatio??Math.min(Math.max(devicePixelRatio,2),3));
  renderer.setSize(w+padding*2,h+padding*2);
  Object.assign(renderer.domElement.style,{position:'absolute',left:-padding+'px',top:-padding+'px',display:'block'});
  camera.aspect=w/h;
  const fov=THREE.MathUtils.degToRad(camera.fov/2);
  camera.position.set(0,0,Math.max(height/2/Math.tan(fov),2/Math.tan(fov)/camera.aspect)*(options.compact?1.06:1.19));
  camera.lookAt(0,0,0);
  if(padding)camera.setViewOffset(w,h,-padding,-padding,w+padding*2,h+padding*2);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();camera.updateMatrixWorld();
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
  // Lambert has diffuse lighting only: no specular, clearcoat, iridescence or foil.
  material=new THREE.MeshLambertMaterial({map:texture,side:THREE.DoubleSide,bumpMap:bump,bumpScale:.002,color:0xffffff});
  material.onBeforeCompile=shader=>{
   shader.uniforms.paperFiber={value:fiber};
   shader.fragmentShader='uniform sampler2D paperFiber;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    vec3 grain=texture2D(paperFiber,vMapUv*vec2(3.0,4.0)).rgb;
    // Neutral luminance variation only; never tint the white calendar.
    float fiberValue=dot(grain,vec3(0.2126,0.7152,0.0722));
    diffuseColor.rgb *= 1.0-(1.0-fiberValue)*0.025;
    if(!gl_FrontFacing) diffuseColor.rgb=vec3(1.0-(1.0-fiberValue)*0.025);`);
  };
  rebuild();
  const el=renderer.domElement;el.style.touchAction='none';el.style.cursor='grab';
  // The enlarged transparent surface must not block article links. Hit-test
  // document pointer events against the paper and capture only real grabs.
  const events=options.overflow?document:el;
  if(options.overflow)el.style.pointerEvents='none';
  function cast(e:PointerEvent){const r=el.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);}
  function calendarPointer(kind:string,contact?:THREE.Intersection){const uv=contact?.uv;canvas.dispatchEvent(new CustomEvent('calendarpointer',{detail:{kind:uv?kind:'leave',x:uv?.x??0,y:uv?1-uv.y:0}}));}
  el.addEventListener('pointerleave',()=>calendarPointer('leave'));
  events.addEventListener('pointerdown',(event)=>{
   const e=event as PointerEvent;if(!visible || e.button!==0)return;cast(e);const contact=ray.intersectObject(mesh)[0];if(!contact){canvas.dispatchEvent(new Event('paperoutside'));return;}calendarPointer('move',contact);if(canvas.dataset.interactive==='true'){calendarPointer('click',contact);return;}if(contact.point.y>height/2-.1)return;
   dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0,0,1),contact.point);
   if(sim.startGrab(contact.point,.42)){wake();e.preventDefault();el.setPointerCapture(e.pointerId);el.style.cursor='grabbing';}
  });
  events.addEventListener('pointermove',event=>{const e=event as PointerEvent;if(!visible)return;if(!sim.isGrabbing){cast(e);calendarPointer('move',ray.intersectObject(mesh)[0]);el.style.cursor=canvas.dataset.interactive==='true'?'pointer':'grab';return;}cast(e);if(ray.ray.intersectPlane(dragPlane,hit)){hit.x=THREE.MathUtils.clamp(hit.x,-2.6,2.6);hit.y=THREE.MathUtils.clamp(hit.y,-height*.65,height*.45);hit.z=.7;sim.moveGrab(hit);}});
  const end=()=>{sim?.endGrab();el.style.cursor='grab';};
  events.addEventListener('pointerup',end);events.addEventListener('pointercancel',end);el.addEventListener('lostpointercapture',end);
  loaded=true;
  if(options.lighting){
   stage.dataset.lighting='initializing';
   void import('./lighting/preview').then(m=>m.createPaperLighting(stage,el,geometry,paintedCanvas,camera)).then(next=>{
    lighting=next;lighting.setVisible(visible);lighting.paint();geometryDirty=true;
   }).catch(()=>{stage.dataset.lighting='fallback';});
  }
  return true;
 }
 function tick(now:number){
  if(!visible || document.hidden){frame=0;return;}
  const dt=Math.min((now-last)/1000||1/60,.033);last=now;time+=dt;
  if((!paused&&!sleeping) || sim.isGrabbing){
   previousPositions!.set(sim.positions);sim.step(dt,params);
   if(lighting?.active)sim.constrainWall(-.208);
   let delta=0;for(let i=0;i<sim.positions.length;i++)delta=Math.max(delta,Math.abs(sim.positions[i]-previousPositions![i]));
   if(delta>1e-6){geometryDirty=true;quietFrames=0;}else if(++quietFrames>60&&!sim.isGrabbing&&lighting?.active)sleeping=true;
  }
  const changed=geometryDirty;
  if(changed){geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();geometryDirty=false;}
  lighting?.draw(geometry,changed);
  if(!lighting?.active)renderer.render(scene,camera);
  frame=requestAnimationFrame(tick);
 }
 function start(){if(!frame && visible && !document.hidden){last=performance.now();frame=requestAnimationFrame(tick);}}
 canvas.addEventListener('calendarpaint',()=>{if(!loaded)return;syncTexture();textureRevision++;rebuild();status.textContent=`${canvas.dataset.date?.replace('-','년 ')}월 · 윗변 고정 · 무광 종이 · ${canvas.dataset.mode==='native'?'HTML-in-Canvas':'SVG Canvas 대체 경로'}`;});
 panel.querySelector('[data-paper-reset]')!.addEventListener('click',()=>{sim?.reset();wake();geometryDirty=true;});
 panel.querySelector('[data-paper-poke]')!.addEventListener('click',()=>{if(!sim)return;wake();geometryDirty=true;for(let i=sim.cols;i<sim.count;i++){const y=Math.floor(i/sim.cols)/sim.segY;sim.positions[i*3+2]+=.075*Math.sin(i%sim.cols/sim.segX*Math.PI)*y*y;}});
 panel.querySelector('[data-paper-pause]')!.addEventListener('click',e=>{paused=!paused;wake();(e.currentTarget as HTMLElement).textContent=paused?'움직임 재개':'일시정지';(e.currentTarget as HTMLElement).setAttribute('aria-pressed',String(paused));});
 document.addEventListener('visibilitychange',start);new ResizeObserver(resize).observe(stage);
 const api={setPixelRatio(ratio:number){
  options.pixelRatio=ratio;
  if(!renderer || Math.abs(renderer.getPixelRatio()-ratio)<.002)return;
  renderer.setPixelRatio(ratio);
  // Resize and redraw in the same task; never present a cleared WebGL buffer.
  if(lighting?.active)lighting.draw(geometry,false);else renderer.render(scene,camera);
 },getTopOffset(){if(!camera)return 0;const top=new THREE.Vector3(0,height/2,0).project(camera);return (1-top.y)/2*(stage.clientHeight+2*(options.overflow||0))-(options.overflow||0);},show(){visible=true;lighting?.setVisible(true);if(!loaded && !init())return;rebuild();syncTexture();resize();start();},hide(){visible=false;lighting?.setVisible(false);sim?.endGrab();cancelAnimationFrame(frame);frame=0;},getState(){return {loaded,lighting:lighting?.state,textureRevision,positions:sim?Array.from(sim.positions):[],cols:sim?.cols,height,grabbing:sim?.isGrabbing,paused,visible,material:sim?.measure()};}};
 if(reduced){paused=true;panel.querySelector('[data-paper-pause]')!.textContent='움직임 재개';panel.querySelector('[data-paper-pause]')!.setAttribute('aria-pressed','true');}
 return api;
};

(window as any).createPaperPreview=createPaperPreview;
