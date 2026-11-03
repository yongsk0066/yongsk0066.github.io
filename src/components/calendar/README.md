# Blog calendar

Production runtime lives here: the Shadow DOM calendar, HTML-in-Canvas adapter,
Three.js paper renderer and adapted holocloth solver. CalendarSidebar.astro loads
these modules only on desktop (1440px+), on both list and article pages.
There is no iframe or runtime dependency on the research directory.

`yunjeon-calendar.js` is generated from `component-template.js` and the traced
assets/data by `python3 research/yunjeon-calendar/build.py`.
The research HTML uses these same runtime sources. After changing paper code:

```
node_modules/.bin/esbuild src/components/calendar/paper-preview.ts --bundle --format=iife --minify --legal-comments=inline --loader:.jpg=dataurl --outfile=research/yunjeon-calendar/paper-preview.bundle.js
python3 research/yunjeon-calendar/build.py
```

The sidebar uses a 360px rail opposite the TOC, physically pinned top vertices
without the visible mounting bar, current Asia/Seoul month, and the blog body
background. Narrow screens do not import the runtime. Hidden tabs pause it.

Licenses: adapted holocloth and PBD notices in vendor/. Paper001 textures from
ambientCG (CC0). Holiday snapshot: hyunbinseo/holidays-kr (MIT).
The circle artwork was supplied by the user (47584.jpg); no CC0 claim is made.

Sidebar quality: 720px texture at standard/Retina DPR and a fixed 2× WebGL buffer.
The renderer extends 160 CSS pixels beyond each stage edge, preserving the
paper projection with a camera view offset. Its transparent canvas passes pointer
events through; document raycasts capture actual paper grabs only. The invisible
native HTML-in-Canvas source is inert to avoid intercepting article interaction.

Click the main month number to animate from 360px in the sidebar to 672px centered
over the content (450ms). The fixed viewport top remains unchanged, including
while scrolling. Click the month again, click outside the physical sheet, or
press Escape to restore the sidebar. The same simulation stays alive throughout;
the CSS rendering surface stays 672px wide while its transform moves/scales it
about the projected pinned top edge. Texture and WebGL pixel density follow the
actual displayed width at 2× (720px texture collapsed, 1344px expanded). The last
completed texture paint is retained during native canvas resize, and WebGL buffer
resize is synchronously followed by a redraw. An expanded-only 12% drop shadow
fades with the same transition. Reduced-motion disables the transition.

Lighting: the blog lazily loads `lighting/preview.ts` and a WebGPU compute path
tracer after the existing preview is visible. It uses the same deformed geometry,
completed calendar Canvas, camera (including overflow view offset), and pointer
hit tests. A broad rectangular emitter, six-bounce transport, thin two-flux paper
reflection/transmission and a weak rough coating replace the Lambert lighting on
supported devices. The paper remains neutral; wall reflectance follows the blog
background. A ray-tested shadow catcher composites onto the DOM at a deliberately
limited opacity; the HTML page itself is not part of the traced scene. No second
CSS drop shadow is added.

Geometry, calendar paint, background, or camera changes invalidate accumulation.
Stationary frames accumulate up to 128 samples. Motion has visible Monte Carlo
noise; no temporal denoiser or historical-frame blend hides it. Only one GPU
submission is kept in flight. The last presented surface stays visible through
asynchronous initialization and resize. Unsupported WebGPU, initialization errors,
or device loss retain/restore the WebGL preview. Desktop visibility, reduced-motion
pause, month navigation, expansion, Escape, and dragging retain their existing UI.
A unilateral wall contact keeps the paper in front of the traced wall. Optical
coefficients are plausible defaults, not measurements of the physical calendar.
