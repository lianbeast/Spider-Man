# BRAND NEW DAY

A high-performance "scroll film" experience. One page, one canvas, no sections—featuring a 2200vh track with a single sticky stage where scrolling drives a camera through six narrative acts.

## 🚀 Build & Run

### Installation
```bash
npm install
```

### Development
```bash
npm run dev        # Starts Vite dev server (usually http://localhost:5173)
```

### Production
```bash
npm run build      # Generates production bundle in dist/
npm run preview    # Previews the production build locally
```

### Testing
```bash
npm test           # node --test: math, gates, spine regression tests
```
- Pure-function tests cover `math.js` (smoothstep/gateWin/HSL), `state.js` (gate overlap proof, no-NaN, purity), and `spine.js` (continuity, strand invariants).
- Visual verification still required for rendering. Use `window.__BND` in the browser console for startup overlap proofs and internal state debugging.

## 🏗 Architecture

The project is a React application using `@react-three/fiber` and `three.js`.

### The Core Principle: Scalar-Driven State
The entire scene is a pure function of a single scalar `p` (0 → 1), representing the scroll position.
- **State Management**: Scroll writes `p` into a mutable object once per frame in `src/film/state.js`.
- **Performance**: `useFrame` reads this value directly. React does **not** re-render on scroll, ensuring 60fps regardless of scene complexity.
- **Determinism**: Scrubbing backwards produces the exact same frames as scrubbing forwards.

### Data Flow
`Scroll Event` → `src/film/state.js` (updates `p`) → `useFrame` (reads `p`) → `GPU/Three.js` (updates transforms/uniforms).

### Key Components (`src/film/`)
- `state.js`: The mutable `film` object, rAF driver, and act gates.
- `spine.js`: Camera keyframes and the strand table driving the web/camera swing.
- `plate.js` / `Figure.jsx`: Procedural portrait plate and instanced bead cloud for the central figure.
- `Lattice.jsx`: The wireframe cage with staggered weaving thresholds.
- `Room.jsx` / `Horizon.jsx`: Nested wireframe cylinders and fog-based floor.
- `Strands.jsx`: High-performance fat lines using `LineSegments2`. Buffer-based updates to avoid re-allocation.
- `CameraRig.jsx`: Handles camera swing (position only) and banking (Rodrigues rotation).
- `Post.jsx`: Post-processing pipeline: Bloom → Vignette → Tone Mapping → Grain.
- `Overlays.jsx`: DOM overlays for text and UI, driven by the act axis.

## 📂 Key File Locations
- `src/App.jsx`: Root component.
- `src/main.jsx`: React entry point.
- `src/film/`: The core "film" engine and 3D components.
- `src/styles.css`: Global styles and scroll-track height.

## 🛠 Coding Conventions

### State & Math
- **No Springs/Lerping**: Avoid `react-spring` or manual lerping toward targets for scroll-driven elements. Use direct functions of `p`.
- **Mutable State**: Use the mutable `film` object in `state.js` for high-frequency updates to bypass React's reconciliation.
- **GPU-First**: Offload ambient motion (float, tilt, embers) to GPU attributes and uniforms.

### Performance
- **Buffer Reuse**: In `Strands.jsx`, update interleaved buffers in-place; never reallocate memory inside the render loop.
- **Instancing**: Use `InstancedMesh` for repeated geometry (e.g., beads in `Figure.jsx`).
- **DPR Clamping**: DPR is clamped to 1.0 (mobile) or 1.5 (desktop) for stability.
- **Additive Blending**: Use additive blending for fading elements to avoid "black line" artifacts.

### Accessibility
- `prefers-reduced-motion`: Must be respected by zeroing out ambient motion and camera swing.
