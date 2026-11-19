// Real full-resolution triangle rasterization provides exact UV/depth/silhouette.
// Only secondary light and direct-occlusion corrections are reconstructed.
@group(0) @binding(0) var directTex:texture_2d<f32>;
@group(0) @binding(1) var indirectTex:texture_2d<f32>;
@group(0) @binding(2) var inkTex:texture_2d<f32>;
@group(0) @binding(3) var inkSampler:sampler;
@group(0) @binding(4) var guides:texture_2d<f32>;
@group(0) @binding(5) var surfaces:texture_2d<f32>;
@group(0) @binding(6) var<storage,read> tris:array<Triangle>;
@group(0) @binding(7) var<uniform> param:Params;
@group(0) @binding(8) var stockTex:texture_2d<f32>;
@group(0) @binding(9) var stockSampler:sampler;
struct Background { @builtin(position) position:vec4f, @location(0) uv:vec2f }
@vertex fn vs(@builtin(vertex_index) i:u32)->Background {
 let x=f32((i<<1u)&2u);let y=f32(i&2u);return Background(vec4f(x*2.-1.,y*2.-1.,.999999,1),vec2f(x,1.-y));
}
@fragment fn fs(v:Background)->@location(0) vec4f {
 let size=vec2i(param.size.xy);let coord=v.uv*vec2f(size)-.5;let origin=vec2i(floor(coord));let fraction=fract(coord);var alpha=0.;
 for(var y=0;y<2;y++){for(var x=0;x<2;x++){
  let q=clamp(origin+vec2i(x,y),vec2i(0),size-1);
  if(abs(textureLoad(surfaces,q,0).z)<.5){alpha+=textureLoad(directTex,q,0).a*select(1.-fraction.x,fraction.x,x==1)*select(1.-fraction.y,fraction.y,y==1);}
 }}
 return vec4f(0,0,0,alpha);
}
struct PaperVertex {
 @builtin(position) position:vec4f,
 @location(0) world:vec3f,
 @location(1) uv:vec2f,
 @location(2) normal:vec3f,
 @location(3) @interpolate(flat) geometric:vec3f,
 @location(4) irradiance:vec3f,
 @location(5) @interpolate(flat) tangent:vec4f,
}
@vertex fn vsPaper(@builtin(vertex_index) i:u32)->PaperVertex {
 let tri=tris[i/3u];let vertex=i%3u;
 var p=tri.a.xyz;var n=tri.na.xyz;var uv=tri.uv01.xy;
 if(vertex==1u){p=tri.b.xyz;n=tri.nb.xyz;uv=tri.uv01.zw;}
 if(vertex==2u){p=tri.c.xyz;n=tri.nc.xyz;uv=tri.uv2.xy;}
 let delta=p-param.camera.xyz;let depth=-delta.z;
 let xy=(delta.xy-param.projection.zw*depth)/param.projection.xy;
 let ab = tri.b.xyz - tri.a.xyz; let ac = tri.c.xyz - tri.a.xyz;
 let uvB = tri.uv01.zw - tri.uv01.xy; let uvC = tri.uv2.xy - tri.uv01.xy;
 let handedness = select(-1., 1., uvB.x * uvC.y >= uvB.y * uvC.x);
 let tangent = ab * uvC.y - ac * uvB.y;
 let frame = vec4f(tangent * (handedness / max(length(tangent), 1e-8)), handedness);
 // Camera near/far are fixed at .1 / 100 in paper-preview.ts.
 return PaperVertex(vec4f(xy,(100.*depth-10.)/99.9,depth),p,uv,n,normalize(cross(ab,ac)),irradianceVector(p),frame);
}
@fragment fn fsPaper(v:PaperVertex)->@location(0) vec4f {
 let wo=normalize(param.camera.xyz-v.world);let front=dot(v.geometric,wo)>0.;let side=select(-1.,1.,front);
 var hit:Hit;hit.kind=1;hit.uv=v.uv;hit.n=normalize(v.normal);hit.gn=v.geometric;
 let n = shadingNormal(hit,wo);
 let sheet = textureSample(stockTex, stockSampler, v.uv * FORMATION_SCALE);
 let relief = textureSample(stockTex, stockSampler, v.uv * RELIEF_SCALE);
 var m = paperMaterial(hit, front, signedStock(sheet.r));
 let albedo = albedoForFilter(m);
 let delta=v.world-param.camera.xyz;
 let ndc=(delta.xy/(-delta.z)-param.projection.zw)/param.projection.xy;
 let size=vec2i(param.size.xy);let coord=(ndc*vec2f(.5,-.5)+.5)*vec2f(size)-.5;
 let center=vec2i(floor(coord));var correction=vec3f(0);var indirect=vec3f(0);var sum=0.;var blocked=0.;
 // Joint bilateral upsampling uses full-resolution depth, normal, side and UV.
 for(var y=0;y<2;y++){for(var x=0;x<2;x++){
  let q=clamp(center+vec2i(x,y),vec2i(0),size-1);let s=textureLoad(surfaces,q,0);let g=textureLoad(guides,q,0);
  if(sign(s.z)!=side||distance(s.xy,v.uv)>.025||dot(n,g.xyz)<.8){continue;}
  let offset=vec2f(q)-coord;let weight=exp(-dot(offset,offset)*1.5)*exp(-abs(g.w-length(delta))*45.)*pow(max(0.,dot(n,g.xyz)),24.);
  correction+=textureLoad(directTex,q,0).rgb*weight;indirect+=textureLoad(indirectTex,q,0).rgb*weight;sum+=weight;
  blocked += s.w * weight;
 }}
 // The reconstruction guide follows the mesh. Only resolved surface shading
 // rotates in the material frame; invisible slopes widen the reflection lobe.
 let visible = 1. - blocked / max(sum, .00001);
 let tangent = v.tangent.xyz - n * dot(n, v.tangent.xyz);
 let u = tangent / max(length(tangent), 1e-8);
 let slopes = (relief.gb * 255. - vec2f(128.)) / 127.;
 let variance = max(0., relief.a - dot(slopes, slopes)) * SLOPE_SCALE * SLOPE_SCALE;
 let amount = visible * smoothstep(0., .15, dot(n, wo)) * select(0., 1., param.flags.y > .5);
 let detailed = normalize(n - amount * SLOPE_SCALE *
   (side * u * slopes.x + v.tangent.w * cross(n, u) * slopes.y));
 let rough = sqrt(param.optical.w * param.optical.w + mix(MEAN_SLOPE_POWER, variance, amount));
 // This constant-BRDF area integral is the control variate also subtracted
 // from the traced direct light. It preserves the full-resolution relief.
 let representative = surfaceBRDF(rough, m.s, detailed, wo, normalize(param.light.xyz - v.world));
 m.r += vec3f(PI * representative);
 var base=vec3f(0);let gn=v.geometric*side;
 if(wholeHemisphere(v.world,detailed,gn)){base=m.r*max(0.,dot(detailed,v.irradiance))*param.scene.z/PI;}
 else if(wholeHemisphere(v.world,-detailed,-gn)){base=m.t*max(0.,dot(-detailed,v.irradiance))*param.scene.z/PI;}
 else{base=diffuseDirect(v.world,detailed,gn,m);}
 var color=clamp(base+(correction+indirect)/max(sum,.00001)*albedo,vec3f(0),vec3f(1));
 color=select(12.92*color,1.055*pow(color,vec3f(1./2.4))-.055,color>vec3f(.0031308));
 return vec4f(color,1);
}
