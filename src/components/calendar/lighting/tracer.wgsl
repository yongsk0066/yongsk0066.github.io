// size: width,height,accumulated samples,seed. light xyz + width. scene: height,wallZ,Le,emitter normal z.
// optical: R,T,coat,roughness. flags: bounces,material,printed,unused.
@group(0) @binding(0) var<storage,read> nodes:array<Node>;
@group(0) @binding(1) var<storage,read> tris:array<Triangle>;
@group(0) @binding(2) var<storage,read> previousTris:array<Triangle>;
@group(0) @binding(3) var directOut:texture_storage_2d<rgba16float,write>;
@group(0) @binding(4) var<uniform> param:Params;
@group(0) @binding(5) var inkTex:texture_2d<f32>;
@group(0) @binding(6) var inkSampler:sampler;
@group(0) @binding(7) var guideOut:texture_storage_2d<rgba16float,write>;
@group(0) @binding(8) var momentsOut:texture_storage_2d<rgba16float,write>;
@group(0) @binding(9) var previousIndirect:texture_2d<f32>;
@group(0) @binding(10) var previousGuide:texture_2d<f32>;
@group(0) @binding(11) var previousSurface:texture_2d<f32>;
@group(0) @binding(12) var indirectOut:texture_storage_2d<rgba16float,write>;
@group(0) @binding(13) var surfaceOut:texture_storage_2d<rgba16float,write>;
@group(0) @binding(14) var previousDirect:texture_2d<f32>;
@group(0) @binding(15) var previousMoments:texture_2d<f32>;
var<private> rng:u32;
fn random()->f32 {rng=rng*747796405u+2891336453u;let w=((rng>>((rng>>28u)+4u))^rng)*277803737u;return f32((w>>22u)^w)/4294967296.;}
fn boxHit(ro:vec3f,inv:vec3f,node:Node,limit:f32)->bool {let a=(node.lo-ro)*inv;let b=(node.hi-ro)*inv;let lo=min(a,b);let hi=max(a,b);return max(max(lo.x,lo.y),max(lo.z,0.))<=min(min(hi.x,hi.y),min(hi.z,limit));}
fn trace(ro:vec3f,rd:vec3f,limit:f32)->Hit {
 var hit:Hit;hit.t=limit;hit.kind=0;var stack:array<i32,64>;var ptr=1;stack[0]=0;
 let inv=1./select(rd,vec3f(1e-8),abs(rd)<vec3f(1e-8));
 for(var iter=0;iter<2048&&ptr>0;iter++){
  ptr--;let node=nodes[stack[ptr]];if(!boxHit(ro,inv,node,hit.t)){continue;}
  if(node.left>=0){if(ptr<62){stack[ptr]=node.left;stack[ptr+1]=node.right;ptr+=2;}continue;}
  for(var k=0;k<node.right;k++){
   let tri=tris[-node.left-1+k];let e1=tri.b.xyz-tri.a.xyz;let e2=tri.c.xyz-tri.a.xyz;let pv=cross(rd,e2);let det=dot(e1,pv);if(abs(det)<1e-9){continue;}
   let tv=ro-tri.a.xyz;let u=dot(tv,pv)/det;if(u<0.||u>1.){continue;}let q=cross(tv,e1);let v=dot(rd,q)/det;if(v<0.||u+v>1.){continue;}
   let t=dot(e2,q)/det;if(t>EPS&&t<hit.t){hit.t=t;hit.kind=1;hit.triangle=-node.left-1+k;hit.bary=vec2f(u,v);hit.gn=normalize(cross(e1,e2));hit.n=normalize(tri.na.xyz*(1.-u-v)+tri.nb.xyz*u+tri.nc.xyz*v);hit.uv=tri.uv01.xy*(1.-u-v)+tri.uv01.zw*u+tri.uv2.xy*v;}
  }
 }
 if(abs(rd.z)>1e-8){let t=(param.scene.y-ro.z)/rd.z;if(t>EPS&&t<hit.t){hit.t=t;hit.kind=2;hit.n=vec3f(0,0,1);hit.gn=hit.n;}}
 let lz=(param.light.z-ro.z)/rd.z;
 if(lz>EPS&&lz<hit.t){let p=ro+rd*lz-param.light.xyz;if(abs(p.x)<param.light.w*.5&&abs(p.y)<param.scene.x*.5&&rd.z*param.scene.w<0.){hit.t=lz;hit.kind=3;}}
 return hit;
}
fn basis(n:vec3f,v:vec3f)->vec3f {let t=normalize(cross(select(vec3f(0,0,1),vec3f(0,1,0),abs(n.z)>.99),n));return t*v.x+cross(n,t)*v.y+n*v.z;}
fn cosine(n:vec3f)->vec3f {let r=sqrt(random());let a=2.*PI*random();return basis(n,vec3f(r*cos(a),r*sin(a),sqrt(max(0.,1.-r*r))));}
fn D(nh:f32,a:f32)->f32 {let d=nh*nh*(a*a-1.)+1.;return a*a/(PI*d*d);}
fn G1(nv:f32,a:f32)->f32 {return 2.*nv/(nv+sqrt(a*a+(1.-a*a)*nv*nv));}
fn evaluate(m:Material,n:vec3f,wo:vec3f,wi:vec3f)->vec3f {
 let ni=dot(n,wi);let nv=max(.0001,dot(n,wo));if(ni<0.){return m.t/PI;}
 var f=m.r/PI;if(m.s>0.){let h=normalize(wo+wi);let nh=max(0.,dot(n,h));f+=vec3f(m.s*D(nh,m.rough)*G1(nv,m.rough)*G1(max(ni,.0001),m.rough)/(4.*nv*max(ni,.0001)));}return f;
}
fn pdf(m:Material,n:vec3f,wo:vec3f,wi:vec3f)->f32 {
 let r=dot(m.r,vec3f(.333333));let t=dot(m.t,vec3f(.333333));let total=r+t+m.s;let ni=dot(n,wi);if(ni<0.){return t/total*(-ni)/PI;}
 let h=normalize(wi+wo);return r/total*ni/PI+m.s/total*D(max(0.,dot(n,h)),m.rough)*max(0.,dot(n,h))/(4.*max(.0001,dot(wo,h)));
}
fn sampleDirection(m:Material,n:vec3f,wo:vec3f)->vec3f {
 let r=dot(m.r,vec3f(.333333));let t=dot(m.t,vec3f(.333333));let choice=random()*(r+t+m.s);
 if(choice<r){return cosine(n);}if(choice<r+t){return cosine(-n);}
 let u=random();let ct=sqrt((1.-u)/(1.+(m.rough*m.rough-1.)*u));let st=sqrt(1.-ct*ct);let phi=2.*PI*random();let h=basis(n,vec3f(st*cos(phi),st*sin(phi),ct));let wi=reflect(-wo,h);if(dot(wi,n)<=0.){return vec3f(0);}return wi;
}
fn luminance(c:vec3f)->f32 {return dot(c,vec3f(.2126,.7152,.0722));}
struct Direct { color:vec3f, blocked:f32 }
fn directCorrection(p:vec3f,n:vec3f,gn:vec3f,wo:vec3f,m:Material,count:i32)->Direct {
 var value=vec3f(0);var blocked=0.;let cols=select(2,4,count>=8);let rows=count/cols;
 for(var i=0;i<count;i++){
  let uv=(vec2f(f32(i%cols),f32(i/cols))+vec2f(random(),random()))/vec2f(f32(cols),f32(rows));
  let lp=param.light.xyz+vec3f((uv-.5)*vec2f(param.light.w,param.scene.x),0.);
  let delta=lp-p;let dist=length(delta);let wi=delta/dist;let cosL=max(0.,-wi.z*param.scene.w);
  if(cosL>0.&&dot(n,wi)*dot(gn,wi)>0.){
   let blocker=trace(p+gn*select(-EPS*3.,EPS*3.,dot(wi,gn)>0.),wi,dist-EPS*8.);
   let diffuse=select(m.t,m.r,dot(n,wi)>0.)/PI;var correction=-diffuse;
   if(blocker.kind==0){correction=evaluate(m,n,wo,wi)-diffuse;}else{blocked+=1./f32(count);}
   value+=correction*abs(dot(n,wi))*param.scene.z*cosL*param.light.w*param.scene.x/(dist*dist*f32(count));
  }
 }
 return Direct(value,blocked);
}
// Only secondary illumination: primary direct light and occlusion have their own signal.
fn indirectRadiance(ro0:vec3f,rd0:vec3f,primary:Hit)->vec3f {
 var ro=ro0;var rd=rd0;var throughput=vec3f(1);var result=vec3f(0);
 for(var bounce=0;bounce<i32(param.flags.x);bounce++){
  var hit=primary;if(bounce>0){hit=trace(ro,rd,1e5);}if(hit.kind==0||hit.kind==3){break;}
  let p=ro+rd*hit.t;let wo=-rd;let gn=select(-hit.gn,hit.gn,dot(hit.gn,wo)>0.);
  let n=shadingNormal(hit,wo);let m=material(hit,dot(hit.gn,wo)>0.);
  if(bounce>0){
   let lp=param.light.xyz+vec3f((vec2f(random(),random())-.5)*vec2f(param.light.w,param.scene.x),0.);
   let delta=lp-p;let dist=length(delta);let wi=delta/dist;let cosL=max(0.,-wi.z*param.scene.w);
   if(cosL>0.&&dot(n,wi)*dot(gn,wi)>0.){
    let blocker=trace(p+gn*select(-EPS*3.,EPS*3.,dot(wi,gn)>0.),wi,dist-EPS*8.);
    if(blocker.kind==0){result+=throughput*evaluate(m,n,wo,wi)*abs(dot(n,wi))*param.scene.z*cosL*param.light.w*param.scene.x/(dist*dist);}
   }
  }
  let next=sampleDirection(m,n,wo);if(length(next)<.5||dot(n,next)*dot(gn,next)<=0.){break;}
  let probability=pdf(m,n,wo,next);if(probability<1e-9){break;}
  throughput*=evaluate(m,n,wo,next)*abs(dot(n,next))/probability;
  if(bounce>=2){let survival=clamp(max(throughput.x,max(throughput.y,throughput.z)),.05,.95);if(random()>survival){break;}throughput/=survival;}
  ro=p+gn*select(-EPS*3.,EPS*3.,dot(next,gn)>0.);rd=next;
 }
 return result;
}
struct History { direct:vec4f, indirect:vec4f, moments:vec4f, visibility:f32, motion:f32 }
fn reproject(hit:Hit,n:vec3f,side:f32,pixel:vec2f)->History {
 var result:History;if(param.temporal.x<.5){return result;}
 let tri=previousTris[hit.triangle];let b=hit.bary;
 let oldPoint=tri.a.xyz*(1.-b.x-b.y)+tri.b.xyz*b.x+tri.c.xyz*b.y;
 let delta=oldPoint-param.previousCamera.xyz;
 let ndc=(delta.xy/(-delta.z)-param.previousProjection.zw)/param.previousProjection.xy;
 let coord=(ndc*vec2f(.5,-.5)+.5)*vec2f(param.size.xy)-.5;
 result.motion=distance(coord,pixel);
 let origin=vec2i(floor(coord));let fraction=fract(coord);var weights=0.;
 for(var y=0;y<2;y++){for(var x=0;x<2;x++){
  let q=origin+vec2i(x,y);if(any(q<vec2i(0))||any(q>=vec2i(param.size.xy))){continue;}
  let g=textureLoad(previousGuide,q,0);let s=textureLoad(previousSurface,q,0);let old=textureLoad(previousIndirect,q,0);
  if(old.a<1.||dot(g.xyz,n)<.94||abs(g.w-length(delta))>.035||distance(s.xy,hit.uv)>.012||s.z!=side){continue;}
  let w=select(1.-fraction.x,fraction.x,x==1)*select(1.-fraction.y,fraction.y,y==1);
  result.direct+=textureLoad(previousDirect,q,0)*w;result.indirect+=old*w;
  result.moments+=textureLoad(previousMoments,q,0)*w;result.visibility+=s.w*w;weights+=w;
 }}
 if(weights>.1){result.direct/=weights;result.indirect/=weights;result.moments/=weights;result.visibility/=weights;}
 else{result.direct=vec4f(0);result.indirect=vec4f(0);result.moments=vec4f(0);result.visibility=0.;}
 return result;
}
fn wallBlocked(p:vec3f,grid:i32)->f32 {
 var blocked=0.;
 for(var i=0;i<grid*grid;i++){
  let uv=(vec2f(f32(i%grid),f32(i/grid))+.5)/f32(grid)-.5;
  let delta=param.light.xyz+vec3f(uv*vec2f(param.light.w,param.scene.x),0.)-p;let dist=length(delta);
  if(trace(p+vec3f(0,0,EPS*3.),delta/dist,dist-EPS*8.).kind==1){blocked+=1.;}
 }
 return blocked/f32(grid*grid);
}
@compute @workgroup_size(8,8) fn main(@builtin(global_invocation_id) id:vec3u){
 if(any(id.xy>=param.size.xy)){return;}let index=id.y*param.size.x+id.x;
 rng=(index+1u)*1973u+(param.size.w+1u)*9277u;
 let uv=(vec2f(id.xy)+.5)/vec2f(param.size.xy);let q=(uv*2.-1.)*vec2f(1.,-1.);
 let ray=normalize(vec3f(q*param.projection.xy+param.projection.zw,-1.));let hit=trace(param.camera.xyz,ray,1e5);
 var direct=vec4f(0);var indirect=vec4f(0);var moments=vec4f(0);var surface=vec4f(0);var normal=vec3f(0,0,1);
 if(hit.kind==1){
  let p=param.camera.xyz+ray*hit.t;let front=dot(hit.gn,-ray)>0.;let side=select(-1.,1.,front);
  let gn=hit.gn*side;normal=shadingNormal(hit,-ray);let m=material(hit,front);
  let ink=inkColor(hit);let albedo=max(select(mix(vec3f(1),ink,.12),ink,front),vec3f(.002));
  let old=reproject(hit,normal,side,vec2f(id.xy));
  let dVariance=max(0.,old.moments.y-old.moments.x*old.moments.x);
  let iVariance=max(0.,old.moments.w-old.moments.z*old.moments.z);
  // Spend rays on newly exposed, noisy or grazing surfaces, not uniformly everywhere.
  let grazing=abs(dot(normal,-ray))<.25;
  var directSamples=4;
  if(old.direct.a<4.||dVariance>.01||(old.visibility>.01&&old.visibility<.99)){directSamples=8;}
  if(grazing&&old.direct.a<4.){directSamples=16;}
  var paths=1;if(old.indirect.a<4.||iVariance>.025){paths=2;}
  if(grazing&&old.indirect.a<2.){paths=3;}
  let correction=directCorrection(p,normal,gn,-ray,m,directSamples);let d=correction.color/albedo;
  var indirectSample=vec3f(0);
  for(var i=0;i<paths;i++){indirectSample+=indirectRadiance(param.camera.xyz,ray,hit)/f32(paths);}
  let gi=indirectSample/albedo;let dl=luminance(d);let il=luminance(gi);
  let confidence=exp(-old.motion*.08);
  var dAge=min(old.direct.a,select(127.,mix(4.,24.,confidence),param.temporal.y>.5));
  var iAge=min(old.indirect.a,select(127.,mix(8.,48.,confidence),param.temporal.y>.5));
  // Visibility and statistically significant illumination changes shorten history.
  if(abs(old.visibility-correction.blocked)>.26){dAge=min(dAge,1.);iAge=min(iAge,2.);}
  if(old.motion>.25&&abs(dl-old.moments.x)>4.*sqrt(dVariance+.0025)){dAge=min(dAge,2.);}
  if(old.motion>.25&&abs(il-old.moments.z)>4.*sqrt(iVariance+.01)){iAge=min(iAge,3.);}
  let da=1./(dAge+1.);let ia=1./(iAge+1.);
  direct=vec4f(mix(old.direct.rgb,d,da),dAge+1.);indirect=vec4f(mix(old.indirect.rgb,gi,ia),iAge+1.);
  moments=vec4f(mix(old.moments.xy,vec2f(dl,dl*dl),da),mix(old.moments.zw,vec2f(il,il*il),ia));
  surface=vec4f(hit.uv,side,correction.blocked);
 }else if(hit.kind==2){
  let p=param.camera.xyz+ray*hit.t;let root=nodes[0];
  let spread=max(0.,root.hi.z-param.scene.y)/max(EPS,param.light.z-root.hi.z);
  let reach=(max(abs(param.light.xy-root.lo.xy),abs(param.light.xy-root.hi.xy))+vec2f(param.light.w,param.scene.x)*.5)*spread;
  if(all(p.xy>=root.lo.xy-reach)&&all(p.xy<=root.hi.xy+reach)){
   var blocked=wallBlocked(p,4);
   // Refine only the penumbra; fixed quadrature has no temporal random grain.
   if(blocked>0.&&blocked<1.){blocked=wallBlocked(p,8);}
   direct.a=.18*blocked;
  }
 }
 textureStore(directOut,vec2i(id.xy),direct);textureStore(indirectOut,vec2i(id.xy),indirect);
 textureStore(momentsOut,vec2i(id.xy),moments);textureStore(surfaceOut,vec2i(id.xy),surface);
 textureStore(guideOut,vec2i(id.xy),vec4f(normal,hit.t));
}
