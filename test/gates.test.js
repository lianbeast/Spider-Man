import test from 'node:test';
import assert from 'node:assert/strict';
import { computeGates, film } from '../src/film/state.js';

const GATE_KEYS = [
  'a1',
  'a2',
  'a3',
  'a4',
  'a5',
  'room',
  'strands',
  'bar',
  'lattice',
  'idle',
  'scatter',
  'gather',
  'boost',
  'wipe',
];

test('startup gates contain no NaN (regression: a1 was NaN at sp=0)', () => {
  for (const k of GATE_KEYS) {
    assert.ok(!Number.isNaN(film.g[k]), `film.g.${k} is NaN at startup`);
  }
});

test('every gate is finite across the whole scroll', () => {
  const g = {};
  for (let i = 0; i <= 1000; i++) {
    const sp = i / 1000;
    computeGates(sp, sp, g);
    for (const k of GATE_KEYS) {
      assert.ok(Number.isFinite(g[k]), `${k} not finite at sp=${sp}: ${g[k]}`);
    }
  }
});

test('act overlap proof: at least two acts live at every boundary', () => {
  // mirrors devBoundaryProof in state.js, now as a regression test
  const g = {};
  for (const x of [0.28, 0.48, 0.66, 0.8]) {
    computeGates(x, 0, g);
    const live = ['a1', 'a2', 'a3', 'a4', 'a5'].filter((k) => g[k] > 0).length;
    assert.ok(live >= 2, `only ${live} acts live at sp=${x}`);
  }
});

test('each consecutive act pair overlaps somewhere', () => {
  const g = {};
  const pairs = [
    ['a1', 'a2'],
    ['a2', 'a3'],
    ['a3', 'a4'],
    ['a4', 'a5'],
  ];
  for (const [x, y] of pairs) {
    let found = false;
    for (let i = 0; i <= 1000; i++) {
      const sp = i / 1000;
      computeGates(sp, sp, g);
      if (g[x] > 0 && g[y] > 0) {
        found = true;
        break;
      }
    }
    assert.ok(found, `${x} and ${y} never overlap`);
  }
});

test('gates stay within [0,1]', () => {
  const g = {};
  // boost is a brightness multiplier, not a gate — intentionally exceeds 1
  const gateKeys = GATE_KEYS.filter((k) => k !== 'boost');
  for (let i = 0; i <= 1000; i++) {
    const sp = i / 1000;
    computeGates(sp, sp, g);
    for (const k of gateKeys) {
      assert.ok(g[k] >= 0 && g[k] <= 1, `${k} out of [0,1] at sp=${sp}: ${g[k]}`);
    }
  }
});

test('wipe runs on p, not sp', () => {
  const g = {};
  computeGates(0, 0, g);
  assert.equal(g.wipe, 0);
  computeGates(0, 0.9, g);
  assert.ok(g.wipe > 0, 'wipe should be open at p=0.9');
  computeGates(1, 1, g);
  assert.equal(g.wipe, 1);
});

test('fog closes in during the wipe', () => {
  const g = {};
  computeGates(0, 0, g);
  assert.equal(g.fogFar, 120);
  assert.equal(g.fogNear, 10);
  computeGates(1, 1, g);
  assert.equal(g.fogFar, 34);
  assert.equal(g.fogNear, 4);
});

test('computeGates is pure: same inputs, same outputs', () => {
  const a = {};
  const b = {};
  computeGates(0.37, 0.45, a);
  computeGates(0.37, 0.45, b);
  assert.deepEqual(a, b);
});

test('computeGates does not mutate film.g', () => {
  const before = JSON.stringify(film.g);
  const g = {};
  computeGates(0.5, 0.5, g);
  assert.equal(JSON.stringify(film.g), before);
});
