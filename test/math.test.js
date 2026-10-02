import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp01,
  clamp,
  lerp,
  smoothstep,
  easeOutCubic,
  easeInOutCubic,
  gateWin,
  hash1,
  shortestArc,
  hueDist,
  rgbToHsl,
  hslToRgb,
} from '../src/film/math.js';

test('clamp01 clamps to [0,1]', () => {
  assert.equal(clamp01(-1), 0);
  assert.equal(clamp01(0), 0);
  assert.equal(clamp01(0.5), 0.5);
  assert.equal(clamp01(1), 1);
  assert.equal(clamp01(2), 1);
});

test('clamp clamps to [a,b]', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-5, 0, 10), 0);
  assert.equal(clamp(15, 0, 10), 10);
});

test('lerp interpolates', () => {
  assert.equal(lerp(0, 10, 0), 0);
  assert.equal(lerp(0, 10, 0.5), 5);
  assert.equal(lerp(0, 10, 1), 10);
});

test('smoothstep hits endpoints and is monotonic', () => {
  assert.equal(smoothstep(0, 1, 0), 0);
  assert.equal(smoothstep(0, 1, 1), 1);
  assert.equal(smoothstep(0, 1, 0.5), 0.5);
  let prev = -1;
  for (let i = 0; i <= 100; i++) {
    const v = smoothstep(0, 1, i / 100);
    assert.ok(v >= prev, `not monotonic at step ${i}`);
    prev = v;
  }
});

test('smoothstep with a degenerate interval (a === b) never returns NaN', () => {
  // act-1 rise is 0 -> 0: fully open from the start
  assert.equal(smoothstep(0, 0, 0), 1);
  assert.equal(smoothstep(0, 0, 0.5), 1);
  assert.equal(smoothstep(0, 0, -0.1), 0);
  // the never-fall sentinel is 9 -> 9: never falls for any sp in [0,1]
  assert.equal(smoothstep(9, 9, 0), 0);
  assert.equal(smoothstep(9, 9, 1), 0);
  assert.equal(smoothstep(9, 9, 8.999), 0);
});

test('gateWin rises then falls', () => {
  assert.equal(gateWin(0, 0, 0.2, 0.8, 1), 0);
  assert.equal(gateWin(0.2, 0, 0.2, 0.8, 1), 1);
  assert.equal(gateWin(0.5, 0, 0.2, 0.8, 1), 1);
  assert.equal(gateWin(0.8, 0, 0.2, 0.8, 1), 0);
  assert.equal(gateWin(1, 0, 0.2, 0.8, 1), 0);
});

test('gateWin with a never-fall sentinel (c === d) never returns NaN', () => {
  // a5: rises 0.74 -> 0.82, falls 9 -> 9 (never)
  for (let sp = 0; sp <= 1.0001; sp += 0.01) {
    const g = gateWin(sp, 0.74, 0.82, 9, 9);
    assert.ok(!Number.isNaN(g), `NaN at sp=${sp}`);
    assert.ok(g >= 0 && g <= 1, `out of range at sp=${sp}: ${g}`);
  }
  assert.equal(gateWin(0.78, 0.74, 0.82, 9, 9), 1);
});

test('easeOutCubic and easeInOutCubic hit endpoints', () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.equal(easeInOutCubic(0), 0);
  assert.equal(easeInOutCubic(1), 1);
  assert.equal(easeInOutCubic(0.5), 0.5);
});

test('hash1 stays in [0,1)', () => {
  for (let i = 0; i < 10000; i++) {
    const h = hash1(i);
    assert.ok(h >= 0 && h < 1, `out of range: ${h}`);
  }
});

test('shortestArc returns the shorter way around the circle', () => {
  assert.equal(shortestArc(0.1), 0.1);
  assert.equal(shortestArc(0.6), -0.4);
  assert.equal(shortestArc(-0.6), 0.4);
  assert.equal(shortestArc(0.5), -0.5); // either way is 0.5
  for (let d = -2; d <= 2; d += 0.01) {
    const a = shortestArc(d);
    assert.ok(a >= -0.5 && a <= 0.5, `out of range: ${a}`);
  }
});

test('hueDist is the circular distance', () => {
  assert.equal(hueDist(0.1, 0.2), 0.1);
  assert.equal(hueDist(0.9, 0.1), 0.2);
  assert.equal(hueDist(0.5, 0.5), 0);
});

test('rgbToHsl / hslToRgb round-trip', () => {
  for (const [r, g, b] of [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    [0.5, 0.5, 0.5],
    [0.2, 0.7, 0.4],
  ]) {
    const [h, s, l] = rgbToHsl(r, g, b);
    const [r2, g2, b2] = hslToRgb(h, s, l);
    assert.ok(Math.abs(r2 - r) < 1e-9, `r: ${r} -> ${r2}`);
    assert.ok(Math.abs(g2 - g) < 1e-9, `g: ${g} -> ${g2}`);
    assert.ok(Math.abs(b2 - b) < 1e-9, `b: ${b} -> ${b2}`);
  }
});

test('rgbToHsl handles greys (max === min)', () => {
  const [h, s, l] = rgbToHsl(0.5, 0.5, 0.5);
  assert.equal(s, 0);
  assert.equal(l, 0.5);
  assert.ok(!Number.isNaN(h));
});
