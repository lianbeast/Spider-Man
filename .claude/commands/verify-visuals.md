---
name: verify-visuals
description: Checklist for visual verification of changes.
---

Use this checklist to verify that the current changes are visually correct and performant.

**1. Technical Proofs (Console)**
- Open the browser console and check the `devBoundaryProof` table. 
- **Requirement**: Every act boundary must have at least 2 live acts (`live >= 2`). If any boundary has only 1, the transition is a "cut" and must be fixed in `src/film/state.js`.

**2. Visual Artifacts**
- **Additive Blending**: Check for "black line" artifacts during fades. All overlapping transparent elements should use additive blending.
- **Closing Wipe**: Verify the timing of the closing wipe in `src/film/state.js` (smoothstep 0.84 to 0.945).

**3. Accessibility & Stability**
- **Reduced Motion**: Toggle `prefers-reduced-motion` in the browser. All ambient float, tilt, and camera swing must be zeroed out.
- **DPR Stability**: Check that the rendering is stable on both mobile (DPR 1.0) and desktop (DPR 1.5).

**4. Determinism**
- Scrub the scrollbar rapidly backwards and forwards. The visual state must be identical for any given `p`.
