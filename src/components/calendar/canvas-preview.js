// Draw the calendar's exact SVG DOM with HTML-in-Canvas where supported.
export function createCalendarCanvas(calendar, panel, options = {}) {
 const canvas=panel.querySelector('canvas'), status=panel.querySelector('[role="status"]');
 const ctx=canvas.getContext('2d');
 const source=document.createElement('div');source.setAttribute('drawable','');
 const shadow=source.attachShadow({mode:'open'});canvas.append(source);
 let native=canvas.content==='drawable' && typeof ctx.drawElementImage==='function' && typeof canvas.requestPaint==='function';
 let revision=0, image=null, frame=0, snapshot='', ready=false, hover=null;
 const save=panel.querySelector('button');
 function complete(mode){
  canvas.dataset.mode=mode;canvas.dataset.date=`${calendar.year}-${calendar.month}`;
  ready=true;save.disabled=false;canvas.dispatchEvent(new Event('calendarpaint'));
  status.textContent=mode==='native'?'HTML-in-Canvas · 달력 DOM을 직접 렌더링':'SVG → Canvas · 이 브라우저는 HTML-in-Canvas 미지원 (숫자 선택은 달력 탭에서 가능)';
 }
 function clear(){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);}
 function drawFallback(){
  if(!image)return;clear();ctx.drawImage(image,0,0,canvas.width,canvas.height);
  if(hover){
   ctx.save();ctx.scale(canvas.width/2148,canvas.height/2679);ctx.globalCompositeOperation='multiply';ctx.fillStyle=calendar.hoverColor;
   if(hover.cell!==undefined){ctx.beginPath();ctx.roundRect(16,612,2117,1766,28);ctx.clip();ctx.fillRect(15+(hover.cell%7)*303,611+Math.floor(hover.cell/7)*354,301,352);}
   else if(hover.month){ctx.beginPath();ctx.roundRect(hover.month===calendar.hitTest(20,100)?.month?14:1529,73,607,335,30);ctx.fill();}
   ctx.restore();
  }
  complete('fallback');
 }
 async function loadFallback(){
  const token=++revision, url=URL.createObjectURL(new Blob([snapshot],{type:'image/svg+xml'}));
  try{const next=new Image();next.src=url;await next.decode();if(token!==revision)return;image=next;drawFallback();}
  catch(error){status.textContent='캔버스 렌더링 실패: '+error.message;}
  finally{URL.revokeObjectURL(url);}
 }
 canvas.addEventListener('paint',()=>{
  if(!native || !snapshot || panel.hidden)return;
  try{clear();ctx.drawElementImage(source,0,0,canvas.width,canvas.height);complete('native');}
  catch(error){native=false;canvas.removeAttribute('content');loadFallback();}
 });
 function resize(){
  if(panel.hidden || !snapshot)return;
  const width=canvas.getBoundingClientRect().width;if(!width)return;
  const svg=shadow.querySelector('svg'), vb=svg.viewBox.baseVal;
  const height=width*vb.height/vb.width;
  source.style.width=width+'px';source.style.height=height+'px';
  canvas.style.height=height+'px';
  const ratio=Math.max(options.pixelRatio||window.devicePixelRatio||1,(options.textureWidth||0)/width);
  const w=Math.round(width*ratio),h=Math.round(height*ratio);
  if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;
  if(native)canvas.requestPaint();else drawFallback();
 }
 function refresh(){
  if(panel.hidden)return;
  const next=calendar.toSVG();
  if(next!==snapshot){
   snapshot=next;hover=null;ready=false;save.disabled=true;image=null;
   shadow.innerHTML='<style>:host{display:block;background:white}svg{display:block;width:100%;height:auto}</style>'+snapshot;
   canvas.setAttribute('aria-label',`${calendar.year}년 ${calendar.month}월 윤전달력`);
   if(!native)loadFallback();
  }
  resize();
 }
 function interact(kind,x,y){
  const monthTitle=options.onMonthClick && x*2148>=820 && x*2148<=1320 && y*2679>=0 && y*2679<=340;
  const hit=kind==='leave'?null:monthTitle?{action:'expand'}:calendar.hitTest(x*2148,y*2679);
  canvas.dataset.interactive=hit?.month||hit?.action?'true':'false';
  if(kind==='click'){if(hit?.action==='expand')options.onMonthClick();else calendar.activate(hit);return;}
  if(JSON.stringify(hit)===JSON.stringify(hover))return;
  hover=hit;calendar.highlight(shadow,hit);
  for(const mini of shadow.querySelectorAll('[data-mini-month]'))mini.querySelector('.mini-hover').style.fill=hit?.month===+mini.dataset.miniMonth?calendar.hoverColor:'';
  canvas.style.cursor=hit?.month?'pointer':'default';
  if(native)canvas.requestPaint();else drawFallback();
 }
 for(const [event,kind] of [['pointermove','move'],['click','click'],['pointerleave','leave']])canvas.addEventListener(event,e=>{const r=canvas.getBoundingClientRect();interact(kind,(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);});
 canvas.addEventListener('calendarpointer',e=>interact(e.detail.kind,e.detail.x,e.detail.y));
 shadow.addEventListener('keydown',e=>{const mini=e.target.closest?.('[data-mini-month]');if(mini&&(e.key==='Enter'||e.key===' ')){e.preventDefault();calendar.activate({year:+mini.dataset.miniYear,month:+mini.dataset.miniMonth});}});
 const observer=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(resize);});observer.observe(canvas);
 window.addEventListener('resize',resize);
 calendar.addEventListener('datechange',refresh);
 save.onclick=()=>{if(!ready)return;canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`yunjeon-${calendar.year}-${String(calendar.month).padStart(2,'0')}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},'image/png');};
 return {refresh,setPixelRatio(ratio){
  if(Math.abs((options.pixelRatio||1)-ratio)<.002)return;
  options.pixelRatio=ratio;resize();
 }};
}
