/* Reference-specific, dependency-free custom element. All printed lettering is traced SVG. */
(() => {
const assets = __ASSETS__;
const holidayData=__HOLIDAYS__;
const holidayKey=(year,month,day)=>`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
const holidayFor=(year,month,day)=>holidayData.years[year]?.entries[holidayKey(year,month,day)]||null;
const escapeXML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const place=(name,x,y,w,h,label='')=>{const a=assets[name];return `<svg x="${x}" y="${y}" width="${w??a.w}" height="${h??a.h}" viewBox="0 0 ${a.w} ${a.h}" ${label?'role="img"':'aria-hidden="true"'}>${label?`<title>${label}</title>`:''}${a.body}</svg>`};
// The transparent text supplies real, selectable characters; paths supply the appearance.
const numericText=(n,cx,y,w,h,label=String(n))=>`<text class="numeric-text" data-number="${n}" aria-label="${label}" x="${cx-w/2}" y="${y+h*0.86}" font-family="Arial, sans-serif" font-size="${h*1.14}" textLength="${w}" lengthAdjust="spacingAndGlyphs">${n}</text>`;
const todayKey=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
// FNV-1a over the full date: stable across reloads and all rendering surfaces.
const todayRingIndex=(year,month,day)=>{
 let hash=2166136261;
 for(const char of holidayKey(year,month,day)){hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;}
 return hash%15;
};
const hoverColor='#e7edf2';
const selectionStyle='<style>.cell-hover{fill:transparent;pointer-events:all}.cell-hover[data-active]{fill:HOVER_COLOR}.mini-link{cursor:pointer}.mini-link:focus .mini-hover,.mini-link:hover .mini-hover{fill:HOVER_COLOR}.mini-hover{fill:transparent;pointer-events:all}@media print{.cell-hover,.mini-hover{fill:transparent!important}}path,use{pointer-events:none} .numeric-text{fill:transparent;stroke:none;cursor:text;pointer-events:all;user-select:text;-webkit-user-select:text} .numeric-text::selection{fill:transparent;background:rgba(100,160,230,.35)}</style>'.replaceAll('HOVER_COLOR',hoverColor);
// Both mini calendars use these exact same 17 glyph definitions.
const miniNames=[...Array.from({length:7},(_,i)=>`mini-weekday-${i}`),...Array.from({length:10},(_,i)=>`mini-digit-${i}`)];
function miniDefinitions(){return '<defs>'+miniNames.map(name=>{const a=assets[name];return `<symbol id="${name}" viewBox="0 0 ${a.w} ${a.h}">${a.body.replace(/fill="#[0-9a-f]+"/gi,'fill="currentColor"')}</symbol>`}).join('')+'</defs>';}
function miniGlyph(name,x,y,h,color){const a=assets[name],w=a.w/a.h*h;return `<use href="#${name}" x="${x}" y="${y}" width="${w}" height="${h}" color="${color}"/>`;}
function miniNumber(n,cx,y,h,color){
 const chars=String(n).split(''),widths=chars.map(c=>assets[`mini-digit-${c}`].w/assets[`mini-digit-${c}`].h*h);
 let x=cx-(widths.reduce((a,b)=>a+b,0)+(chars.length-1)*1.5)/2;
 const width=widths.reduce((a,b)=>a+b,0)+(chars.length-1)*1.5;
 return chars.map((c,i)=>{const markup=miniGlyph(`mini-digit-${c}`,x,y,h,color);x+=widths[i]+1.5;return markup}).join('')+numericText(n,cx,y,width,h);
}
function miniMonth(year,month,left){
 const {start,count}=monthInfo(year,month);
 let s=`<g data-mini-month="${month}" data-mini-year="${year}" class="mini-link" role="button" tabindex="${year>=1&&year<=9999?0:-1}" aria-label="${year}년 ${month}월로 이동" aria-disabled="${year<1||year>9999}"><title>${year}년 ${month}월</title><rect class="mini-hover" x="${left}" y="73" width="607" height="335" rx="30"/>`;
 s+=miniNumber(month,left+303,12,66,'#e93226');
 for(let c=0;c<7;c++){
   const name=`mini-weekday-${c}`,a=assets[name],h=42;
   s+=miniGlyph(name,left+59+c*81.5-a.w/a.h*h/2,92,h,c===0?'#e93226':'#191a17');
 }
 for(let d=1;d<=count;d++){
   const cell=start+d-1,c=cell%7,r=Math.floor(cell/7);
   const holiday=holidayFor(year,month,d),red=c===0||holiday;
   s+=`<g data-mini-day="${d}" data-holiday="${Boolean(holiday)}"><title>${year}년 ${month}월 ${d}일${holiday?' '+escapeXML(holiday.name):''}</title>${miniNumber(d,left+59+c*81.5,150+r*41,36,red?'#e93226':'#191a17')}</g>`;
 }
 return s+'</g>';
}
const mod=(n,d)=>((n%d)+d)%d;
const cycleIndex=year=>mod(year-4,60);
function monthInfo(year,month){
 const first=new Date(0);first.setUTCHours(0,0,0,0);first.setUTCFullYear(year,month-1,1);
 const last=new Date(first);last.setUTCMonth(first.getUTCMonth()+1,0);
 return {start:first.getUTCDay(),count:last.getUTCDate()};
}
function adjacent(year,month,offset){const serial=year*12+month-1+offset;return {year:Math.floor(serial/12),month:mod(serial,12)+1};}
function largeNumber(n,cx,y,height,color){
 const chars=String(n).split(''),gap=height*.06;
 const widths=chars.map(c=>assets['digit-'+c].w/assets['digit-'+c].h*height);
 const total=widths.reduce((a,b)=>a+b,0)+gap*(chars.length-1);
 const scale=Math.min(1,440/total);let x=cx-total*scale/2;
 return chars.map((c,i)=>{const a=assets['digit-'+c];const result=place('digit-'+c,x,y,widths[i]*scale,height*scale).replace(/fill="#[0-9a-f]+"/gi,`fill="${color}"`);x+=(widths[i]+gap)*scale;return result}).join('')+numericText(n,cx,y,total*scale,height*scale,`${n}월`);
}
function calendar(year,month){
 const {start,count}=monthInfo(year,month),occupiedRows=Math.ceil((start+count)/7),rows=5;
 const gridHeight=rows*354,memoY=610+gridHeight+25,totalHeight=memoY+274;
 const today=todayKey();
 const prev=adjacent(year,month,-1),next=adjacent(year,month,1);
 let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2148 ${totalHeight}" role="group" aria-labelledby="calendar-title" data-year="${year}" data-month="${month}" data-rows="${rows}" data-holiday-status="${holidayData.years[year]?'available':'unavailable'}"><title id="calendar-title">${year}년 ${month}월 윤전달력. 대한민국 공휴일 표시. 물때 정보 제외.</title><rect width="2148" height="${totalHeight}" fill="white"/>`;
 s+='<g fill="none" stroke="#292a26" stroke-width="3"><rect x="14" y="73" width="607" height="335" rx="30"/><rect x="1529" y="73" width="607" height="335" rx="30"/></g><path d="M260 73h120 M1772 73h120" stroke="white" stroke-width="9"/>';
 s+=`<metadata>${escapeXML(JSON.stringify({holidayYears:Object.keys(holidayData.years),checkedAt:holidayData.checkedAt,sources:holidayData.sources}))}</metadata>`;
 s+=selectionStyle+miniDefinitions()+miniMonth(prev.year,prev.month,14)+miniMonth(next.year,next.month,1529);
 s+=largeNumber(month,1073,0,330,'#e93226')+miniNumber(year,770,350,60,'#191a17')+place(`year-cycle-${cycleIndex(year)}`,1283,346,191,68,`${year}년 연간지`);
 s+=`<g fill="none" stroke="#292a26" stroke-width="3.5"><rect x="14" y="431" width="2121" height="165" rx="30"/><rect x="14" y="610" width="2121" height="${gridHeight}" rx="30"/></g>`;
 for(let i=1;i<7;i++){let x=14+i*303;s+=`<path d="M${x} 432v163 M${x} 611v${gridHeight-2}" stroke="#8c8c87" stroke-width="1.5"/>`;}
 for(let r=1;r<rows;r++)s+=`<path d="M14 ${610+r*354}h2121" stroke="#8c8c87" stroke-width="1.5"/>`;
 for(let i=0;i<7;i++)s+=place(`weekday-${i}`,30+i*303,442,271,145,['日 일요일','月 월요일','火 화요일','水 수요일','木 목요일','金 금요일','土 토요일'][i]);
 s+='<defs><clipPath id="calendar-grid-clip"><rect x="16" y="612" width="2117" height="1766" rx="28"/></clipPath></defs><g clip-path="url(#calendar-grid-clip)">';
 for(let row=0;row<5;row++)for(let column=0;column<7;column++)s+=`<rect class="cell-hover" data-cell="${row*7+column}" x="${15+column*303}" y="${611+row*354}" width="301" height="352"/>`;
 s+='</g>';
 for(let d=1;d<=count;d++){
   const cell=start+d-1,week=Math.floor(cell/7),r=Math.min(4,week),c=cell%7;
   const shared=week===5||(week===4&&d+7<=count),slot=week===5?1:0;
   const holiday=holidayFor(year,month,d);
   const color=(c===0||holiday)?'#e93226':c===6?'#46246d':'#191a17';
   let number=d===1?place('digit-1',14+c*303+(303-66)/2,649+r*354,66,163,`${month}월 ${d}일`):place(`day-${d}`,19+c*303,642+r*354,293,183,`${month}월 ${d}일`);
   if(d===7)number=place('digit-7',14+c*303+(303-134)/2,642+r*354,134,169,`${month}월 ${d}일`);
   const isToday=holidayKey(year,month,d)===today;
   const contents=`${number.replace(/fill="#[0-9a-f]+"/gi,`fill="${color}"`)}${numericText(d,14+c*303+151.5,649+r*354,d===1?60:d<10?120:230,163,`${year}년 ${month}월 ${d}일${holiday?' '+escapeXML(holiday.name):''}`)}${holiday?place('holiday-'+holiday.displayName,24+c*303,840+r*354,283,76,holiday.name):''}${isToday?'<g data-today-ring="'+d+'" data-ring-index="'+todayRingIndex(year,month,d)+'" pointer-events="none">'+place('today-ring-'+todayRingIndex(year,month,d),14+c*303+41.5,628+r*354,220,205,'오늘')+'</g>':''}`;
   const x=14+c*303,y=610+r*354;
   const transform=shared?`translate(${x+(slot?143:4)} ${y+(slot?170:4)}) scale(.52) translate(${-x} ${-y})`:'';
   s+=`<g data-day="${d}"${isToday?' aria-current="date"':''} data-holiday="${Boolean(holiday)}" data-column="${c}" data-row="${r}" data-week="${week}"${shared?` data-shared-slot="${slot}"`:''}><g${transform?` transform="${transform}"`:''}>${contents}</g></g>`;
 }
 for(let cell=start+count;cell<Math.min(rows,occupiedRows)*7;cell++){
   const d=cell-start-count+1,c=cell%7,r=Math.floor(cell/7),a=assets[`digit-${d}`],scale=.68;
   const w=a.w*scale,h=a.h*scale,x=14+c*303+(303-w)/2,y=610+r*354+52;
   const followingHoliday=holidayFor(next.year,next.month,d);
   const outline=place(`digit-${d}`,x,y,w,h,`${next.month}월 ${d}일`).replace(/fill="#[0-9a-f]+"/gi,'fill="none"').replace(/stroke="none"/g,`stroke="${followingHoliday?'#e93226':'#777772'}" stroke-width="28" stroke-linejoin="round"`);
   s+=`<g data-following-day="${d}">${outline}${numericText(d,x+w/2,y,w,h,`${next.year}년 ${next.month}월 ${d}일`)}</g>`;
 }
 s+=`<rect x="14" y="${memoY}" width="2121" height="250" rx="20" fill="none" stroke="#292a26" stroke-width="3"/>`;
 for(let i=0;i<31;i++)s+=`<path d="M${80+i*66.3} ${memoY+1}v215" stroke="#8c8c87" stroke-width="1.2"/>`;
 s+=`<path d="M80 ${memoY+216}h2053" stroke="#8c8c87" stroke-width="1.2"/>`;
 return s+'</svg>';
}
function validate(year,month){
 if(!Number.isInteger(year)||year<1||year>9999||!Number.isInteger(month)||month<1||month>12)throw new RangeError('연도는 1–9999, 월은 1–12의 정수로 입력하세요.');
}
class YunjeonCalendar extends HTMLElement {
 static get observedAttributes(){return ['year','month'];}
 constructor(){super();this.attachShadow({mode:'open'});this._batch=false;
  this.shadowRoot.addEventListener('pointermove',e=>{const pt=this.surfacePoint(e);this.highlight(this.shadowRoot,pt?this.hitTest(...pt):null);});
  this.shadowRoot.addEventListener('pointerleave',()=>this.highlight(this.shadowRoot,null));
  this.shadowRoot.addEventListener('click',e=>{const pt=this.surfacePoint(e);if(pt)this.activate(this.hitTest(...pt));});
  this.shadowRoot.addEventListener('keydown',e=>{const mini=e.target.closest?.('[data-mini-month]');if(mini&&(e.key==='Enter'||e.key===' ')){e.preventDefault();this.activate({year:+mini.dataset.miniYear,month:+mini.dataset.miniMonth});}});
 }
 surfacePoint(e){const svg=this.shadowRoot.querySelector('svg'),r=svg?.getBoundingClientRect();return r?.width?[2148*(e.clientX-r.left)/r.width,2679*(e.clientY-r.top)/r.height]:null;}
 hitTest(x,y){
  if(y>=73&&y<=408){if(x>=14&&x<=621)return adjacent(this.year,this.month,-1);if(x>=1529&&x<=2136)return adjacent(this.year,this.month,1);}
  if(x>=14&&x<2135&&y>=610&&y<2380)return {cell:Math.floor((y-610)/354)*7+Math.floor((x-14)/303)};
  return null;
 }
 highlight(root,hit){const current=root.querySelector('.cell-hover[data-active]');const next=hit?.cell!==undefined?root.querySelector(`[data-cell="${hit.cell}"]`):null;if(current!==next){current?.removeAttribute('data-active');next?.setAttribute('data-active','');}}
 activate(hit){if(hit?.year>=1&&hit.year<=9999)this.setDate(hit.year,hit.month);}
 get hoverColor(){return hoverColor;}
 get year(){return this.hasAttribute('year')?Number(this.getAttribute('year')):2026;}
 set year(value){validate(Number(value),this.month);this.setAttribute('year',String(Number(value)));}
 get month(){return this.hasAttribute('month')?Number(this.getAttribute('month')):11;}
 set month(value){validate(this.year,Number(value));this.setAttribute('month',String(Number(value)));}
 get holidayStatus(){return {available:Boolean(holidayData.years[this.year]),supportedYears:Object.keys(holidayData.years).map(Number),checkedAt:holidayData.checkedAt};}
 get holidays(){return Object.entries(holidayData.years[this.year]?.entries||{}).filter(([date])=>Number(date.slice(5,7))===this.month).map(([date,item])=>({date,...item,sourceIds:[...item.sourceIds]}));}
 get cycleIndex(){return cycleIndex(this.year);}
 setDate(year,month){validate(Number(year),Number(month));this._batch=true;this.setAttribute('year',String(Number(year)));this.setAttribute('month',String(Number(month)));this._batch=false;this.render();}
 connectedCallback(){this.render();this._today=todayKey();clearInterval(this._dayTimer);this._dayTimer=setInterval(()=>{const now=todayKey();if(now!==this._today){this._today=now;this.render();}},30000);}
 disconnectedCallback(){clearInterval(this._dayTimer);}
 attributeChangedCallback(){if(this.isConnected&&!this._batch)this.render();}
 render(){
  let content;try{content=this.toSVG();}catch(error){content='<p role="alert">연도는 1–9999, 월은 1–12의 정수로 입력하세요.</p>';}
  this.shadowRoot.innerHTML=`<style>:host{all:initial;display:block;contain:content;color-scheme:light}*{box-sizing:border-box}svg{display:block;width:100%;height:auto} .paper{background:#fff} </style><div class="paper">${content}</div>`;
  if(!this.shadowRoot.querySelector('[role="alert"]'))this.dispatchEvent(new CustomEvent('datechange',{detail:{year:this.year,month:this.month},bubbles:true,composed:true}));
 }
 toSVG(){validate(this.year,this.month);return calendar(this.year,this.month);}
 glyphSVG(name){const a=assets[name];if(!a)throw new Error('Unknown glyph');return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${a.w} ${a.h}">${selectionStyle}${a.body}${/^((mini-)?digit)-/.test(name)?numericText(name.split("-").at(-1),a.w/2,0,a.w,a.h):""}</svg>`;}
 get glyphNames(){return Object.keys(assets);}
}
if(!customElements.get('yunjeon-calendar'))customElements.define('yunjeon-calendar',YunjeonCalendar);
})();
