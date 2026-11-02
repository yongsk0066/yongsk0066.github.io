import './yunjeon-calendar.js';
import { createCalendarCanvas } from './canvas-preview.js';
import { createPaperPreview } from './paper-preview';

export function mountCalendar(host: HTMLElement) {
  // A scoped DOM surface keeps the native HTML-in-Canvas source in the viewport.
  host.innerHTML = `<yunjeon-calendar style="display:none!important"></yunjeon-calendar>
    <div data-source inert aria-hidden="true" style="position:fixed;left:0;top:0;width:672px;opacity:0;pointer-events:none;z-index:-1">
      <button hidden disabled></button><span role="status" hidden></span>
      <canvas content="drawable" style="display:block;width:100%"></canvas>
    </div>
    <div data-paper style="width:672px;margin-left:-156px;transform:scale(0.5357142857142857);transform-origin:50% 0;will-change:transform"><div hidden><button data-paper-reset></button><button data-paper-poke></button><button data-paper-pause></button><span role="status"></span></div><div class="paper-stage" style="width:100%"></div></div>`;
  const calendar = host.querySelector('yunjeon-calendar') as any;
  const date = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Seoul', year:'numeric', month:'2-digit'}).format(new Date()).split('-');
  calendar.setDate(+date[0], +date[1]);
  let background = getComputedStyle(document.body).backgroundColor;
  const originalSVG = calendar.toSVG.bind(calendar);
  calendar.toSVG = () => originalSVG().replaceAll('fill="white"', `fill="${background}"`).replaceAll('stroke="white"', `stroke="${background}"`);
  const source = host.querySelector<HTMLElement>('[data-source]')!;
  const canvas = source.querySelector('canvas')!;
  let expanded = false;
  const toggleButton = document.createElement('button');
  toggleButton.type = 'button';
  toggleButton.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip-path:inset(50%)';
  host.append(toggleButton);
  function setExpanded(next: boolean) {
    expanded = next;
    host.dataset.expanded = String(next);
    toggleButton.setAttribute('aria-expanded', String(next));
    toggleButton.textContent = next ? '달력 축소 (Esc)' : '달력 확대';
    updateTransform();
  }
  const surface = createCalendarCanvas(calendar, source, {pixelRatio:720/672, onMonthClick:()=>setExpanded(!expanded)});
  toggleButton.textContent = '달력 확대';
  toggleButton.setAttribute('aria-expanded', 'false');
  toggleButton.addEventListener('click', ()=>setExpanded(!expanded));
  canvas.addEventListener('paperoutside', ()=>{if(expanded)setExpanded(false);});
  document.addEventListener('keydown', e=>{if(e.key==='Escape' && expanded){e.preventDefault();setExpanded(false);}});
  const paper = createPaperPreview(host.querySelector<HTMLElement>('[data-paper]')!, canvas, {rail:false, compact:true, overflow:160, pixelRatio:720/672});
  const sheet = host.querySelector<HTMLElement>('[data-paper]')!;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const collapsedScale = 360 / 672;
  let qualityFrame = 0;
  function followResolution() {
    cancelAnimationFrame(qualityFrame);
    const end = performance.now()+550;
    const update = () => {
      const width=Math.round(sheet.getBoundingClientRect().width);
      // Two texture pixels per displayed CSS pixel, at every intermediate scale.
      surface.setPixelRatio(2*width/672);
      paper.setPixelRatio(2*width/672);
      if(performance.now()<end)qualityFrame=requestAnimationFrame(update);
    };
    qualityFrame=requestAnimationFrame(update);
  }
  function updateTransform() {
    const pin = paper.getTopOffset();
    sheet.style.transformOrigin = `50% ${pin}px`;
    sheet.style.marginTop = `${-(1-collapsedScale)*pin}px`;
    sheet.style.transition = reducedMotion.matches ? 'none' : 'transform 450ms cubic-bezier(.22,1,.36,1), filter 450ms cubic-bezier(.22,1,.36,1)';
    const shift = expanded ? innerWidth/2 - (host.getBoundingClientRect().left+180) : 0;
    sheet.style.transform = `translateX(${shift}px) scale(${expanded ? 1 : collapsedScale})`;
    sheet.style.filter = expanded ? 'drop-shadow(0 8px 12px rgb(0 0 0 / 0.12))' : 'drop-shadow(0 0 0 rgb(0 0 0 / 0))';
    followResolution();
  }
  window.addEventListener('resize', updateTransform);
  let visible = true, started = false;
  canvas.addEventListener('calendarpaint', () => { if (visible && !started) { started = true; paper.show(); updateTransform(); } });
  surface.refresh();
  return {
    paper,
    setVisible(next: boolean) {
      visible = next;
      source.hidden = !next;
      if (next) {
        background = getComputedStyle(document.body).backgroundColor;
        surface.refresh();
        if (canvas.dataset.mode) {started = true; paper.show();}
      } else {if(expanded)setExpanded(false);paper.hide();}
    },
  };
}
