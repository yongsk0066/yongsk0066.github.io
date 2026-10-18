import { memo, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type RefObject } from 'react';
import * as A from './vendor/anatomy/iso-kit';
import { register } from './vendor/hairline/stage';
import { spring, stepS } from './vendor/hairline/motion';
import { devices, parts, offset, type V3, type Part } from './model';
import { paintShape, orderPaintItems, type PaintShape } from './paint-order';
import { cometScreen } from './comet-screen';
import { rackLabels, type RackLabels, type RackLocale } from './labels';
import './vendor/anatomy/iso.css';
import './rack.css';

const W=880,H=820;
// The animation engine owns the SVG descendants. State changes in the controls
// must not replace those nodes or discard their current transforms/paint order.
const RackScene=memo(function RackScene({svg,markup,mode,onPick,label}:{svg:RefObject<SVGSVGElement|null>;markup:string;mode:number;onPick:(event:PointerEvent<SVGSVGElement>)=>void;label:string}) {
  return <svg ref={svg} className={`iso-svg${mode===1?' rack-hover':''}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} onPointerMove={e=>{if(e.pointerType==='mouse')onPick(e);}} onPointerDown={onPick} dangerouslySetInnerHTML={{__html:markup}}/>;
});
type RenderPart=PaintShape & {p:Part;i:number;cableSource?:Part;cableHalf?:number};
function cableRoute(p:typeof parts[number],from:V3,to:V3):V3[] {
  const original=p.points!,start=original[0].map((n,j)=>n+from[j]) as V3,end=original.at(-1)!.map((n,j)=>n+to[j]) as V3;
  const low=Math.min(start[2],end[2])-17;
  const bend:V3=[(start[0]+end[0])/2,Math.max(start[1],end[1])+45,low];
  const bezier=(a:V3,b:V3,c:V3,d:V3,t:number):V3=>a.map((n,j)=>(1-t)**3*n+3*(1-t)**2*t*b[j]+3*(1-t)*t*t*c[j]+t**3*d[j]) as V3;
  const blend=Math.min(1,Math.abs(from[1]-to[1])/35);
  return original.map((v,k)=>{
    const t=k/(original.length-1);
    // Leave both sockets toward the front. The return leg passes below the
    // pulled-out switch, rather than cutting backwards through its chassis.
    const draped=t<.5
      ? bezier(start,[start[0],start[1]+30,start[2]],[bend[0],bend[1],low+30],bend,t*2)
      : bezier(bend,[bend[0],bend[1],low-5],[end[0],end[1]+30,end[2]],end,t*2-1);
    return v.map((n,j)=>{const rest=n+(1-t)*from[j]+t*to[j];return rest+(draped[j]-rest)*blend;}) as V3;
  });
}
export default function RackStudy({mode=0,lang='ko'}:{mode:number;lang?:RackLocale}) {
  const copy: RackLabels = rackLabels[lang];
  const [apart,setApart]=useState(false),[selected,setSelected]=useState('switch'),[line,setLine]=useState(false);
  const root=useRef<HTMLDivElement>(null),svg=useRef<SVGSVGElement>(null);
  const liveOffsets=useRef(new Map<string,A.Flat>());
  const retarget=useRef<()=>void>(()=>{}),target=useRef({apart,selected});target.current={apart,selected};
  const model=useMemo(()=>{
    const corners:V3[]=[];
    for(const p of parts) {
      if(p.assembly==='cables')continue;
      for(const amount of [0,1]) {
        const delta=offset(mode,p.assembly,amount,p.assembly);
        const base=p.shape==='disc'?[p.p[0]-p.radius,p.p[1]-p.radius,p.p[2]]:p.p;
        for(const x of [0,p.size[0]])for(const y of [0,p.size[1]])for(const z of [0,p.size[2]])corners.push([base[0]+x+delta[0],base[1]+y+delta[1],base[2]+z+delta[2]]);
      }
    }
    const P=A.fitProjection(corners,W,H,{pad:35,azimuth:62,elevation:24});
    const drawPart=(p:typeof parts[number])=>{
      let html='';
      if(p.shape==='box')html=A.solidSvg(A.slabOf({x:p.p[0],y:p.p[1],w:p.size[0],d:p.size[1],r:p.radius},p.p[2],p.size[2],P,6,Math.min(1,p.size[2]/3)),{tone:'mid'});
      if(p.shape==='disc')html=A.solidSvg(A.cylinder(...p.p.slice(0,2) as [number,number],p.radius,p.p[2],p.size[2],P,64,1.5),{tone:'mid'});
      if(p.shape==='face') {
        const ring=A.roundedPlan({x:p.p[0],y:p.p[2],w:p.size[0],d:p.size[2],r:p.radius},5);
        const d=A.pathOf(ring.map(([x,z])=>A.iso([x,p.p[1],z],P)),true);
        html=`<path class="rack-face" d="${d}"/>`;
      }
      if(p.shape==='line')html=A.lineSvg(A.pathOf((p.points||[]).map(v=>A.iso(v,P))),{tone:p.feature==='patch-cable'?'hi':'mid',className:p.feature==='patch-cable'?'rack-cable':''});
      if(mode===1&&p.feature==='lcd-glass')html=cometScreen(p,P,copy.screen);
      return `<g class="rack-material-${p.material}"${p.feature?` data-feature="${p.feature}"`:''}>${html}</g>`;
    };
    // Surface details stay inside their solid's paint unit. Neither roof holes
    // nor the AP's status ring may float above unrelated objects in the scene.
    const ring=Array.from({length:65},(_,i)=>A.iso([140.5+38*Math.cos(i*Math.PI/32),130+38*Math.sin(i*Math.PI/32),640.7],P));
    const paintParts=parts.flatMap<RenderPart>((p,i)=>{
      // Two independently sorted legs let the return pass behind a pulled-out
      // switch while the connector/front loop stays in front of its face.
      if(mode===1&&p.feature==='patch-cable')return [0,1].map(half=>{
        const middle=(p.points!.length-1)/2;
        const segment={...p,points:p.points!.slice(half?middle:0,half?undefined:middle+1)};
        return {p:segment,i:parts.length+i*2+half,cableSource:p,cableHalf:half,...paintShape(segment,P)};
      });
      return [{p,i,cableSource:undefined,cableHalf:undefined,...paintShape(p,P)}];
    }).filter(({p})=>p.feature!=='roof-vent');
    const vents=parts.filter(p=>p.feature==='roof-vent').map(drawPart).join('');
    const markup=paintParts.map(({p,i})=>`<g data-part="${i}" data-assembly="${p.assembly}">${drawPart(p)}${p.feature==='roof-deck'?vents:''}${p.feature==='access-point'?`<g data-ap-ring>${A.lineSvg(A.pathOf(ring),{tone:'blue'})}</g>`:''}</g>`).join('');
    const hits=paintParts.filter(({p})=>devices.some(d=>d.id===p.assembly)).sort((a,b)=>{
      const centre=(p:typeof parts[number]):V3=>p.shape==='disc'?[p.p[0],p.p[1],p.p[2]+p.size[2]/2]:p.p.map((n,j)=>n+p.size[j]/2) as V3;
      return A.depthOf(centre(b.p),P)-A.depthOf(centre(a.p),P);
    });
    return {P,markup,paintParts,hits};
  },[mode,copy]);

  useEffect(()=>{
    const host=root.current,node=svg.current;if(!host||!node)return;
    const ids=[...new Set(parts.map(p=>p.assembly))];
    const motions=new Map(ids.map(id=>[id,{axes:[spring(0,{k:64,c:14.2}),spring(0,{k:64,c:14.2}),spring(0,{k:64,c:14.2})],start:0}]));
    const byPart=new Map(Array.from(node.querySelectorAll<SVGGElement>('[data-part]')).map(el=>[Number(el.dataset.part),el]));
    const elements=model.paintParts.map(({i})=>byPart.get(i)!);
    let lastOrder='',cableVisible:boolean|null=null;
    const clock=register(host,(dt,now)=>{
      let moving=false;
      const deltas=new Map<string,V3>();
      for(const [id,m] of motions) {
        if(now>=m.start){for(const sp of m.axes)if(stepS(sp,dt))moving=true;}
        else if(m.axes.some(sp=>sp.x!==sp.t))moving=true;
        deltas.set(id,m.axes.map(s=>s.x) as V3);
      }
      // Paint the settling frame too: stepS snaps to its exact target on the
      // first false result, and assembled cables must become visible then.
      const ordering=orderPaintItems(elements.map((el,index)=>{
        const {p,i,cableSource,cableHalf}=model.paintParts[index],d=deltas.get(p.assembly)!;
        let {bounds,hull}=model.paintParts[index];
        const delta=A.iso(d,{...model.P,origin:[0,0]});
        liveOffsets.current.set(p.assembly,delta);
        const transform=`translate(${delta[0].toFixed(2)} ${delta[1].toFixed(2)})`;
        if(el.getAttribute('transform')!==transform)el.setAttribute('transform',transform);
        el.classList.toggle('rack-picked',p.assembly===target.current.selected&&target.current.apart);
        const device=devices.find(v=>v.id===p.assembly);
        // Coplanar front features share one separating plane. Their true y offsets
        // and authored nesting order keep a broad bezel behind all four trays.
        let c:V3=p.shape==='face'&&device?[device.center[0],p.p[1],device.center[2]]:p.shape==='disc'?[p.p[0],p.p[1],p.p[2]+p.size[2]/2]:[p.p[0]+p.size[0]/2,p.p[1]+p.size[1]/2,p.p[2]+p.size[2]/2];
        if(mode===1&&p.feature==='patch-cable') {
          const from=deltas.get('switch')!,to=deltas.get('patch')!;
          const whole=cableRoute(cableSource!,from,to),middle=(whole.length-1)/2;
          const points=whole.slice(cableHalf?middle:0,cableHalf?undefined:middle+1);
          const path=el.querySelector('path')!,route=A.pathOf(points.map(v=>A.iso(v,model.P)));
          if(path.getAttribute('d')!==route)path.setAttribute('d',route);
          ({bounds,hull}=paintShape({...p,points},model.P));
          c=[0,1,2].map(j=>points.reduce((sum,v)=>sum+v[j],0)/points.length) as V3;
        }
        return {i,constrained:p.assembly==='roof'||p.assembly==='cables'||p.assembly==='frame',depth:A.depthOf([c[0]+d[0],c[1]+d[1],c[2]+d[2]],model.P),
          bounds:bounds.map(v=>v.map((n,j)=>n+d[j]) as V3) as [V3,V3],
          hull:hull.map(([x,y])=>[x+delta[0],y+delta[1]] as A.Flat)};
      }));
      const order=ordering.map(p=>p.i).join(',');
      if(order!==lastOrder){for(const p of ordering)node.appendChild(byPart.get(p.i)!);lastOrder=order;}
      const show=mode===1||(!target.current.apart&&!moving);
      if(show!==cableVisible){elements.filter(el=>el.dataset.assembly==='cables').forEach(el=>{el.style.display=show?'':'none';});cableVisible=show;}
      return moving;
    });
    retarget.current=()=>{
      const now=performance.now();
      for(const [id,m] of motions) {
        const delta=offset(mode,id,target.current.apart?1:0,target.current.selected);
        const i=devices.findIndex(d=>d.id===id);
        m.start=now+(target.current.apart?(id==='panel'||id==='roof'?0:(7-i)*35):(i<0?280:i*35));
        m.axes.forEach((s,j)=>s.t=delta[j]);
      }
      clock.wake();
    };
    clock.wake();return()=>{clock.unregister();retarget.current=()=>{};};
  },[model,mode]);
  useEffect(()=>retarget.current(),[apart,selected]);
  const pointInside=(hull:A.Flat[],x:number,y:number)=>{
    let positive=false,negative=false;
    for(let i=0;i<hull.length;i++) {const a=hull[i],b=hull[(i+1)%hull.length],cross=(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);positive ||= cross>0;negative ||= cross<0;}
    return !(positive&&negative);
  };
  const pickDevice=useCallback((event:PointerEvent<SVGSVGElement>)=>{
    if(mode!==1)return;
    const matrix=event.currentTarget.getScreenCTM();if(!matrix)return;
    const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
    // Rest silhouettes keep the target stable after it slides away; the live
    // silhouette lets the pointer follow the pulled-out device too.
    const active=target.current.apart?model.hits.find(({p,hull})=>{
      if(p.assembly!==target.current.selected)return false;
      const d=liveOffsets.current.get(p.assembly)||[0,0];
      return pointInside(hull,point.x,point.y)||pointInside(hull,point.x-d[0],point.y-d[1]);
    }):undefined;
    const hit=active||model.hits.find(({hull})=>pointInside(hull,point.x,point.y));
    if(hit) {setSelected(hit.p.assembly);setApart(hit.p.assembly!=='patch');}
    else setApart(false);
  },[model,mode]);
  return <div ref={root} className="rack-study iso" data-theme="light" data-render={line?'line':'solid'} role="group" aria-label={copy.interaction} onPointerLeave={e=>{if(mode===1&&e.pointerType==='mouse')setApart(false);}}>
    <div className="rack-sidebar">
      <div className="rack-device-tabs" role="group" aria-label={copy.deviceSelection}>
        {devices.map(d=><button key={d.id} onClick={()=>{setSelected(d.id);if(mode===1)setApart(d.id!=='patch');}} aria-pressed={d.id===selected} title={`${copy.roles[d.id]} · ${d.size}${d.id==='patch'?` · ${copy.fixed}`:''}`}>{d.name}</button>)}
      </div>
      <div className="rack-controls" role="group" aria-label={copy.viewOptions}>
        <button className="rack-primary" onClick={()=>{if(selected==='patch'&&mode===1)return;setApart(!apart);}} disabled={mode===1&&selected==='patch'} aria-pressed={apart}>{apart?copy.reassemble:copy.pullOut}</button>
        {mode===1&&<button className="rack-render-toggle" onClick={()=>setLine(!line)} aria-pressed={line}>{copy.lineView}</button>}
      </div>
    </div>
    <div className="rack-stage">
      <RackScene svg={svg} markup={model.markup} mode={mode} onPick={pickDevice} label={copy.scene}/>
    </div>
  </div>;
}
