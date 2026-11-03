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
The renderer extends 260 CSS pixels beyond each stage edge, preserving the
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
resize is synchronously followed by a redraw. The physical shadow replaces the
old CSS drop shadow. Reduced-motion disables the transition.

Lighting: the blog lazily loads `lighting/preview.ts` and a WebGPU compute path
tracer after the existing preview is visible. It uses the same deformed geometry,
completed calendar Canvas, camera (including overflow view offset), and pointer
hit tests. A broad rectangular emitter, six-bounce transport, thin two-flux paper
reflection/transmission and a weak rough coating replace the Lambert lighting on
supported devices. The paper remains neutral; wall reflectance follows the blog
background. A ray-tested shadow catcher composites onto the DOM at a deliberately
limited opacity; the HTML page itself is not part of the traced scene. No second
CSS drop shadow is added.

Calendar paint, background, or camera changes invalidate illumination history.
Deformation instead reprojects history using the same BVH triangle and barycentric
coordinates in the previous rendered geometry. Depth, normal, UV, front/back side,
and sampled light visibility reject mismatches. Moving history is limited to 12
frames; stationary history converges up to 128. This is a bounded custom temporal
filter, not NRD/FFX, and indirect occlusion changes can still leave brief residual
noise or lag. The unoccluded direct diffuse term is integrated analytically over
the rectangle, clipped against both shading and geometric hemispheres. Four
stratified rays estimate only its occlusion correction and weak coating term;
six-bounce indirect transport remains stochastic. Only the albedo-demodulated
residual is temporally blended: current direct light and printed detail are never
reprojected. The geometry-guided spatial filter remains after reconstruction.
Lighting and its history run at half the output dimensions; the final full-size
pass interpolates valid surface UVs and samples the original ink texture directly.
It never upscales a low-resolution image of the printed calendar. Silhouette and
UV-discontinuity reconstruction are approximations, especially at grazing folds.
Only one GPU
submission is kept in flight. The last presented surface stays visible through
asynchronous initialization and resize. Unsupported WebGPU, initialization errors,
or device loss retain/restore the WebGL preview. Desktop visibility, reduced-motion
pause, month navigation, expansion, Escape, and dragging retain their existing UI.
A unilateral wall contact keeps the paper in front of the traced wall. Optical
coefficients are plausible defaults, not measurements of the physical calendar.

Lighting calibration uses a distant, neutral rectangular softbox with fixed
radiance for every pose. Exact sRGB decoding/encoding and linear exposure replace
the per-channel ACES curve so printed colors stay close to the source. Vertex
normals are barycentrically interpolated for smooth shading; geometric normals
still determine ray offsets and reflection/transmission sides. This is a smooth
shading approximation, not the original geometric-normal energy audit. The wall
is 0.04 scene units behind the flat sheet and collision clearance is derived from
that same setting. No flat-pose detection, exposure switch, or replacement image
is used. One paper path per pixel is retained for interaction cost; wall visibility
uses 16 fixed area-light samples, followed by the spatial filter. Conservative
projected BVH bounds skip shadow work in empty canvas padding. This removes
random shadow grain, but finite quadrature can still produce subtle banding.
The temporal renderer requests five storage textures per shader stage; unsupported
devices keep the existing WebGL fallback. Sideways grab targets now span ±3.8
scene units (previously ±2.6), with a wider vertical range as well.

Background on shading normals and albedo-demodulated reconstruction:
- https://pbr-book.org/3ed-2018/Materials/BSDFs
- https://research.nvidia.com/sites/default/files/pubs/2017-07_Spatiotemporal-Variance-Guided-Filtering%3A/svgf_preprint.pdf
(The bounded temporal residual filter is not a full SVGF implementation.)
- https://eheitzresearch.wordpress.com/415-2/ (polygonal cosine integration)
