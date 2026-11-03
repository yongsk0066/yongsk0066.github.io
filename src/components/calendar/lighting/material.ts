/** Finite slab, two-flux Kubelka–Munk approximation. Units: mm, mm^-1.
 * Not the full Papas 2014 angular BSDF, and not a measurement of newsprint. */
export function slabRT(K:number,S:number,t:number){
 if(K<0||S<0||t<0)throw new RangeError('Nonnegative optical parameters required');
 if(t===0)return {R:0,T:1,A:0};
 if(S===0){const T=Math.exp(-K*t);return {R:0,T,A:1-T};}
 if(K<1e-9){const R=S*t/(1+S*t);return {R,T:1-R,A:0};}
 const a=1+K/S,b=Math.sqrt(a*a-1),x=b*S*t;
 const e=Math.exp(-2*x),den=a*(1-e)+b*(1+e);
 const R=(1-e)/den,T=2*b*Math.exp(-x)/den;
 return {R,T,A:1-R-T};
}
export function opticalAudit(){let maxEnergy=0,minEnergy=1,violations=0;for(const K of [0,.01,.25,3,100])for(const S of [0,1,65,140])for(const t of [0,.025,.07,.15,10]){const m=slabRT(K,S,t);maxEnergy=Math.max(maxEnergy,m.R+m.T);minEnergy=Math.min(minEnergy,m.R+m.T);if(!Number.isFinite(m.R+m.T)||m.R<0||m.T<0||m.A< -1e-10)violations++;}return {cases:100,maxEnergy,minEnergy,violations,nominal:slabRT(.25,65,.07)};}
