import {
  CanvasTexture, DataTexture, DoubleSide, LinearFilter, LinearMipmapLinearFilter,
  MeshLambertMaterial, RepeatWrapping,
} from 'three';
import {paperOpticsShader} from './paper-optics';
import {getPaperStockLevels, paperSlopeScale} from './paper-stock';

// The fallback scene has one directional emitter and a hemisphere fill. Keep
// Three's colour management, camera and light uniforms, but evaluate both
// sides of the same thin sheet as the WebGPU material.
// The GGX lobe is broad on this stock. Evaluate its two limiting roughnesses
// at vertices, then interpolate at the locally measured slope variance.
const vertexLight = `
#if NUM_DIR_LIGHTS > 0
struct DirectionalLight { vec3 direction; vec3 color; };
uniform DirectionalLight directionalLights[NUM_DIR_LIGHTS];
#endif
varying vec4 vPaperLight;
${paperOpticsShader('glsl')}
`;

const vertexResponse = `
#if NUM_DIR_LIGHTS > 0
  vec3 l = directionalLights[0].direction;
  vec3 v = normalize(-mvPosition.xyz);
  vec3 n = vNormal * (dot(vNormal, l) >= 0.0 ? 1.0 : -1.0);
  vPaperLight = vec4(dot(mvPosition.xyz, l) * .25,
    smoothstep(0.0, .15, abs(dot(vNormal, v))),
    PI * surfaceBRDF(.75, .001, n, v, l),
    PI * surfaceBRDF(sqrt(.75 * .75 + ${paperSlopeScale ** 2}), .001, n, v, l));
#else
  vPaperLight = vec4(0.0);
#endif
`;

const lightFunctions = `
uniform sampler2D paperStock;
varying vec4 vPaperLight;
const float nominalR = .80959008;
const float nominalT = .17328682;
const float interfaceWeight = .001;
${paperOpticsShader('glsl')}
`;

const incidentLight = `
vec2 stockUV = vMapUv * vec2(1.0, 1.25);
float formation = (texture2D(paperStock, stockUV).r * 255.0 - 128.0) / 127.0;
vec4 relief = texture2D(paperStock, stockUV * 32.0);
vec2 meanSlope = (relief.gb * 255.0 - 128.0) / 127.0;
float unresolved = max(0.0, relief.a - dot(meanSlope, meanSlope));
vec2 slope = meanSlope * (${paperSlopeScale} * vPaperLight.y);
vec3 slab = paperSlab(formation, nominalR, nominalT);
vec3 ink = diffuseColor.rgb;
vec3 reflection = vec3(slab.x), transmission = vec3(slab.y);
if (any(notEqual(ink, vec3(1.0)))) {
  reflection = gl_FrontFacing ? slab.x * ink : mix(vec3(slab.z), vec3(slab.x), printBackFraction(ink, formation));
  transmission *= printTransmission(ink, formation);
}

// The calendar's hemisphere fill has identical sky and ground irradiance.
vec3 room = ambientLightColor;
#if NUM_HEMI_LIGHTS > 0
  room += hemisphereLights[0].skyColor;
#endif
reflectedLight.indirectDiffuse = room * (reflection + transmission)
  * (.997526 * (1.0 - interfaceWeight) * RECIPROCAL_PI / (nominalR + nominalT));
#if NUM_DIR_LIGHTS > 0
  vec3 l = directionalLights[0].direction;
  float macroCos = dot(normal, l);
  // The inextensible grid is four scene units wide. Differentiate its
  // light-space position in material coordinates to get L dot T and L dot B.
  vec2 dx = dFdx(stockUV), dy = dFdy(stockUV);
  float det = dx.x * dy.y - dy.x * dx.y;
  vec2 heightDelta = vec2(dFdx(vPaperLight.x), dFdy(vPaperLight.x));
  vec2 tangentLight = (heightDelta.x * vec2(dy.y, -dy.x) + heightDelta.y * vec2(-dx.y, dx.x))
    * (faceDirection / max(abs(det), 1e-12));
  float fineCos = (macroCos - faceDirection * dot(slope, tangentLight)) * inversesqrt(1.0 + dot(slope, slope));
  vec3 response = macroCos >= 0.0 ? reflection * max(0.0, fineCos) : transmission * max(0.0, -fineCos);
  float gloss = mix(vPaperLight.z, vPaperLight.w, unresolved);
  reflectedLight.directDiffuse = directionalLights[0].color * ((1.0 - interfaceWeight) * response
    + vec3(macroCos >= 0.0 ? max(0.0, fineCos) * gloss : 0.0)) * (.997526 * RECIPROCAL_PI / nominalR);
#endif
`;

export function createPaperFallbackMaterial(map: CanvasTexture) {
  const levels = getPaperStockLevels();
  const base = levels[0];
  const stock = new DataTexture(base.data, base.width, base.height);
  stock.mipmaps = levels;
  stock.wrapS = stock.wrapT = RepeatWrapping;
  stock.magFilter = LinearFilter;
  stock.minFilter = LinearMipmapLinearFilter;
  stock.generateMipmaps = false;
  stock.needsUpdate = true;
  const material = new MeshLambertMaterial({map, side: DoubleSide});
  material.onBeforeCompile = shader => {
    shader.uniforms.paperStock = {value: stock};
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + vertexLight)
      .replace('#include <project_vertex>', '#include <project_vertex>\n' + vertexResponse);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <lights_lambert_pars_fragment>', lightFunctions)
      .replace('#include <lights_lambert_fragment>', incidentLight)
      .replace('#include <lights_fragment_begin>', '')
      .replace('#include <lights_fragment_maps>', '')
      .replace('#include <lights_fragment_end>', '');
  };
  material.addEventListener('dispose', () => stock.dispose());
  return material;
}
