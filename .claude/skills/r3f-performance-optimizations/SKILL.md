---
name: r3f-performance-optimizations
description: Use when optimizing Three.js components in React for high-density geometry or complex per-frame updates.
---

# R3F Performance Optimizations

## Overview
High-performance 3D in React requires minimizing garbage collection (GC) and CPU-to-GPU communication. This project prioritizes GPU-side calculations and in-place buffer updates to maintain stable frame times.

## Core Patterns

### 1. In-Place Buffer Reuse
Avoid creating new arrays inside the render loop. Instead, allocate a typed array once and update its values in-place.

**Pattern:**
```jsx
const posArr = useMemo(() => new Float32Array(total * 6), []);

useFrame(() => {
  for (let i = 0; i < total; i++) {
    posArr[i * 3] = newX; // update in place
  }
  geometry.attributes.position.needsUpdate = true;
});
```
*Example: See `src/film/Strands.jsx` for interleaved buffer management.*

### 2. GPU-First Motion (Custom Shaders)
For large sets of objects (e.g., 40k beads), move the transformation logic to the vertex shader. Pass global state as uniforms rather than updating thousands of matrices on the CPU.

**Pattern:**
- Use `InstancedMesh` for geometry.
- Use `onBeforeCompile` to inject custom GLSL into the standard material.
- Update uniforms (e.g., `uTime`, `uScatter`) in `useFrame`.
*Example: See `src/film/Figure.jsx` for the "scatter" and "gather" implementation.*

### 3. Additive Blending for Glow
To create high-intensity "blown out" effects (bloom) without black-line artifacts or depth fighting:
- Set `blending: THREE.AdditiveBlending`.
- Set `depthWrite: false`.
*Example: See the `LineMaterial` config in `src/film/Strands.jsx`.*

## Quick Reference

| Technique | When to use | Performance Win |
|-----------|-------------|------------------|
| `InstancedMesh` | 100+ identical geometries | Reduces draw calls |
| `Float32Array` | Frequent vertex updates | Eliminates GC spikes |
| Vertex Shaders | Per-instance logic | Offloads CPU to GPU |
| DPR Clamping | High-res displays | Stabilizes GPU load |

## Common Mistakes

- **Allocating in `useFrame`**: Creating `new THREE.Vector3()` inside the loop. Use a "scratch" object outside the loop.
- **Updating too many uniforms**: Group related values into a `Vector2` or `Vector3` to reduce API calls.
- **Over-using `useEffect` for 3D state**: Use `useFrame` for anything that changes every frame.
