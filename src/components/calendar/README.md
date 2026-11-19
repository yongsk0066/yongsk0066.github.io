# Blog calendar

Production runtime lives here: the Shadow DOM calendar, HTML-in-Canvas adapter,
Three.js paper renderer and adapted holocloth solver. CalendarSidebar.astro loads
these modules only on desktop (1440px+), on both list and article pages.
There is no iframe or runtime dependency on the research directory.

`yunjeon-calendar.js` is generated from `component-template.js` and the traced
assets/data by `python3 research/yunjeon-calendar/build.py`.
The research HTML uses these same runtime sources. After changing paper code:

```
node_modules/.bin/esbuild src/components/calendar/paper-preview.ts --bundle --format=iife --minify --legal-comments=inline --loader:.jpg=dataurl --loader:.wgsl=text --outfile=research/yunjeon-calendar/paper-preview.bundle.js
python3 research/yunjeon-calendar/build.py
```

The sidebar uses a 360px rail opposite the TOC, physically pinned top vertices
without the visible mounting bar, current Asia/Seoul month, and the blog body
background. Narrow screens do not import the runtime. Hidden tabs pause it.

Licenses: adapted holocloth and PBD notices in vendor/. Paper001 textures from
ambientCG (CC0). Holiday snapshot: hyunbinseo/holidays-kr (MIT).
The circle artwork was supplied by the user (47584.jpg); no CC0 claim is made.

Sidebar quality: 720px texture at standard/Retina DPR and a fixed 2× WebGL buffer.
The renderer extends 320 CSS pixels beyond each stage edge, preserving the
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
old CSS drop shadow. A zoom reserves its final lighting target capacity up front.
The renderer traces only the current size, then releases spare capacity when the
calendar returns to the rail. Reduced-motion disables the transition.

The desktop mount runs the fixed-step solver in a dedicated module Worker.
Transferable checkpoints carry positions, previous positions, crease state and
simulation time. Input, picking, display and GPU submission stay on the main
thread. If the Worker fails, simulation resumes from the last displayed pose.
The WebGL fallback can sleep after an uncreased, flat sheet settles.

The solver advances at 120 Hz and resolves wall contact after each substep.
One update can run four substeps and the clock can hold eight. The same
alternating triangle diagonals drive bending, pointer picks and lighting.
For an uncreased, front-facing sheet lying exactly in its initial plane, bending
has zero residual. The solver checks triangle orientation between stretch
passes and continues to advance the material clock. A grab starts at the
picked surface height and reaches its full lift over 7% of the sheet width.

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
Deformation reprojects the two lighting signals using the same BVH triangle and
barycentric coordinates in the previous rendered geometry. Depth, normal, UV and
front/back side reject mismatches. Direct occlusion/coating and indirect light
have separate RGB histories, sample ages and first/second luminance moments.
Motion, variance, visibility changes and significant illumination changes control
reuse; moving caps reach 25 frames for direct correction and 49 for GI, while
stationary history reaches 128. Individual Monte Carlo outliers do not invalidate
otherwise stationary history. Two frame sets alternate on each submission. A capacity-only resize copies the
last valid history once. The browser uploads the bounding boxes and shared mesh
vertices for the most recent pose. A compute pass expands them in the fixed BVH
triangle order before tracing. CPU expansion is available if that pipeline fails.

Each 32-byte BVH node contains a child or packed leaf range and a continuation
index. Bounds refits preserve those links. Rays traverse the same primitives in
the same order at shared edges and overlapping folds. Shadow segments can return
at the first blocker. Camera and bounce rays keep the closest surface.

During stationary refinement, the existing binary16 surface texture holds the
visible triangle index and side. A camera ray intersects that triangle again to
recover full-precision shading inputs. Zero indicates a background ray, and tag
2048 requests a fresh traversal for indices beyond the exact stored range. The
wall reuses its deterministic emitter visibility from the preceding frame.
Mesh uploads, camera changes, calendar paint, background changes and edits to
the emitter or wall all require fresh visibility.

The primary diffuse term uses the rectangular emitter's cosine integral. The
smooth unclipped vector irradiance is evaluated per vertex and interpolated over
the small triangles; fragments crossing the emitter horizon use clipped integration.
This is a spatial interpolation approximation, not a flat-pose special case.
Adaptive direct correction uses 4/8/16 stratified rays; noisy, newly exposed and
grazing surfaces receive 1/2/3 indirect paths with the original six-bounce transport.
Only demodulated occlusion and GI are temporally blended, never the current analytic
base or printed ink. Shadow correction gets a tight geometry/luminance-guided filter;
GI gets variance-guided à-trous passes at strides 1, 2 and 4. Only the first pass
writes direct light. The two wider passes alternate between two indirect-light textures. Stable regions skip
wide passes. This is a custom bounded reconstruction, not NRD/FFX or full SVGF.

Lighting buffers stay at half the output dimensions. The final pass rasterizes the
actual deformed triangles at full output resolution with a depth attachment and
perspective-correct UVs, normals and positions. Full-resolution ink sampling and
joint depth/normal/UV/side-guided light reconstruction preserve thin folds and print.
There is no low-resolution UV/silhouette interpolation. Low-resolution lighting
can still miss very narrow occlusion details, and temporal filtering can briefly lag
changing indirect occlusion; neither exact transport nor zero noise is guaranteed.
The render loop allows up to three unfinished lighting submissions and tracks one queue completion at a time. It stops when the pose settles and lighting reaches 128 samples. Unsupported WebGPU, initialization
errors or device loss restore the WebGL preview. Month navigation, expansion,
Escape, dragging, mobile hide and fixed top attachment retain their existing UI.
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
is used. Wall visibility starts with 16 fixed area-light samples and refines only
partial-visibility pixels with 64 samples, followed by the tight spatial filter. Conservative
projected BVH bounds skip shadow work in empty canvas padding. This removes
random shadow grain, but finite quadrature can still produce subtle banding.
The temporal renderer requests five storage textures per shader stage; unsupported
devices keep the existing WebGL fallback. Sideways grab targets now span ±3.8
scene units (previously ±2.6), with a wider vertical range as well.

Background on shading normals and albedo-demodulated reconstruction:
- https://pbr-book.org/3ed-2018/Materials/BSDFs
- https://research.nvidia.com/sites/default/files/pubs/2017-07_Spatiotemporal-Variance-Guided-Filtering%3A/svgf_preprint.pdf
(The custom variance-guided reconstruction is not a full SVGF implementation.)
- https://eheitzresearch.wordpress.com/415-2/ (polygonal cosine integration)
