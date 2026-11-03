struct Node { lo:vec3f,left:i32,hi:vec3f,right:i32 }
struct Triangle { a:vec4f,b:vec4f,c:vec4f,na:vec4f,nb:vec4f,nc:vec4f,uv01:vec4f,uv2:vec4f }
struct Params { size:vec4u, camera:vec4f, light:vec4f, scene:vec4f, optical:vec4f, flags:vec4f, projection:vec4f, background:vec4f, previousCamera:vec4f, previousProjection:vec4f, temporal:vec4f }

const PI=3.14159265359;
const EPS=.0002;

struct Hit { t:f32, n:vec3f, gn:vec3f, uv:vec2f, kind:i32, triangle:i32, bary:vec2f }

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
// Unclipped vector irradiance is smooth across each small triangle under the
// distant emitter. Interpolate it at vertices; horizon-crossing fragments still
// use the exact clipped integral below.
fn irradianceVector(p:vec3f)->vec3f {
 let center=param.light.xyz-p;let w=param.light.w*.5;let h=param.scene.x*.5;
 let vertices=array<vec3f,4>(center+vec3f(-w,-h,0),center+vec3f(w,-h,0),center+vec3f(w,h,0),center+vec3f(-w,h,0));
 var sum=vec3f(0);
 for(var i=0;i<4;i++){
  let a=normalize(vertices[i]);let b=normalize(vertices[(i+1)%4]);let edge=cross(a,b);let len=length(edge);
  if(len>1e-7){sum+=edge*(atan2(len,dot(a,b))/len);}
 }
 return sum*.5;
}
fn wholeHemisphere(p:vec3f,n:vec3f,gn:vec3f)->bool {
 let center=param.light.xyz-p;let extent=vec2f(param.light.w,param.scene.x)*.5;
 return dot(center,n)>=dot(abs(n.xy),extent)&&dot(center,gn)>=dot(abs(gn.xy),extent);
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
