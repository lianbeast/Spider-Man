import test from 'node:test';
import assert from 'node:assert/strict';
import { evalSpine, STRANDS } from '../src/film/spine.js';

// keyframe positions from spine.js (KF is module-private; these are the
// regression anchors)
const KF_POS = [
  [0, 9, 36],
  [0, 9, 12],
  [0, 9, -24],
  [0, 9, -42],
  [0, 10, -85.2],
  [0, 12, -100],
  [0, 13, -108],
  [0, 13.5, -112],
];
const KF_S = [0.0, 0.22, 0.34, 0.46, 0.58, 0.72, 0.86, 1.0];

test('evalSpine hits the keyframes exactly', () => {
  for (let i = 0; i < KF_S.length; i++) {
    const s = evalSpine(KF_S[i]);
    assert.deepEqual(s.p, KF_POS[i], `position mismatch at s=${KF_S[i]}`);
  }
});

test('evalSpine is continuous (no jumps)', () => {
  let prev = evalSpine(0);
  for (let i = 1; i <= 2000; i++) {
    const sp = i / 2000;
    const s = evalSpine(sp);
    const dp = Math.hypot(s.p[0] - prev.p[0], s.p[1] - prev.p[1], s.p[2] - prev.p[2]);
    assert.ok(dp < 1, `position jump of ${dp} at sp=${sp}`);
    prev = s;
  }
});

test('evalSpine never returns NaN', () => {
  for (let i = 0; i <= 1000; i++) {
    const s = evalSpine(i / 1000);
    for (const v of [...s.p, ...s.l]) {
      assert.ok(Number.isFinite(v), `NaN at sp=${i / 1000}`);
    }
  }
});

test('camera z is non-increasing (always moving forward)', () => {
  let prev = evalSpine(0).p[2];
  for (let i = 1; i <= 1000; i++) {
    const z = evalSpine(i / 1000).p[2];
    assert.ok(z <= prev + 1e-9, `z increased at sp=${i / 1000}: ${prev} -> ${z}`);
    prev = z;
  }
});

test('STRANDS anchors are derived from the spine', () => {
  for (const s of STRANDS) {
    const base = evalSpine(s.at).p;
    assert.equal(s.anchor[0], base[0] + s.side * s.radius);
    assert.equal(s.anchor[1], base[1] + s.lift);
    assert.equal(s.anchor[2], base[2] - s.lead);
    assert.equal(s.lead, 3.8 * s.radius);
  }
});

test('STRANDS spans are clamped to [0.1, 0.3]', () => {
  for (const s of STRANDS) {
    assert.ok(s.span >= 0.1 && s.span <= 0.3, `span ${s.span} out of range`);
  }
});

test('STRANDS sides alternate', () => {
  for (let i = 1; i < STRANDS.length; i++) {
    assert.equal(STRANDS[i].side, -STRANDS[i - 1].side);
  }
});

test('STRANDS at values are strictly increasing', () => {
  for (let i = 1; i < STRANDS.length; i++) {
    assert.ok(STRANDS[i].at > STRANDS[i - 1].at);
  }
});

test('camera reaches each anchor within the strand life', () => {
  // the span-solving invariant: spineZ(at + span) <= anchorZ
  for (const s of STRANDS) {
    const z = evalSpine(s.at + s.span).p[2];
    assert.ok(
      z <= s.anchor[2] + 1e-9,
      `camera did not reach anchor for strand at ${s.at}: z=${z} anchorZ=${s.anchor[2]}`,
    );
  }
});
