import * as A from './vendor/anatomy/iso-kit';
import type { Part } from './model';

// Recreated from the user's display reference. The IP/time are sample screen
// content from that image, not a live device reading.
export function cometScreen(p: Part, P: A.Projection, label: string): string {
  const ports=Array.from({length:4},(_,i)=>{
    const x=48+i*158;
    return `<g transform="translate(${x} 91)"><rect width="151" height="57" rx="5" fill="#171e23" fill-opacity=".88" stroke="#3a4246" stroke-width="1.5"/>
      <g transform="translate(76 21)" fill="none" stroke="#6485ff" stroke-width="2"><path d="M-8 8a12 12 0 1 1 16 0M-5 5a7 7 0 1 1 10 0M0 0v12"/><circle r="2" fill="#6485ff"/></g>
      <text x="76" y="49" text-anchor="middle" fill="#f2f3f4" font-size="16">Port${i+1}</text>
      ${i===0?'<circle cx="19" cy="15" r="6.5" fill="#45c327"/><path d="m16 15 2 2 4-4" fill="none" stroke="#123b18" stroke-width="2"/>':''}</g>`;
  }).join('');
  return `<g data-comet-screen aria-label="${label}" transform="${A.sideMatrix([p.p[0],p.p[1]],p.p[2]+p.size[2],P,'left')}">
    <svg class="rack-comet-screen" width="${p.size[0]}" height="${p.size[2]}" viewBox="0 0 720 160" preserveAspectRatio="none" overflow="hidden" font-family="Arial, sans-serif">
      <rect width="720" height="160" rx="8" fill="#03090e"/>
      <ellipse cx="361" cy="244" rx="298" ry="216" fill="#071c29" stroke="#064251" stroke-width="3"/>
      <path d="M112 160Q213 58 361 30M245 160Q300 74 361 30M432 160Q408 75 361 30M588 160Q509 67 361 30M151 108Q363 50 573 108" fill="none" stroke="#14313a" stroke-width="1.5"/>
      <text x="360" y="65" text-anchor="middle" fill="#f5f6f7" font-size="38" font-weight="600">192.0.2.10</text>
      <path d="M646 24h-8a5 5 0 0 1-1-10 6 6 0 0 1 11 2 4 4 0 0 1 1 8" fill="none" stroke="#d4d8dc" stroke-width="2"/><circle cx="645" cy="25" r="2.5" fill="#6485ff"/>
      <text x="655" y="25" fill="#ebedf0" font-size="12">9:41</text>${ports}
    </svg></g>`;
}
