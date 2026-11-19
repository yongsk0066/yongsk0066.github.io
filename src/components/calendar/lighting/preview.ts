import { Color, type PlaneGeometry, type PerspectiveCamera } from 'three';
import { DynamicBVH } from './bvh';
import { PaperTracer } from './renderer';

export async function createPaperLighting(
  stage: HTMLElement, fallback: HTMLCanvasElement, geometry: PlaneGeometry,
  ink: HTMLCanvasElement, camera: PerspectiveCamera, invalidate: () => void,
) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.dataset.paperLighting = 'path-traced';
  const bvh = new DynamicBVH(geometry);
  const tracer = await PaperTracer.create(canvas, bvh, ink);
  const background = new Color();
  let active = false, failed = false, visible = true;
  let shapeDirty = false, inkDirty = true, sizeDirty = true;
  let submitted = 0, completed = 0, waiting = false;
  const maxInFlight = 3;

  function fail() {
    if (failed) return;
    failed = true;
    active = false;
    fallback.style.opacity = '1';
    canvas.remove();
    stage.dataset.lighting = 'fallback';
    tracer.dispose();
    invalidate();
  }

  function needsFrame() {
    return !failed && visible && submitted - completed < maxInFlight &&
      (shapeDirty || inkDirty || sizeDirty || tracer.samples < 128);
  }

  function trackCompletion() {
    if (waiting || completed === submitted || failed) return;
    waiting = true;
    const checkpoint = submitted;
    void tracer.device.queue.onSubmittedWorkDone().then(() => {
      waiting = false;
      completed = checkpoint;
      if (failed) return;
      if (!active) {
        active = true;
        canvas.style.opacity = '1';
        fallback.style.opacity = '0';
        stage.dataset.lighting = 'path-traced';
      }
      trackCompletion();
      if (needsFrame()) invalidate();
    }).catch(fail);
  }

  tracer.device.addEventListener('uncapturederror', fail);
  void tracer.device.lost.then(() => { if (!tracer.disposed) fail(); });
  stage.append(canvas);
  canvas.style.opacity = '0';

  return {
    draw(next: PlaneGeometry, changed: boolean) {
      if (failed || !visible) return;
      if (next !== geometry) { fail(); return; }
      shapeDirty ||= changed;
      if (!needsFrame()) return;
      try {
        if (sizeDirty) {
          canvas.style.cssText = fallback.style.cssText;
          canvas.style.pointerEvents = 'none';
          canvas.style.opacity = active ? '1' : '0';
          tracer.setCamera(camera, fallback.width, fallback.height);
          sizeDirty = false;
        }
        if (inkDirty) {
          tracer.setInk(ink);
          background.setStyle(getComputedStyle(document.body).backgroundColor);
          tracer.setBackground(background);
          inkDirty = false;
        }
        if (shapeDirty) {
          // The mesh already contains the latest normals, even if several poses were coalesced.
          bvh.refit(true);
          tracer.upload(bvh);
          shapeDirty = false;
        }
        if (tracer.samples >= 128) return;
        tracer.render();
        submitted++;
        trackCompletion();
      } catch { fail(); }
    },
    paint() { inkDirty = true; },
    resize() { sizeDirty = true; },
    setVisible(value: boolean) { visible = value; canvas.hidden = !value; },
    get needsFrame() { return needsFrame(); },
    get wallMinZ() { return tracer.values[13] + .012; },
    get active() { return active; },
    get state() { return {active, failed, samples:tracer.samples, epoch:tracer.epoch, width:tracer.width, height:tracer.height}; },
    dispose: fail,
  };
}
