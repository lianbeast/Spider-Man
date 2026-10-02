import { clamp01, clamp, lerp } from './math.js';

// ---- camera spine ----------------------------------------------------------
// Keyframes on sp, smoothstepped BETWEEN waypoints — but the legs from rest
// through the corridor are LINEAR. Smoothstep has zero derivative at both
// ends, so a chain of smoothstepped legs stops the camera dead on every
// waypoint; the corridor would stutter on each gear change.
// Gears: ~109 (approach) -> 300 -> 150 -> 360 units per unit of sp, each step
// landing where a strand catches or lets go.
const KF = [
  { s: 0.0, p: [0, 9, 36], l: [0, 9, -2] },
  { s: 0.22, p: [0, 9, 12], l: [0, 9, -10] },
  { s: 0.34, p: [0, 9, -24], l: [0, 9, -44] }, // gear 300: 36u / 0.12
  { s: 0.46, p: [0, 9, -42], l: [0, 9, -62] }, // gear 150: 18u / 0.12
  { s: 0.58, p: [0, 10, -85.2], l: [0, 10.5, -108] }, // gear 360: 43.2u / 0.12
  { s: 0.72, p: [0, 12, -100], l: [0, 13, -124] }, // arrival ease from here
  { s: 0.86, p: [0, 13, -108], l: [0, 13.5, -132] },
  { s: 1.0, p: [0, 13.5, -112], l: [0, 13, -136] },
];
const LINEAR_UNTIL = 5; // legs 0..4 (rest through corridor) are linear

export function evalSpine(sp) {
  sp = clamp01(sp);
  let i = 0;
  while (i < KF.length - 2 && sp > KF[i + 1].s) i++;
  const a = KF[i];
  const b = KF[i + 1];
  let u = (sp - a.s) / (b.s - a.s);
  if (i >= LINEAR_UNTIL) u = u * u * (3 - 2 * u);
  return {
    p: [lerp(a.p[0], b.p[0], u), lerp(a.p[1], b.p[1], u), lerp(a.p[2], b.p[2], u)],
    l: [lerp(a.l[0], b.l[0], u), lerp(a.l[1], b.l[1], u), lerp(a.l[2], b.l[2], u)],
  };
}

const spineZ = (sp) => evalSpine(sp).p[2];

// ---- the strand table ------------------------------------------------------
// ONE table drives BOTH the strands and the camera swing. Six entries; the
// spacing tightens across the run (0.045, 0.045, 0.038, 0.035, 0.031 of the
// act axis) so the corridor accelerates into the next act. Anchors are
// DERIVED from the camera spine — spine(at) + (side*radius, lift, -lead) —
// never authored in world space, so they stay framed through any re-tune.
// lead = 3.8 * radius is the whole of whether any of this is visible: the
// anchor sits atan(radius/lead) ~ 15deg off the view axis, comfortably inside
// the ~29deg half-frame, instead of pinned at 92% of it.
const RAW = [
  { at: 0.24, side: +1, radius: 5.0, lift: 2.2 },
  { at: 0.285, side: -1, radius: 5.4, lift: 2.4 },
  { at: 0.33, side: +1, radius: 5.8, lift: 2.6 },
  { at: 0.368, side: -1, radius: 6.2, lift: 2.8 },
  { at: 0.403, side: +1, radius: 6.6, lift: 3.0 },
  { at: 0.434, side: -1, radius: 7.0, lift: 3.2 },
];

const MID = 0.08 + 0.74 * 0.45; // life-t at mid-swing (the pass-under moment)

export const STRANDS = RAW.map((e) => {
  const lead = 3.8 * e.radius;
  const base = evalSpine(e.at).p;
  const anchor = [base[0] + e.side * e.radius, base[1] + e.lift, base[2] - lead];
  // span derived, not authored: mid-swing should land exactly where the
  // camera passes under the anchor (solve spine z crossing anchor z)
  const anchorZ = anchor[2];
  let hit = -1;
  for (let x = e.at; x <= e.at + 0.4; x += 0.004) {
    if (spineZ(x) <= anchorZ) {
      hit = x;
      break;
    }
  }
  const span = hit > 0 ? clamp((hit - e.at) / MID, 0.1, 0.3) : 0.16;
  return { ...e, lead, span, anchor };
});

// swing window is u = 0.08..0.82 of each strand's life — consecutive windows
// overlap and, sides alternating, the sum crosses zero instead of stopping
// at it: an S-weave. sin(pi*u) is exactly zero at both ends, so the terms
// sum without leaving a permanent offset in any later act.
export const SWING = { lateral: 3.2, dip: 1.5, bank: 0.15, u0: 0.08, u1: 0.82 };
