// Millimetres; +y is the front, +z is up. Mounting offsets follow the user's photo.
export type V3 = [number, number, number];
export type Part = { assembly: string; shape: 'box' | 'face' | 'disc' | 'line'; p: V3; size: V3; radius: number; material: string; points?: V3[]; feature?: string };
export const devices = [
  { id: 'ap', name: 'U7 Pro XGS', role: 'Wi-Fi 7 · 10GbE / PoE++', size: 'Ø215 × 32.5 mm', center: [140.5,130,624] as V3 },
  { id: 'gateway', name: 'UCG Fiber', role: '게이트웨이 · 중앙 상태 화면', size: '212.8 × 127.6 × 30 mm', center: [140.5,196,552] as V3 },
  { id: 'switch', name: 'USW Pro XG 8 PoE', role: '8 × RJ45 · 2 × SFP+', size: '210.4 × 173.8 × 43.7 mm', center: [140.5,173,487] as V3 },
  { id: 'patch', name: '12-port patch panel', role: '사진의 0.5U 패치 패널', size: '10-inch · 12 ports', center: [140.5,250,441] as V3 },
  { id: 'comet', name: 'Comet X', role: '4채널 KVM · 3.69″ 화면', size: '170 × 90 × 40 mm', center: [140.5,215,394] as V3 },
  { id: 'mini', name: 'Mac mini M4', role: '컴퓨트 · 전면 USB-C 2개', size: '127 × 127 × 50 mm', center: [140.5,196.5,279] as V3 },
  { id: 'nas', name: 'UGREEN DXP4800 GT', role: '스토리지 · 4개 드라이브 베이', size: '178 × 257.5 × 178 mm', center: [140.5,131.25,109] as V3 },
];
export const parts: Part[] = [];
const add = (assembly: string, shape: Part['shape'], p: V3, size: V3, radius = 1, material = 'silver', feature?: string) => parts.push({assembly,shape,p,size,radius,material,feature});
const box = (a:string,x:number,y:number,z:number,w:number,d:number,h:number,r=1,m='silver',f?:string) => add(a,'box',[x,y,z],[w,d,h],r,m,f);
const face = (a:string,x:number,y:number,z:number,w:number,h:number,r=1,m='black',f?:string) => add(a,'face',[x,y,z],[w,0,h],r,m,f);
const disc = (a:string,x:number,y:number,z:number,r:number,h:number,m='white',f?:string) => add(a,'disc',[x,y,z],[r*2,r*2,h],r,m,f);
const line = (a:string,points:V3[],m='silver',f?:string) => parts.push({assembly:a,shape:'line',p:points[0],size:[0,0,0],radius:0,material:m,points,feature:f});
box('frame',0,0,8,281,260,6,3,'dark');
for (const x of [3,260]) for (const y of [3,239]) {
  box('frame',x,y,0,18,18,8,3,'black');
  box('frame',x,y,14,18,18,582,1,'silver','upright');
}
for(const x of [8,267]) for(let u=0;u<36;u++) face('frame',x,258,24+u*15.7,5,5,1,'hole','rail-hole');
box('roof',0,0,596,281,260,5,3,'dark','roof-deck');
for(let x=25;x<262;x+=17) for(let y=24;y<238;y+=27) box('roof',x,y,601,8,18,.1,3,'hole','roof-vent');
for(const x of [15,249]) {
  box('roof',x,30,601,15,16,24,3);box('roof',x,204,601,15,16,24,3);box('roof',x,30,622,15,190,7,3);
}
box('panel',279,22,25,2,216,558,1,'glass');
disc('ap',140.5,130,608,107.5,32.5,'white','access-point');
const adapter=(a:string,z:number,h:number)=>{
  const b=a==='gateway'?{x:34.1,z:537,w:212.8,h:30}:{x:35.3,z:466,w:210.4,h:43.7};
  box(a,21,248,z,b.x-21,10,h,1,'silver');box(a,b.x+b.w,248,z,260-b.x-b.w,10,h,1,'silver');
  box(a,b.x,248,z,b.w,10,b.z-z,1,'silver');box(a,b.x,248,b.z+b.h,b.w,10,z+h-b.z-b.h,1,'silver');
};
adapter('gateway',524,52);
box('gateway',34.1,132.4,537,212.8,127.6,30,5,'white');
face('gateway',130,260.4,544,21,15,7,'screen','oled');
face('gateway',134,260.6,552,13,1.3,.4,'blue','screen-mark');face('gateway',134,260.6,547,9,1.2,.4,'blue','screen-mark');
for(let i=0;i<5;i++) face('gateway',62+i*17,132.2,545,14,13,1,'hole','rear-port');
for(let i=0;i<2;i++) face('gateway',153+i*22,132.2,543,18,14,1,'hole','rear-port');
adapter('switch',457,62);
box('switch',35.3,86.2,466,210.4,173.8,43.7,5,'white');
for(let i=0;i<8;i++) {
  face('switch',54+i*18,260.4,479,16,14,1,'hole','rj45');
  face('switch',57+i*18,260.6,481,10,3,.3,'silver','contact');
}
for(let i=0;i<2;i++) face('switch',204+i*19,260.4,478,16,15,1,'hole','sfp');
for(let i=0;i<3;i++) face('switch',53+i*60,260.4,502,56,1.5,.6,'hole','vent');
face('switch',44,260.5,490,2,3,1,'blue','led');
box('patch',21,237,430,239,23,22,1,'black');
for(let i=0;i<12;i++) face('patch',30+i*18.3,260.3,433,15,14,.7,'hole','rj45');
// Front loops connect the switch plugs to the fixed patch panel.
for(let i=0;i<8;i++) {
  face('switch',58+i*18,261,481,9,9,1,'white','plug');
  face('patch',33+i*18.3,261,435,9,9,1,'white','plug');
  const x1=62.5+i*18,x2=37.5+i*18.3;
  const pts:V3[]=[];
  for(let j=0;j<=20;j++){const t=j/20;pts.push([x1+(x2-x1)*t,263+45*Math.sin(Math.PI*t),485+(439-485)*t-17*Math.sin(Math.PI*t)]);}
  line('cables',pts,'white','patch-cable');
}
box('comet',21,250,366,34,8,56,1,'black');box('comet',225,250,366,35,8,56,1,'black');
box('comet',55.5,170,374,170,90,40,4,'dark');
face('comet',83,260.4,380,114,27,2,'screen','lcd');face('comet',89,260.6,384,102,19,1,'screenblue','lcd-glass');
for(let i=0;i<3;i++) face('comet',64,260.4,381+i*9,12,5,.6,'hole','usb');
face('comet',207,260.4,387,10,12,3,'silver','button');
for(let i=0;i<4;i++){face('comet',64+i*31,169.8,379,19,7,1,'hole','rear-port');face('comet',69+i*31,169.8,390,8,3,1,'hole','rear-port');face('comet',66+i*31,169.8,399,13,5,1,'hole','rear-port');}
box('mini',21,85,248,239,175,5,1,'dark');
box('mini',82,144,253,117,110,6,15,'black','pedestal');
box('mini',77,133,259,127,127,50,18,'silver');
for(const x of [102,118]) face('mini',x,260.4,277,3,10,1.5,'hole','usb-c');
face('mini',174,260.5,280,4,4,2,'hole','audio');face('mini',161,260.5,281,1.5,1.5,.7,'white','led');
box('nas',51.5,2.5,20,178,257.5,178,5,'dark');
face('nas',54.5,260.4,23,172,172,4,'trim','nas-trim');face('nas',59,260.6,27,163,163,3,'black');
for(let i=0;i<4;i++) {
  const x=63+i*38;
  face('nas',x,260.8,55,35,130,3,'silver','bay');
  face('nas',x+2,261,58,31,125,2,'dark','tray');
  face('nas',x+3,261.2,59,29,28,2,'black','latch');face('nas',x+15,261.4,66,5,11,2,'hole','latch-key');
}
face('nas',65,261,35,11,5,2,'silver','power');
for(let i=0;i<5;i++) face('nas',85+i*6,261,37,1.4,2,.6,'white','led');
face('nas',155,261,34,12,2,1,'hole','sd');face('nas',177,261,33,7,3,1,'hole','usb-c');face('nas',199,261,32,12,5,.5,'blue','usb');

export function offset(mode:number,id:string,amount:number,selected:string|null):V3 {
  if(id==='panel'||(mode===1&&id==='patch'))return [0,0,0];
  const i=devices.findIndex(d=>d.id===id);
  if(mode===0) {
    if(id==='roof')return [0,0,amount*200];
    return i<0?[0,0,0]:[0,amount*(100+i*25),amount*(7-i)*55];
  }
  if(mode===1) return id===selected?[0,amount*270,amount*12]:[0,0,0];
  if(mode===2) return i<0?[0,0,0]:[amount*(i%2===0?240:-240),amount*70,amount*(3-i)*13];
  if(mode===3) return id==='roof'?[0,0,amount*180]:i<0?[0,0,0]:[0,amount*150,0];
  return i<0?[0,0,0]:[amount*(i<4?-180:220),amount*(i<4?200:60),amount*(i<4?20:-20)];
}
