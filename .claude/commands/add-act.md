---
name: add-act
description: Guide the creation of a new narrative act.
---

You are tasked with adding a new narrative act to the "Brand New Day" scroll film. 

The project uses a "Scalar-Driven State" architecture where all visual changes are pure functions of the scroll position `p` (0..1) and the act axis `sp` (0..1).

**Step 1: Define the Gate**
Open `src/film/state.js` and add a new gate to `computeGates`. 
- Use `gateWin(sp, start, holdStart, end, holdEnd)` to define the act's lifecycle.
- **CRITICAL**: Ensure the new act overlaps its neighbors by 0.06-0.14 of `sp` to prevent "slideshow" cuts.
- Verify the boundary logic using `devBoundaryProof` in the browser console.

**Step 2: Connect Visuals**
Identify which components should be active during this act.
- Update `computeGates` to derive flags (e.g., `g.room`, `g.strands`) using `Math.max()` across relevant acts.
- If adding a new visual element, ensure its transforms, opacity, or uniforms are mapped directly to `p` or `sp`.

**Step 3: Performance Check**
- No `useState` or `useEffect` for scroll-driven movement.
- Read from the mutable `film` object inside `useFrame`.

Review the changes against the "Scalar-Driven State" principle.
