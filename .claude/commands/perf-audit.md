---
name: perf-audit
description: Adversarially review changes for performance regressions in the render loop.
---

Review the provided diff specifically for performance regressions that would break the 60fps target. 

The project follows a strict **Zero-Allocation** policy in the render loop.

**Checklist:**
1. **Zero-Allocation**: Search for `new`, `[]`, `{}`, or `parseFloat/toFixed` (where not used for style strings) inside `useFrame` or the `tick` function in `state.js`. Any object creation per-frame triggers GC pauses.
2. **Buffer Reuse**: In components like `Strands.jsx` or `Figure.jsx`, verify that geometry attributes are updated using `attribute.set(value, offset)` or direct buffer manipulation. Flag any `geometry.setAttribute` calls that re-allocate buffers.
3. **React Reconciliation**: Ensure no scroll-driven state is stored in React `state` or `props`. All high-frequency updates must use the mutable `film` object.
4. **Math Efficiency**: Look for expensive operations (like `Math.pow` or complex trig) that could be pre-computed or simplified.

If any of these are found, explain the specific performance cost (e.g., "creates a new array every frame, causing GC jitter") and provide the optimized alternative.
