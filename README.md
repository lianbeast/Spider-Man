# BRAND NEW DAY

A scroll film. One page, one canvas, no sections — a 2200vh track with a single
sticky stage, and scrolling flies a camera through six acts. The argument of
the build: better transitions between sections cannot substitute for not
having sections.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production bundle in dist/
```

## The one rule

Every value in the scene is a pure function of one scalar `p` (0→1, the scroll
position). Scroll writes `p` into a plain mutable object once per frame
(`src/film/state.js`); every `useFrame` reads it. No state, no springs, no
lerping toward a target. React never re-renders from scroll. Scrubbing
backwards resolves to exactly the frame scrubbing forwards produced (verified
frame-for-frame; only the wall-clock film grain differs, by design).

## Map

- `src/film/state.js` — the mutable `film` object, the rAF driver, act gates,
  DOM overlay updater, and the dev-only overlap proof (`window.__BND`,
  console.table at startup: at every act boundary at least two gates are
  non-zero — overlaps of 0.06–0.14 of the act axis, no cuts).
- `src/film/spine.js` — camera keyframes on `sp = clamp01(p / 0.82)` (legs from
  rest through the corridor are LINEAR — smoothstep would stop the camera dead
  on every waypoint), and the ONE strand table `{ at, span, side, lead,
  radius, lift }` that drives both the web and the camera swing. Anchors are
  derived from the spine (`spine(at) + (side·radius, lift, −lead)`), spans are
  solved so mid-swing lands where the camera passes under the anchor.
- `src/film/plate.js` — the portrait plate, drawn procedurally; 40,000 beads
  rejection-sampled from its alpha, suit hue remapped to the nearer of scarlet
  (0.985) / cobalt (0.625), shortest arc, 85% pull, own lightness kept,
  S < 0.12 skipped (the eye lenses stay the only near-white), form-normal
  shade baked into `instanceColor` once.
- `src/film/Figure.jsx` — instanced bead cloud; scatter/ember-sea/dawn all
  happen GPU-side off instanced attributes + uniforms. Idle float and cursor
  tilt rotate about the figure's own centre with the compensating translation.
- `src/film/Lattice.jsx` — the cage. Wireframe output is non-indexed vertex
  pairs: both vertices share one random + an end parameter, so ONE scalar
  weaves and un-weaves every segment on its own staggered threshold.
- `src/film/Room.jsx`, `Horizon.jsx` — three nested wireframe cylinders
  (r 9 / 13.95 / 19.8, drift 0.055 / −0.03 / 0.014, cobalt 0.22, additive,
  depthWrite off), no ground plane — fog is the floor, one thin horizon bar.
- `src/film/Strands.jsx` — fat lines (`LineSegments2` / `LineMaterial`,
  linewidth 2.4 screen-space, resolution set). Positions and colours live in
  one interleaved stride-6 buffer each, written in place every frame, never
  reallocated. FIRE / TAUT / RELEASE / FADE on local t; per-strand fade lives
  in the vertex colours under ADDITIVE blending (a colour fading to zero under
  normal blending is a black line, not an absent one). Scarlet appears only as
  an impulse at the firing edge, MIXED not added.
- `src/film/CameraRig.jsx` — swing added to POSITION ONLY (never the look
  target), bank by rotating the up vector about the view axis (Rodrigues),
  `rotation.order = 'YXZ'`, fog far closes for the wipe.
- `src/film/Post.jsx` — bloom (0.55 / 0.45 / 1.15, smoothWidth 0.35) →
  vignette (darkness 1.0 — not above; offset 1.3) → tone map (OutputPass) →
  grain in display space.
- `src/film/Overlays.jsx` — copy is almost none: the title and two phrases,
  repeated. Per-letter spans on the ACT axis, will-change + backface-visibility,
  only transform / filter / opacity touched; openings leave back-to-front
  blurring, closings arrive front-to-back resolving. Only the button
  re-enables pointer events.

## Floors

`prefers-reduced-motion` keeps the strands and zeroes the swing (and every
other ambient motion). DPR clamped (1.0 mobile / 1.5 desktop). Fewer segments
per strand on mobile, never fewer strands. No horizontal overflow at 390px.
