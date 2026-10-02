---
name: scalar-driven-state
description: Use when implementing or extending high-frequency scroll-driven animations in the Brand New Day "scroll film" architecture.
---

# Scalar-Driven State

## Overview
The project uses a **push-once, pull-many** mutable state architecture to achieve 60fps. Scroll position is written to a global mutable object once per frame, and 3D components read this value directly in `useFrame`. This bypasses React's reconciliation loop entirely for motion.

## When to Use
Use this pattern for any element that must respond to scroll (`p`) or cursor (`cx, cy`) input.

**Do NOT use for:**
- Occasional UI state changes (e.g., opening a menu) where `useState` is appropriate.
- Slow, asynchronous transitions.

## Core Pattern

### ❌ The "Standard" React Way (Forbidden)
```jsx
const [scroll, setScroll] = useState(0);
useEffect(() => {
  window.addEventListener('scroll', () => setScroll(window.scrollY));
}, []);
// This triggers a full React re-render every single pixel scrolled.
```

### ✅ The Scalar-Driven Way (Required)
```jsx
import { film } from './state.js';

useFrame(() => {
  // Read directly from the mutable object
  const p = film.p; 
  mesh.position.y = p * 10;
});
```

## Implementation Guide

### 1. Adding Global State
If you need a new global input (e.g., a device orientation value):
1. Add the property to the `film` object in `src/film/state.js`.
2. Update the value in the `tick` function within `startDriver()`.

### 2. Adding an Act-Based Gate
To make an element appear/disappear based on the narrative act:
1. Add a property to the `g` (gates) object in `computeGates()` in `src/film/state.js`.
2. Use `gateWin(sp, start, end, fadeIn, fadeOut)` to define the window.
3. Read `film.g.yourGate` in the component's `useFrame` to drive opacity or scale.

## Common Mistakes

| Excuse | Reality |
|--------|---------|
| "I should use useState for better React integration" | React reconciliation is too slow for 60fps scroll; it will cause stutter. |
| "Lerping toward a target feels smoother" | Lerping breaks determinism. Scrubbing backward must be identical to scrubbing forward. |
| "I'll use a library like react-spring" | Springs introduce temporal dependencies. Use direct functions of `p`. |

## Red Flags - STOP and Start Over
- Using `useState` or `useEffect` to track scroll position.
- Using `lerp` or `spring` to move a scroll-driven object.
- Creating a new `requestAnimationFrame` loop inside a component.
