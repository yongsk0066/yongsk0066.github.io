struct Node { lo:vec3f,left:i32,hi:vec3f,right:i32 }
struct Triangle { a:vec4f,b:vec4f,c:vec4f,na:vec4f,nb:vec4f,nc:vec4f,uv01:vec4f,uv2:vec4f }
struct Params { size:vec4u, camera:vec4f, light:vec4f, scene:vec4f, optical:vec4f, flags:vec4f, projection:vec4f, background:vec4f }
// size: width,height,accumulated samples,seed. light xyz + width. scene: height,wallZ,Le,emitter normal z.
// optical: R,T,coat,roughness. flags: bounces,material,printed,unused.
@group(0) @binding(0) var<storage,read> nodes:array<Node>;
@group(0) @binding(1) var<storage,read> tris:array<Triangle>;
@group(0) @binding(2) var<storage,read_write> accum:array<vec4f>;
@group(0) @binding(3) var outputTex:texture_storage_2d<rgba16float,write>;
@group(0) @binding(4) var<uniform> param:Params;
@group(0) @binding(5) var inkTex:texture_2d<f32>;
@group(0) @binding(6) var inkSampler:sampler;
const PI=3.14159265359;
const EPS=.0002;
var<private> rng:u32;
fn random()->f32 {rng=rng*747796405u+2891336453u;let w=((rng>>((rng>>28u)+4u))^rng)*277803737u;return f32((w>>22u)^w)/4294967296.;}
struct Hit { t:f32, n:vec3f, gn:vec3f, uv:vec2f, kind:i32 }
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
   let t=dot(e2,q)/det;if(t>EPS&&t<hit.t){hit.t=t;hit.kind=1;hit.gn=normalize(cross(e1,e2));hit.n=normalize(tri.na.xyz*(1.-u-v)+tri.nb.xyz*u+tri.nc.xyz*v);hit.uv=tri.uv01.xy*(1.-u-v)+tri.uv01.zw*u+tri.uv2.xy*v;}
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
fn material(hit:Hit,front:bool)->Material {
 var m:Material;m.rough=param.optical.w;
 if(hit.kind==2){m.r=param.background.rgb*.76;m.t=vec3f(0);m.s=0.;return m;}
 var ink=vec3f(1);
 if(param.flags.z>.5){ink=pow(textureSampleLevel(inkTex,inkSampler,vec2f(hit.uv.x,1.-hit.uv.y),0.).rgb,vec3f(2.2));}
 // A weak, deterministic fiber density modulation, not a yellow color texture.
 let fiber=1.-.012*(.5+.5*sin(hit.uv.x*1700.+sin(hit.uv.y*1200.)));
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
fn radiance(ro0:vec3f,rd0:vec3f)->vec3f {
 var ro=ro0;var rd=rd0;var throughput=vec3f(1);var result=vec3f(0);
 for(var bounce=0;bounce<i32(param.flags.x);bounce++){
  let hit=trace(ro,rd,1e5);if(hit.kind==0){break;}if(hit.kind==3){if(bounce==0){result+=throughput*param.scene.z;}break;}
  let p=ro+rd*hit.t;let wo=-rd;let gn=select(-hit.gn,hit.gn,dot(hit.gn,wo)>0.);
  // Geometric normal ensures reciprocal, energy-auditable two-sided scattering.
  let n=gn;let m=material(hit,dot(hit.gn,wo)>0.);
  let lp=param.light.xyz+vec3f((random()-.5)*param.light.w,(random()-.5)*param.scene.x,0.);
  let delta=lp-p;let dist=length(delta);let wi=delta/dist;let cosL=max(0.,-wi.z*param.scene.w);
  if(cosL>0.){let origin=p+gn*select(-EPS*3.,EPS*3.,dot(wi,gn)>0.);let blocker=trace(origin,wi,dist-EPS*8.);if(blocker.kind==0){let lightPdf=dist*dist/(cosL*param.light.w*param.scene.x);result+=throughput*evaluate(m,n,wo,wi)*abs(dot(n,wi))*param.scene.z/lightPdf;}}
  let next=sampleDirection(m,n,wo);if(length(next)<.5){break;}let probability=pdf(m,n,wo,next);if(probability<1e-9){break;}
  throughput*=evaluate(m,n,wo,next)*abs(dot(n,next))/probability;
  if(bounce>=2){let survival=clamp(max(throughput.x,max(throughput.y,throughput.z)),.05,.95);if(random()>survival){break;}throughput/=survival;}
  ro=p+gn*select(-EPS*3.,EPS*3.,dot(next,gn)>0.);rd=next;
 }
 return result;
}
@compute @workgroup_size(8,8) fn main(@builtin(global_invocation_id) id:vec3u){
 if(id.x>=param.size.x||id.y>=param.size.y){return;}let index=id.y*param.size.x+id.x;
 rng=(index+1u)*1973u+(param.size.w+1u)*9277u;
 let uv=(vec2f(id.xy)+vec2f(random(),random()))/vec2f(param.size.xy);
 let q=(uv*2.-1.)*vec2f(1.,-1.);
 let ray=normalize(vec3f(q*param.projection.xy+param.projection.zw,-1.));
 let primary=trace(param.camera.xyz,ray,1e5);
 var color=vec4f(0);
 if(primary.kind==1){color=vec4f(radiance(param.camera.xyz,ray),1);}
 else if(primary.kind==2){
  // Shadow catcher: area-emitter visibility on the real blog background.
  // Paper paths still include multibounce wall reflection; DOM compositing is separate.
  let p=param.camera.xyz+ray*primary.t;
  let lp=param.light.xyz+vec3f((random()-.5)*param.light.w,(random()-.5)*param.scene.x,0.);
  let delta=lp-p;let dist=length(delta);let blocker=trace(p+vec3f(0,0,EPS*3.),delta/dist,dist-EPS*8.);
  if(blocker.kind==1){color=vec4f(0,0,0,.24);}
 }
 let old=select(vec4f(0),accum[index],param.size.z>0u);
 let mean=(old*f32(param.size.z)+color)/f32(param.size.z+1u);
 accum[index]=mean;textureStore(outputTex,vec2i(id.xy),mean);
}
