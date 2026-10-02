---
name: camera-tweak
description: Guide updates to camera keyframes and movement logic.
---

You are updating the camera movement in `src/film/spine.js` or `src/film/CameraRig.jsx`.

**Constraints:**
1. **Direct Mapping**: Camera position must be a pure function of `p`. No springs, no lerping toward targets, no `react-spring`.
2. **Banking Logic**: The `CameraRig` uses Rodrigues rotation for banking. Ensure any changes to the rotation axis or angle preserve this mathematical consistency.
3. **Keyframe Integrity**: If updating `spine.js`, ensure the transition between keyframes is smooth and doesn't introduce abrupt jumps.

**Steps:**
1. Analyze the current `p` mapping for the target movement.
2. Implement the change as a direct function of `p`.
3. Verify that the banking (roll) is correctly coupled with the camera's swing position.
4. Test by scrubbing backwards and forwards to ensure the frames are identical.
