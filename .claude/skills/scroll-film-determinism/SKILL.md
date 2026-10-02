---
name: scroll-film-determinism
description: Use when implementing animations driven by scroll position to ensure perfectly reversible and predictable movement.
---

# Scroll Film Determinism

## Overview
A "scroll film" must be perfectly deterministic. The state of the world at scroll position `p` must be identical regardless of whether the user arrived there from `p-0.1` (forward) or `p+0.1` (backward).

## The Golden Rule
**No Integration. No Springs. No Lerping.**

If a value depends on the *previous* frame's value, it is non-deterministic. Every value must be a pure function of the current scalars (`p`, `sp`, `t`).

### ❌ Non-Deterministic (Forbidden)
```jsx
// BAD: The position depends on where it was last frame
useFrame((state, delta) => {
  mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, targetY, 0.1);
});
```

### ✅ Deterministic (Required)
```jsx
// GOOD: The position is a direct function of scroll p
useFrame(() => {
  const p = film.p;
  mesh.position.y = p * 10; 
});
```

## Tools for Deterministic Motion

To achieve "smooth" feel without using temporal integration, use these mathematical mappings:

### 1. `smoothstep`
Creates a smooth ramp between two values. Perfect for fades and transitions.
`value = smoothstep(edge0, edge1, p);`

### 2. `lerp` (as a function, not a target)
Linearly interpolates between two values based on a scalar.
`value = lerp(start, end, p);`

### 3. `easeInOutCubic`
Adds a more natural acceleration/deceleration to a transition.

## Verification: The Scrub Test
To verify determinism, use the browser console:
1. Set `window.scrollY = 500`. Note the position of an element.
2. Set `window.scrollY = 0`.
3. Set `window.scrollY = 500` again.
4. If the position differs by even a fraction, the implementation is non-deterministic.

## Red Flags
- Using `delta` from `useFrame` to increment a value.
- Using `react-spring` or `framer-motion` for scroll-driven elements.
- "Smoothing" a scroll value using a low-pass filter or lerp.
