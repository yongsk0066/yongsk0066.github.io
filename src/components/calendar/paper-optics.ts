/** RGB channels approximate spectral bands. The two GPU paths share the same
 * fitted two-flux print model, including the clear 80% of the sheet at the back.
 * The ink curves take the measured front colour in linear light. */
export function paperOpticsShader(language: 'wgsl' | 'glsl') {
  const wgsl = language === 'wgsl';
  const vector = wgsl ? 'vec3f' : 'vec3';
  const local = wgsl ? 'let' : 'vec3';
  const scalar = wgsl ? 'let' : 'float';
  const slab = wgsl
    ? 'fn paperSlab(f: f32, r: f32, t: f32) -> vec3f'
    : 'vec3 paperSlab(float f, float r, float t)';
  const transfer = (name: string) => wgsl
    ? `fn ${name}(ink: vec3f, f: f32) -> vec3f`
    : `vec3 ${name}(vec3 ink, float f)`;
  const surface = wgsl
    ? 'fn surfaceBRDF(rough: f32, weight: f32, n: vec3f, wo: vec3f, wi: vec3f) -> f32'
    : 'float surfaceBRDF(float rough, float weight, vec3 n, vec3 wo, vec3 wi)';
  return `
${slab} {
  // Quadratic through the exact KM solutions at 91%, 100% and 109% thickness.
  return ${vector}(r, t, 0.77648212) + f * (
    ${vector}(0.01236951, -0.01385737, 0.01448660) +
    f * ${vector}(-0.00098354, 0.00098993, -0.00107873));
}
${transfer('printBackFraction')} {
  return ink + ink * (${vector}(1.0) - ink) *
    (${vector}(0.28650535 - 0.09278797 * f) + ink * (-0.06906527 + 0.08328469 * f));
}
${transfer('printTransmission')} {
  ${local} d = ink - ${vector}(0.06541667);
  ${local} correction = ${vector}(-0.05771211 + 0.00216425 * f) +
    ink * (0.04390698 - 0.04032246 * f);
  return clamp(ink + ink * (${vector}(1.0) - ink) * correction /
    (d * d + ${vector}(0.04900393)), ${vector}(0.0), ${vector}(1.0));
}
${surface} {
  ${scalar} ni = dot(n, wi);
  if (ni <= 0.0 || weight == 0.0) { return 0.0; }
  ${scalar} nv = max(0.0001, dot(n, wo));
  ${local} h = normalize(wi + wo);
  ${scalar} nh = max(0.0, dot(n, h));
  ${scalar} grazing = 1.0 - clamp(dot(wi, h), 0.0, 1.0);
  ${scalar} g2 = grazing * grazing;
  // A dilute dielectric interface. Its maximum reflectance stays within the
  // absorption reserve of our lightest unprinted sheet.
  ${scalar} fresnel = weight * (1.0 + 11.0 * g2 * g2 * grazing);
  ${scalar} a2 = rough * rough;
  ${scalar} d = 1.0 + nh * nh * (a2 - 1.0);
  ${scalar} v = nv + sqrt(a2 + (1.0 - a2) * nv * nv);
  ${scalar} l = ni + sqrt(a2 + (1.0 - a2) * ni * ni);
  return fresnel * a2 / (3.14159265 * d * d * v * l);
}`;
}
