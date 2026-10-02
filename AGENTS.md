# AGENTS.md - BRAND NEW DAY

## 🕷️ Project Identity
**Project**: BRAND NEW DAY
**Concept**: A high-performance "scroll film" experience.
**North Star**: Maintain a locked 60fps regardless of scene complexity.
**Engine**: React $\rightarrow$ `@react-three/fiber` $\rightarrow$ `three.js`.

The experience consists of a single page with a 2200vh scroll track and a sticky stage. Scrolling drives a camera through six narrative acts in a 3D environment.

## 🏗 Architecture

The project is designed as a high-performance visual engine where the 3D scene is a pure function of the scroll position.

### Core Principle: Scalar-Driven State
The entire scene state is driven by a single scalar $p$ (scroll position $p \in [0, 1]$).
- **Determinism**: Given $p$, the entire scene state is predictable. Scrubbing backwards produces the exact same frames as scrubbing forwards.
- **Data Flow**: `Scroll Event` $\rightarrow$ `src/film/state.js` (Mutable Update) $\rightarrow$ `useFrame` (R3F Loop) $\rightarrow$ `GPU`.
- **Performance Strategy**: To maintain 60fps, the project **bypasses React state for $p$**. High-frequency updates are written to a mutable object in `state.js` to avoid the React reconciliation cycle.

### Project Structure (`src/film/`)
The engine is split into state management, structural sequencing, and visual components:

| Component | Role | Implementation Detail |
| :--- | :--- | :--- |
| **State** | `state.js` | Single source of truth for $p$; rAF driver and act gates. |
| **Sequence** | `spine.js` | Timeline and sequencer; camera keyframes and strand table. |
| **Rigging** | `CameraRig.jsx` | Deterministic camera paths and Rodrigues rotation banking. |
| **Geometry** | `Strands.jsx` | High-performance fat lines using `LineSegments2` with buffer reuse. |
| **Geometry** | `Figure.jsx` | Procedural portrait plate and `InstancedMesh` bead cloud. |
| **Environment**| `Room.jsx` / `Horizon.jsx` | Wireframe cylinders and fog-based floor. |
| **Visuals** | `Post.jsx` | Pipeline: Bloom $\rightarrow$ Vignette $\rightarrow$ Tone Mapping $\rightarrow$ Grain. |
| **UI** | `Overlays.jsx` | DOM layer synchronized with the act axis. |

### Key Design Decisions
- **GPU-First**: Ambient motion (wind, float, tilt) is offloaded to GPU attributes, uniforms, or calculated in `useFrame` using `state.clock`.
- **Zero Lerping**: No `lerp` or `react-spring` on the primary scroll value $p$ to preserve the 1:1 tactile feel of the input.
- **Memory Management**: Pre-allocation of `Vector3`, `Euler`, and `Matrix4` objects to minimize Garbage Collection (GC) pressure.
- **DPR Clamping**: Device Pixel Ratio is clamped to 1.0 (mobile) or 1.5 (desktop) for stability.

## 🚀 Operational Guide

### Build & Run
- **Install**: `npm install`
- **Develop**: `npm run dev` (Vite dev server, usually `http://localhost:5173`)
- **Build**: `npm run build` (Generates production bundle in `dist/`)
- **Preview**: `npm run preview` (Local production check)

### Testing & Profiling
- **Visual Verification**: Manual scrub testing.
- **Performance**: Use Chrome DevTools (Performance tab) and Three.js inspector.
- **Overlap Proof**: Use `window.__BND` in the browser console to verify act boundary transitions.

## 🧪 Testing
```bash
npm test           # node --test: math, gates, spine regression tests
```
- **Automated**: Pure-function tests cover `math.js` (smoothstep/gateWin/HSL), `state.js` (gate overlap proof, no-NaN, purity), and `spine.js` (continuity, strand invariants).
- **Manual Verification**: Run `npm run dev` and scrub the scroll track to verify narrative act transitions.
- **State Debugging**: Open browser console and use `window.__BND` to inspect internal state and startup overlap proofs.

## 🛠 Strict Coding Conventions

### Performance Laws
- **Mutable State**: Use mutable objects in `state.js` for high-frequency updates.
- **Buffer Reuse**: Update interleaved buffers in-place; never reallocate memory inside the render loop.
- **Additive Blending**: Use additive blending for glow and light effects to reduce overdraw costs.

### Accessibility & Math
- **Motion**: Support `prefers-reduced-motion` by zeroing out ambient motion and simplifying camera swing.
- **Interpolation**: Prefer simple linear interpolations based on $p$ over complex easing libraries.
