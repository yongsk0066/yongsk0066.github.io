struct Node { lo:vec3f,left:i32,hi:vec3f,right:i32 }
struct Triangle { a:vec4f,b:vec4f,c:vec4f,na:vec4f,nb:vec4f,nc:vec4f,uv01:vec4f,uv2:vec4f }
struct Params { size:vec4u, camera:vec4f, light:vec4f, scene:vec4f, optical:vec4f, flags:vec4f, projection:vec4f, background:vec4f, previousCamera:vec4f, previousProjection:vec4f, temporal:vec4f }
// size: width,height,accumulated samples,seed. light xyz + width. scene: height,wallZ,Le,emitter normal z.
// optical: R,T,coat,roughness. flags: bounces,material,printed,unused.
@group(0) @binding(0) var<storage,read> nodes:array<Node>;
@group(0) @binding(1) var<storage,read> tris:array<Triangle>;
@group(0) @binding(2) var<storage,read> previousTris:array<Triangle>;
@group(0) @binding(3) var outputTex:texture_storage_2d<rgba16float,write>;
@group(0) @binding(4) var<uniform> param:Params;
@group(0) @binding(5) var inkTex:texture_2d<f32>;
@group(0) @binding(6) var inkSampler:sampler;
@group(0) @binding(7) var guideTex:texture_storage_2d<rgba16float,write>;
@group(0) @binding(8) var albedoTex:texture_storage_2d<rgba16float,write>;
@group(0) @binding(9) var previousHistory:texture_2d<f32>;
@group(0) @binding(10) var previousGuide:texture_2d<f32>;
@group(0) @binding(11) var previousSurface:texture_2d<f32>;
@group(0) @binding(12) var historyTex:texture_storage_2d<rgba16float,write>;
@group(0) @binding(13) var surfaceTex:texture_storage_2d<rgba16float,write>;
const PI=3.14159265359;
const EPS=.0002;
var<private> rng:u32;
fn random()->f32 {rng=rng*747796405u+2891336453u;let w=((rng>>((rng>>28u)+4u))^rng)*277803737u;return f32((w>>22u)^w)/4294967296.;}
struct Hit { t:f32, n:vec3f, gn:vec3f, uv:vec2f, kind:i32, triangle:i32, bary:vec2f }
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
struct Material { r:vec3f,t:vec3f,s:f32,rough:f32 }
fn inkColor(hit:Hit)->vec3f {
 let c=textureSampleLevel(inkTex,inkSampler,vec2f(hit.uv.x,1.-hit.uv.y),0.).rgb;
 return select(c/12.92,pow((c+.055)/1.055,vec3f(2.4)),c>vec3f(.04045));
}
fn shadingNormal(hit:Hit,wo:vec3f)->vec3f {
 let gn=select(-hit.gn,hit.gn,dot(hit.gn,wo)>0.);
 let ns=select(-hit.n,hit.n,dot(hit.n,gn)>0.);
 // Keep the interpolated normal in the viewing hemisphere at grazing folds.
 return normalize(mix(gn,ns,smoothstep(0.,.15,dot(ns,wo))));
}
fn material(hit:Hit,front:bool)->Material {
 var m:Material;m.rough=param.optical.w;
 if(hit.kind==2){m.r=param.background.rgb*.76;m.t=vec3f(0);m.s=0.;return m;}
 var ink=vec3f(1);
 if(param.flags.z>.5){ink=inkColor(hit);}
 // A weak, deterministic fiber density modulation, not a yellow color texture.
 let fiber=1.-.003*(.5+.5*sin(hit.uv.x*1700.+sin(hit.uv.y*1200.)));
 if(param.flags.y<.5){m.r=ink*.84;m.t=vec3f(0);m.s=0.;return m;}
 m.s=param.optical.z;let reflectedInk=select(mix(vec3f(1),ink,.12),ink,front);m.r=reflectedInk*param.optical.x*(1.-m.s)*fiber;m.t=pow(ink,vec3f(.65))*param.optical.y*(1.-m.s)*fiber;return m;
}
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
// Exact cosine integral over the rectangular emitter, clipped against both
// shading and geometric hemispheres. No random light sample for unobstructed diffuse.
struct Polygon { vertices:array<vec3f,8>, count:i32 }
fn clipPolygon(poly:Polygon,n:vec3f)->Polygon {
 var out:Polygon;
 for(var i=0;i<poly.count;i++){
  let a=poly.vertices[i];let b=poly.vertices[(i+1)%poly.count];
  let da=dot(a,n);let db=dot(b,n);
  if(da>=0.){out.vertices[out.count]=a;out.count++;}
  if((da>=0.)!=(db>=0.)){out.vertices[out.count]=mix(a,b,da/(da-db));out.count++;}
 }
 return out;
}
fn cosineIntegral(p:vec3f,n:vec3f,gn:vec3f)->f32 {
 if(p.z>=param.light.z){return 0.;}
 let center=param.light.xyz-p;let w=param.light.w*.5;let h=param.scene.x*.5;
 var poly:Polygon;poly.count=4;
 poly.vertices[0]=center+vec3f(-w,-h,0);poly.vertices[1]=center+vec3f(w,-h,0);
 poly.vertices[2]=center+vec3f(w,h,0);poly.vertices[3]=center+vec3f(-w,h,0);
 poly=clipPolygon(clipPolygon(poly,n),gn);
 var integral=vec3f(0);
 for(var i=0;i<poly.count;i++){
  let a=normalize(poly.vertices[i]);let b=normalize(poly.vertices[(i+1)%poly.count]);let edge=cross(a,b);let len=length(edge);
  if(len>1e-7){integral+=edge*(atan2(len,dot(a,b))/len);}
 }
 return max(0.,dot(n,integral)*.5);
}
fn diffuseDirect(p:vec3f,n:vec3f,gn:vec3f,m:Material)->vec3f {
 return param.scene.z/PI*(m.r*cosineIntegral(p,n,gn)+m.t*cosineIntegral(p,-n,-gn));
}
struct Lighting { color:vec3f, visibility:f32 }
fn radiance(ro0:vec3f,rd0:vec3f,primary:Hit,base:vec3f)->Lighting {
 var ro=ro0;var rd=rd0;var throughput=vec3f(1);var result=vec3f(0);var visibility=0.;
 for(var bounce=0;bounce<i32(param.flags.x);bounce++){
  var hit=primary;if(bounce>0){hit=trace(ro,rd,1e5);}if(hit.kind==0){break;}if(hit.kind==3){if(bounce==0){result+=throughput*param.scene.z;}break;}
  let p=ro+rd*hit.t;let wo=-rd;let gn=select(-hit.gn,hit.gn,dot(hit.gn,wo)>0.);
  // Smooth shading; geometric normal still controls offsets and surface sides.
  let n=shadingNormal(hit,wo);let m=material(hit,dot(hit.gn,wo)>0.);
  if(bounce==0){result+=base;}
  let count=select(1,4,bounce==0);
  for(var sample=0;sample<count;sample++){
   var lightUV=vec2f(random(),random());
   if(count==4){lightUV=(vec2f(f32(sample%2),f32(sample/2))+lightUV)*.5;}
   let lp=param.light.xyz+vec3f((lightUV-.5)*vec2f(param.light.w,param.scene.x),0.);
   let delta=lp-p;let dist=length(delta);let wi=delta/dist;let cosL=max(0.,-wi.z*param.scene.w);
   if(cosL>0. && dot(n,wi)*dot(gn,wi)>0.){
    let origin=p+gn*select(-EPS*3.,EPS*3.,dot(wi,gn)>0.);let blocker=trace(origin,wi,dist-EPS*8.);
    let diffuse=select(m.t,m.r,dot(n,wi)>0.)/PI;
    // Control variate: add analytic unoccluded diffuse, estimate only the
    // negative occlusion correction and the very weak coating term.
    var correction=vec3f(0);
    if(blocker.kind==0){correction=evaluate(m,n,wo,wi);}
    if(bounce==0){correction-=diffuse;}
    if(bounce==0&&blocker.kind!=0){visibility+=1./f32(count);}
    result+=throughput*correction*abs(dot(n,wi))*param.scene.z*cosL*param.light.w*param.scene.x/(dist*dist*f32(count));
   }
  }
  let next=sampleDirection(m,n,wo);if(length(next)<.5 || dot(n,next)*dot(gn,next)<=0.){break;}let probability=pdf(m,n,wo,next);if(probability<1e-9){break;}
  throughput*=evaluate(m,n,wo,next)*abs(dot(n,next))/probability;
  if(bounce>=2){let survival=clamp(max(throughput.x,max(throughput.y,throughput.z)),.05,.95);if(random()>survival){break;}throughput/=survival;}
  ro=p+gn*select(-EPS*3.,EPS*3.,dot(next,gn)>0.);rd=next;
 }
 return Lighting(result,visibility);
}
@compute @workgroup_size(8,8) fn main(@builtin(global_invocation_id) id:vec3u){
 if(id.x>=param.size.x||id.y>=param.size.y){return;}let index=id.y*param.size.x+id.x;
 rng=(index+1u)*1973u+(param.size.w+1u)*9277u;
 // Stable primary rays keep ink detail out of the stochastic lighting signal.
 let uv=(vec2f(id.xy)+vec2f(.5))/vec2f(param.size.xy);
 let q=(uv*2.-1.)*vec2f(1.,-1.);
 let ray=normalize(vec3f(q*param.projection.xy+param.projection.zw,-1.));
 let primary=trace(param.camera.xyz,ray,1e5);
 var color=vec4f(0);
 var albedo=vec4f(1,1,1,0);
 var normal=vec3f(0,0,1);var surface=vec4f(0);var history=vec4f(0);
 if(primary.kind==1){
  let ink=inkColor(primary);let front=dot(primary.gn,-ray)>0.;
  albedo=vec4f(max(select(mix(vec3f(1),ink,.12),ink,front),vec3f(.002)),1);
  normal=shadingNormal(primary,-ray);
  let p=param.camera.xyz+ray*primary.t;
  let gn=select(-primary.gn,primary.gn,front);
  let base=diffuseDirect(p,normal,gn,material(primary,front));
  let lighting=radiance(param.camera.xyz,ray,primary,base);
  // Accumulate only the residual illumination, never the print or analytic base.
  var residual=(lighting.color-base)/albedo.rgb;
  var count=1.;surface=vec4f(primary.uv,select(-1.,1.,front),lighting.visibility);
  if(param.temporal.x>.5){
   let tri=previousTris[primary.triangle];let bary=primary.bary;
   let oldPoint=tri.a.xyz*(1.-bary.x-bary.y)+tri.b.xyz*bary.x+tri.c.xyz*bary.y;
   let delta=oldPoint-param.previousCamera.xyz;
   let ndc=(delta.xy/(-delta.z)-param.previousProjection.zw)/param.previousProjection.xy;
   let coord=(ndc*vec2f(.5,-.5)+.5)*vec2f(param.size.xy)-.5;
   let origin=vec2i(floor(coord));let fraction=fract(coord);
   var sum=vec3f(0);var weights=0.;var lengthSum=0.;
   for(var y=0;y<2;y++){for(var x=0;x<2;x++){
    let q=origin+vec2i(x,y);
    if(any(q<vec2i(0))||any(q>=vec2i(param.size.xy))){continue;}
    let guide=textureLoad(previousGuide,q,0);let oldSurface=textureLoad(previousSurface,q,0);
    let old=textureLoad(previousHistory,q,0);
    if(old.a<1.||dot(guide.xyz,normal)<.94||abs(guide.w-length(delta))>.035||distance(oldSurface.xy,primary.uv)>.012||oldSurface.z!=surface.z||abs(oldSurface.w-surface.w)>.26){continue;}
    let wx=select(1.-fraction.x,fraction.x,x==1);let wy=select(1.-fraction.y,fraction.y,y==1);let weight=wx*wy;
    sum+=old.rgb*weight;lengthSum+=old.a*weight;weights+=weight;
   }}
   if(weights>.1){
    // Short moving history limits lighting lag when other parts of the sheet
    // change occlusion. Stationary poses retain progressive convergence.
    let limit=select(127.,11.,param.temporal.y>.5);
    let age=min(limit,lengthSum/weights);count=age+1.;
    residual=(residual+sum/weights*age)/count;
   }
  }
  history=vec4f(residual,count);color=vec4f(max(vec3f(0),base+residual*albedo.rgb),1);

 }
 else if(primary.kind==2){
  // Shadow catcher: area-emitter visibility on the real blog background.
  // Paper paths still include multibounce wall reflection; DOM compositing is separate.
  let p=param.camera.xyz+ray*primary.t;
  // Conservative projected BVH bounds: empty canvas padding needs no shadow rays.
  let root=nodes[0];
  let spread=max(0.,root.hi.z-param.scene.y)/max(EPS,param.light.z-root.hi.z);
  let reach=(max(abs(param.light.xy-root.lo.xy),abs(param.light.xy-root.hi.xy))+vec2f(param.light.w,param.scene.x)*.5)*spread;
  if(all(p.xy>=root.lo.xy-reach)&&all(p.xy<=root.hi.xy+reach)){
  for(var sample=0;sample<16;sample++){
   // Stable area-light quadrature: no temporal random grain on the wall.
   let cell=vec2f(f32(sample%4),f32(sample/4));
   let uvLight=(cell+vec2f(.5))*.25-vec2f(.5);
   let lp=param.light.xyz+vec3f(uvLight*vec2f(param.light.w,param.scene.x),0.);
   let delta=lp-p;let dist=length(delta);let blocker=trace(p+vec3f(0,0,EPS*3.),delta/dist,dist-EPS*8.);
   if(blocker.kind==1){color.a+=.18/16.;}
  }}
 }
 textureStore(guideTex,vec2i(id.xy),vec4f(normal,primary.t));
 textureStore(albedoTex,vec2i(id.xy),albedo);
 textureStore(surfaceTex,vec2i(id.xy),surface);
 textureStore(historyTex,vec2i(id.xy),history);
 textureStore(outputTex,vec2i(id.xy),color);
}
