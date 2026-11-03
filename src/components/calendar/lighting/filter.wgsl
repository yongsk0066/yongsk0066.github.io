// Filter demodulated light at lighting resolution, never the printed calendar.
@group(0) @binding(0) var image:texture_2d<f32>;
@group(0) @binding(1) var guides:texture_2d<f32>;
@group(0) @binding(2) var albedos:texture_2d<f32>;
@group(0) @binding(3) var filtered:texture_storage_2d<rgba16float,write>;
@compute @workgroup_size(8,8) fn main(@builtin(global_invocation_id) id:vec3u){
 if(any(id.xy>=textureDimensions(image))){return;}
 let center=vec2i(id.xy);let size=vec2i(textureDimensions(image));
 let guide=textureLoad(guides,center,0);let ink=textureLoad(albedos,center,0);
 var light=vec3f(0);var alpha=0.;var weightSum=0.;
 // Filter only demodulated light. Ink is reconstructed from this exact pixel,
 // never averaged with neighboring digits. Geometry stops filtering across folds.
 for(var y=-2;y<=2;y++){for(var x=-2;x<=2;x++){
  let q=clamp(center+vec2i(x,y)*2,vec2i(0),size-vec2i(1));
  let other=textureLoad(guides,q,0);let otherInk=textureLoad(albedos,q,0);
  if(abs(ink.a-otherInk.a)>.5){continue;}
  let spatial=exp(-f32(x*x+y*y)*.32);
  let orientation=pow(max(0.,dot(guide.xyz,other.xyz)),24.);
  let depth=exp(-abs(guide.w-other.w)*45.);
  let weight=spatial*orientation*depth;
  let sample=textureLoad(image,q,0);
  light+=sample.rgb/otherInk.rgb*weight;alpha+=sample.a*weight;weightSum+=weight;
 }}
 textureStore(filtered,center,vec4f(light/max(weightSum,.00001),alpha/max(weightSum,.00001)));
}
