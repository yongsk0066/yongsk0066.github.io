// Variance-guided, geometry-aware à-trous reconstruction of two separate signals.
@id(0) override step:i32=1;
@group(0) @binding(0) var directTex:texture_2d<f32>;
@group(0) @binding(1) var indirectTex:texture_2d<f32>;
@group(0) @binding(2) var guides:texture_2d<f32>;
@group(0) @binding(3) var surfaces:texture_2d<f32>;
@group(0) @binding(4) var momentsTex:texture_2d<f32>;
@group(0) @binding(5) var directOut:texture_storage_2d<rgba16float,write>;
@group(0) @binding(6) var indirectOut:texture_storage_2d<rgba16float,write>;
fn luminance(c:vec3f)->f32 {return dot(c,vec3f(.2126,.7152,.0722));}
@compute @workgroup_size(8,8) fn main(@builtin(global_invocation_id) id:vec3u){
 if(any(id.xy>=textureDimensions(directTex))){return;}
 let center=vec2i(id.xy);let size=vec2i(textureDimensions(directTex));let guide=textureLoad(guides,center,0);
 let surface=textureLoad(surfaces,center,0);let d=textureLoad(directTex,center,0);let gi=textureLoad(indirectTex,center,0);let m=textureLoad(momentsTex,center,0);
 let paper=abs(surface.z)>.5;
 // Empty padding and settled low-variance GI need no wide filter passes.
 if(!paper&&(step>1||d.a==0.)){textureStore(directOut,center,d);textureStore(indirectOut,center,gi);return;}
 let dv=max(0.,m.y-m.x*m.x)/max(d.a,1.);let iv=max(0.,m.w-m.z*m.z)/max(gi.a,1.);
 // New pixels need spatial support even before enough samples exist for variance.
 let uncertainty=max(iv,.015/max(gi.a*gi.a,1.));
 let strength=clamp(sqrt(uncertainty)*8.,.08,1.);
 if(step>1&&strength<.15){textureStore(directOut,center,d);textureStore(indirectOut,center,gi);return;}
 var ds=vec4f(0);var dw=0.;var gs=vec3f(0);var gw=0.;
 for(var y=-2;y<=2;y++){for(var x=-2;x<=2;x++){
  let q=clamp(center+vec2i(x,y)*step,vec2i(0),size-1);let os=textureLoad(surfaces,q,0);
  if(os.z!=surface.z){continue;}if(paper&&distance(os.xy,surface.xy)>.05*f32(step)){continue;}
  let og=textureLoad(guides,q,0);
  let spatial=exp(-f32(x*x+y*y)*.55);
  let shape=pow(max(0.,dot(guide.xyz,og.xyz)),32.)*exp(-abs(guide.w-og.w)*45./f32(step));
  let nd=textureLoad(directTex,q,0);let ni=textureLoad(indirectTex,q,0);
  if(step==1){
   // Direct shadow gets only the tight first pass; never the wide GI kernel.
   let difference=select(abs(nd.a-d.a),abs(luminance(nd.rgb)-luminance(d.rgb)),paper);
   let sigma=select(.04,sqrt(dv+.0001)*3.+.015,paper);
   let weight=spatial*shape*exp(-difference/max(sigma,.0001));ds+=nd*weight;dw+=weight;
  }
  let sigma=sqrt(uncertainty)*4.+.02;
  let weight=spatial*shape*exp(-abs(luminance(ni.rgb)-luminance(gi.rgb))/sigma);
  gs+=ni.rgb*weight;gw+=weight;
 }}
 var filteredDirect=d;if(step==1){filteredDirect=ds/max(dw,.00001);filteredDirect.a=select(filteredDirect.a,d.a,paper);}
 textureStore(directOut,center,filteredDirect);
 textureStore(indirectOut,center,vec4f(mix(gi.rgb,gs/max(gw,.00001),strength),gi.a));
}
