@group(0) @binding(0) var image:texture_2d<f32>;
@group(0) @binding(1) var guides:texture_2d<f32>;
@group(0) @binding(2) var albedos:texture_2d<f32>;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let x=f32((i<<1u)&2u);let y=f32(i&2u);return vec4f(x*2.-1.,y*2.-1.,0,1);
}
@fragment fn fs(@builtin(position) p:vec4f)->@location(0) vec4f {
 let center=vec2i(p.xy);let size=vec2i(textureDimensions(image));
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
 let color=clamp(light/max(weightSum,.00001)*ink.rgb,vec3f(0),vec3f(1));
 let a=alpha/max(weightSum,.00001);
 // Linear exposure and exact sRGB transfer preserve the original print palette.
 // There is no posture-dependent exposure or replacement image.
 let srgb=select(12.92*color,1.055*pow(color,vec3f(1./2.4))-.055,color>vec3f(.0031308));
 return vec4f(srgb,a);
}
