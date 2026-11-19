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
@group(0) @binding(16) var stockTex:texture_2d<f32>;
@group(0) @binding(17) var stockSampler:sampler;
var<private> rng:u32;
fn random()->f32 {rng=rng*747796405u+2891336453u;let w=((rng>>((rng>>28u)+4u))^rng)*277803737u;return f32((w>>22u)^w)/4294967296.;}
fn boxHit(ro:vec3f,inv:vec3f,node:Node,limit:f32)->bool {let a=(node.lo-ro)*inv;let b=(node.hi-ro)*inv;let lo=min(a,b);let hi=max(a,b);return max(max(lo.x,lo.y),max(lo.z,0.))<=min(min(hi.x,hi.y),min(hi.z,limit));}
struct PlaneHit { distance:f32, kind:i32 }

fn intersectPlanes(ro:vec3f, rd:vec3f, limit:f32)->PlaneHit {
 var plane=PlaneHit(limit,0);
 if(abs(rd.z)>1e-8){
  let t=(param.scene.y-ro.z)/rd.z;
  if(t>EPS && t<plane.distance){plane=PlaneHit(t,2);}
 }
 let t=(param.light.z-ro.z)/rd.z;
 if(t>EPS && t<plane.distance){
  let p=ro+rd*t-param.light.xyz;
  if(abs(p.x)<param.light.w*.5 && abs(p.y)<param.scene.x*.5 && rd.z*param.scene.w<0.){
   plane=PlaneHit(t,3);
  }
 }
 return plane;
}

// Barycentric coordinates and distance in the open ray segment. Zero distance means a miss.
fn intersectTriangle(index:u32, ro:vec3f, rd:vec3f, limit:f32)->vec3f {
 let a=tris[index].a.xyz;
 let e1=tris[index].b.xyz-a;
 let e2=tris[index].c.xyz-a;
 let pv=cross(rd,e2);
 let det=dot(e1,pv);
 if(abs(det)<1e-9){return vec3f(0);}
 let tv=ro-a;
 let u=dot(tv,pv)/det;
 if(u<0. || u>1.){return vec3f(0);}
 let q=cross(tv,e1);
 let v=dot(rd,q)/det;
 if(v<0. || u+v>1.){return vec3f(0);}
 let t=dot(e2,q)/det;
 if(t>EPS && t<limit){return vec3f(u,v,t);}
 return vec3f(0);
}

// The wall counts only paper before or on its nearest analytic surface.
fn paperBlocks(ro:vec3f, rd:vec3f, limit:f32, planeLimit:f32)->bool {
 let inv=1./select(rd,vec3f(1e-8),abs(rd)<vec3f(1e-8));
 var cursor=0u;
 while(cursor<arrayLength(&nodes)){
  let node=nodes[cursor];
  cursor=node.escape;
  if(!boxHit(ro,inv,node,limit)){continue;}
  if(node.childOrLeaf>=0){
   cursor=u32(node.childOrLeaf);
   continue;
  }
  let leaf=u32(~node.childOrLeaf);
  let first=leaf>>2u;
  let count=(leaf&3u)+1u;
  for(var i=0u;i<count;i++){
   let t=intersectTriangle(first+i,ro,rd,limit).z;
   if(t>0. && t<=planeLimit){return true;}
  }
 }
 return false;
}

// Keep the full hit calculation together. Moving barycentrics across a helper boundary
// changed interpolated values on shared edges on tested WebGPU backends.
fn considerTriangle(index:u32, ro:vec3f, rd:vec3f, hit:ptr<function,Hit>){
 let tri=tris[index];
 let e1=tri.b.xyz-tri.a.xyz;
 let e2=tri.c.xyz-tri.a.xyz;
 let pv=cross(rd,e2);
 let det=dot(e1,pv);
 if(abs(det)<1e-9){return;}
 let tv=ro-tri.a.xyz;
 let u=dot(tv,pv)/det;
 if(u<0. || u>1.){return;}
 let q=cross(tv,e1);
 let v=dot(rd,q)/det;
 if(v<0. || u+v>1.){return;}
 let t=dot(e2,q)/det;
 if(t>EPS && t<(*hit).t){
  (*hit).t=t;
  (*hit).kind=1;
  (*hit).triangle=i32(index);
  (*hit).bary=vec2f(u,v);
  (*hit).gn=normalize(cross(e1,e2));
  (*hit).n=normalize(tri.na.xyz*(1.-u-v)+tri.nb.xyz*u+tri.nc.xyz*v);
  (*hit).uv=tri.uv01.xy*(1.-u-v)+tri.uv01.zw*u+tri.uv2.xy*v;
 }
}

fn finishWithPlanes(ro:vec3f, rd:vec3f, hit:ptr<function,Hit>){
 let plane=intersectPlanes(ro,rd,(*hit).t);
 if(plane.kind==0){return;}
 (*hit).t=plane.distance;
 (*hit).kind=plane.kind;
 if(plane.kind==2){(*hit).n=vec3f(0,0,1);(*hit).gn=(*hit).n;}
}

fn trace(ro:vec3f,rd:vec3f,limit:f32)->Hit {
 var hit:Hit;
 hit.t=limit;
 var cursor=0u;
 let inv=1./select(rd,vec3f(1e-8),abs(rd)<vec3f(1e-8));
 while(cursor<arrayLength(&nodes)){
  let node=nodes[cursor];
  cursor=node.escape;
  if(!boxHit(ro,inv,node,hit.t)){continue;}
  if(node.childOrLeaf>=0){
   cursor=u32(node.childOrLeaf);
   continue;
  }
  let leaf=u32(~node.childOrLeaf);
  let first=leaf>>2u;
  let count=(leaf&3u)+1u;
  for(var i=0u;i<count;i++){considerTriangle(first+i,ro,rd,&hit);}
 }
 finishWithPlanes(ro,rd,&hit);
 return hit;
}

// surface.z stores side * (primitive index + 1). All tags fit exactly in binary16.
// Zero denotes no paper; 2048 asks for a fresh intersection on larger meshes.
const UNCACHED_TRIANGLE=2048.;
fn primaryHit(ro:vec3f, rd:vec3f, pixel:vec2i)->Hit {
 let far=1e5;
 if(param.temporal.z>.5){
  let tag=abs(textureLoad(previousSurface,pixel,0).z);
  var hit:Hit;
  hit.t=far;
  if(tag==0.){
   finishWithPlanes(ro,rd,&hit);
   return hit;
  }
  if(tag<UNCACHED_TRIANGLE){
   considerTriangle(u32(tag)-1u,ro,rd,&hit);
   if(hit.kind==1){return hit;}
  }
 }
 return trace(ro,rd,far);
}

fn segmentBlocked(ro:vec3f,rd:vec3f,limit:f32)->bool {
 if(intersectPlanes(ro,rd,limit).kind!=0){return true;}
 return paperBlocks(ro,rd,limit,limit);
}
fn basis(n:vec3f,v:vec3f)->vec3f {let t=normalize(cross(select(vec3f(0,0,1),vec3f(0,1,0),abs(n.z)>.99),n));return t*v.x+cross(n,t)*v.y+n*v.z;}
fn cosine(n:vec3f)->vec3f {let r=sqrt(random());let a=2.*PI*random();return basis(n,vec3f(r*cos(a),r*sin(a),sqrt(max(0.,1.-r*r))));}
fn D(nh:f32,a:f32)->f32 {let d=nh*nh*(a*a-1.)+1.;return a*a/(PI*d*d);}
fn evaluate(m:Material,n:vec3f,wo:vec3f,wi:vec3f)->vec3f {
 if(dot(n,wi)<0.){return m.t/PI;}
 return m.r/PI + vec3f(surfaceBRDF(m.rough, m.s, n, wo, wi));
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
 let reference = surfaceBRDF(m.rough, m.s, n, wo, normalize(param.light.xyz - p));
 for(var i=0;i<count;i++){
  let uv=(vec2f(f32(i%cols),f32(i/cols))+vec2f(random(),random()))/vec2f(f32(cols),f32(rows));
  let lp=param.light.xyz+vec3f((uv-.5)*vec2f(param.light.w,param.scene.x),0.);
  let delta=lp-p;let dist=length(delta);let wi=delta/dist;let cosL=max(0.,-wi.z*param.scene.w);
  if(cosL>0.&&dot(n,wi)*dot(gn,wi)>0.){
   let occluded=segmentBlocked(p+gn*select(-EPS*3.,EPS*3.,dot(wi,gn)>0.),wi,dist-EPS*8.);
   let reflecting = dot(n,wi)>0.;
   var correction = vec3f(0);
   if(occluded){
    correction = -select(m.t / PI, m.r / PI + vec3f(reference), reflecting);
    blocked+=1./f32(count);
   }else if(reflecting){
    correction = vec3f(surfaceBRDF(m.rough, m.s, n, wo, wi) - reference);
   }
   value+=correction*abs(dot(n,wi))*param.scene.z*cosL*param.light.w*param.scene.x/(dist*dist*f32(count));
  }
 }
 return Direct(value,blocked);
}
// Only secondary illumination: primary direct light and occlusion have their own signal.
fn indirectRadiance(p0:vec3f,wo0:vec3f,n0:vec3f,gn0:vec3f,primary:Material)->vec3f {
 var p=p0;var wo=wo0;var n=n0;var gn=gn0;var m=primary;
 var ro=vec3f(0);var rd=vec3f(0);var throughput=vec3f(1);var result=vec3f(0);
 for(var bounce=0;bounce<i32(param.flags.x);bounce++){
  if(bounce>0){
   let hit=trace(ro,rd,1e5);if(hit.kind==0||hit.kind==3){break;}
   p=ro+rd*hit.t;wo=-rd;let front=dot(hit.gn,wo)>0.;
   gn=select(-hit.gn,hit.gn,front);n=shadingNormal(hit,wo);
   // Diffuse secondary paths average a wider area of the stock.
   m=traceMaterial(hit,front,2.);
   let lp=param.light.xyz+vec3f((vec2f(random(),random())-.5)*vec2f(param.light.w,param.scene.x),0.);
   let delta=lp-p;let dist=length(delta);let wi=delta/dist;let cosL=max(0.,-wi.z*param.scene.w);
   if(cosL>0.&&dot(n,wi)*dot(gn,wi)>0.){
    let occluded=segmentBlocked(p+gn*select(-EPS*3.,EPS*3.,dot(wi,gn)>0.),wi,dist-EPS*8.);
    if(!occluded){result+=throughput*evaluate(m,n,wo,wi)*abs(dot(n,wi))*param.scene.z*cosL*param.light.w*param.scene.x/(dist*dist);}
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
  if(old.a<1.||dot(g.xyz,n)<.94||abs(g.w-length(delta))>.035||distance(s.xy,hit.uv)>.012||sign(s.z)!=side){continue;}
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
  let ro=p+vec3f(0,0,EPS*3.);let rd=delta/dist;let limit=dist-EPS*8.;
  let plane=intersectPlanes(ro,rd,limit);
  if(paperBlocks(ro,rd,limit,plane.distance)){blocked+=1.;}
 }
 return blocked/f32(grid*grid);
}
@compute @workgroup_size(8,8) fn main(@builtin(global_invocation_id) id:vec3u){
 if(any(id.xy>=param.size.xy)){return;}let index=id.y*param.size.x+id.x;
 rng=(index+1u)*1973u+(param.size.w+1u)*9277u;
 let uv=(vec2f(id.xy)+.5)/vec2f(param.size.xy);let q=(uv*2.-1.)*vec2f(1.,-1.);
 let ray=normalize(vec3f(q*param.projection.xy+param.projection.zw,-1.));let hit=primaryHit(param.camera.xyz,ray,vec2i(id.xy));
 var direct=vec4f(0);var indirect=vec4f(0);var moments=vec4f(0);var surface=vec4f(0);var normal=vec3f(0,0,1);
 if(hit.kind==1){
  let p=param.camera.xyz+ray*hit.t;let front=dot(hit.gn,-ray)>0.;let side=select(-1.,1.,front);
  let gn=hit.gn*side;normal=shadingNormal(hit,-ray);
  // Project the 128-texel formation map of the four-unit sheet onto this
  // lighting pixel. At grazing incidence the hit covers a longer UV interval.
  let footprint = 64. * param.projection.x * hit.t /
    max(.0001, f32(param.size.x) * abs(dot(gn, ray)));
  let m=traceMaterial(hit,front,log2(max(1., footprint)));
  let albedo=albedoForFilter(m);
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
  for(var i=0;i<paths;i++){indirectSample+=indirectRadiance(p,-ray,normal,gn,m)/f32(paths);}
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
  surface=vec4f(hit.uv,side*min(f32(hit.triangle+1),UNCACHED_TRIANGLE),correction.blocked);
 }else if(hit.kind==2){
  if(param.temporal.z>.5){
   // The quadrature over the emitter is deterministic for this camera and pose.
   direct.a=textureLoad(previousDirect,vec2i(id.xy),0).a;
  }else{
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
 }
 textureStore(directOut,vec2i(id.xy),direct);textureStore(indirectOut,vec2i(id.xy),indirect);
 textureStore(momentsOut,vec2i(id.xy),moments);textureStore(surfaceOut,vec2i(id.xy),surface);
 textureStore(guideOut,vec2i(id.xy),vec4f(normal,hit.t));
}
