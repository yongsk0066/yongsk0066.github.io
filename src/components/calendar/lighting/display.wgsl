// Full output-resolution ink over separately filtered, half-resolution lighting.
@group(0) @binding(0) var lightTex:texture_2d<f32>;
@group(0) @binding(1) var surfaces:texture_2d<f32>;
@group(0) @binding(2) var inkTex:texture_2d<f32>;
@group(0) @binding(3) var inkSampler:sampler;
struct Vertex { @builtin(position) position:vec4f, @location(0) uv:vec2f }
@vertex fn vs(@builtin(vertex_index) i:u32)->Vertex {
 let x=f32((i<<1u)&2u);let y=f32(i&2u);return Vertex(vec4f(x*2.-1.,y*2.-1.,0,1),vec2f(x,1.-y));
}
@fragment fn fs(v:Vertex)->@location(0) vec4f {
 let size=vec2i(textureDimensions(lightTex));let coord=v.uv*vec2f(size)-.5;
 let origin=vec2i(floor(coord));let fraction=fract(coord);
 var color=vec3f(0);var alpha=0.;var uv=vec2f(0);var coverage=0.;var totalCoverage=0.;var side=1.;var best=-1.;var reference=vec4f(0);
 // Select the nearest visible paper surface. Don't blend front/back UVs across folds.
 for(var y=0;y<2;y++){for(var x=0;x<2;x++){
  let q=clamp(origin+vec2i(x,y),vec2i(0),size-1);let s=textureLoad(surfaces,q,0);
  let w=select(1.-fraction.x,fraction.x,x==1)*select(1.-fraction.y,fraction.y,y==1);
  if(abs(s.z)>.5&&w>best){best=w;reference=s;side=s.z;}
 }}
 for(var y=0;y<2;y++){for(var x=0;x<2;x++){
  let q=clamp(origin+vec2i(x,y),vec2i(0),size-1);let s=textureLoad(surfaces,q,0);let light=textureLoad(lightTex,q,0);
  let w=select(1.-fraction.x,fraction.x,x==1)*select(1.-fraction.y,fraction.y,y==1);
  if(abs(s.z)>.5){
   totalCoverage+=w;
   // A discontinuity uses the nearest surface rather than smearing printed digits.
   if(s.z==side&&distance(s.xy,reference.xy)<.025){uv+=s.xy*w;color+=light.rgb*w;coverage+=w;}
  }else{alpha+=light.a*w;}
 }}
 if(coverage>0.){
  uv/=coverage;color/=coverage;
  let c=textureSampleLevel(inkTex,inkSampler,vec2f(uv.x,1.-uv.y),0.).rgb;
  let ink=select(c/12.92,pow((c+.055)/1.055,vec3f(2.4)),c>vec3f(.04045));
  color=clamp(color*max(select(mix(vec3f(1),ink,.12),ink,side>0.),vec3f(.002)),vec3f(0),vec3f(1));
  color=select(12.92*color,1.055*pow(color,vec3f(1./2.4))-.055,color>vec3f(.0031308));
 }
 return vec4f(color*totalCoverage,alpha+totalCoverage);
}
