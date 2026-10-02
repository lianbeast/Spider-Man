import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { film, isMobile } from './state.js';
import { STRANDS, evalSpine } from './spine.js';
import { clamp01, lerp, smoothstep, easeOutCubic } from './math.js';

// Fat lines: WebGL ignores `linewidth` on LineBasicMaterial outright, and a
// one-pixel strand reads as a scratch on the lens. Fewer SEGMENTS per strand
// on mobile, never fewer strands — the camera swings once per table entry,
// and a strand missing from a swing is exactly the desync the one shared
// table exists to prevent.
const SEGS = isMobile ? 10 : 24;
const GAIN = 1.25; // deliberately OVER the bloom threshold: the core blows out
const BONE = [0.949, 0.953, 0.961];
const SCARLET = [0.878, 0.125, 0.169];

const _fwd = new THREE.Vector3();
const scratch = { pos: new Float32Array((SEGS + 1) * 3), col: new Float32Array((SEGS + 1) * 3) };

export function Strands() {
  const { gl, size } = useThree();

  const rig = useMemo(() => {
    const total = STRANDS.length * SEGS;
    // one interleaved buffer of stride 6: [x1,y1,z1,x2,y2,z2] per segment —
    // instanceStart / instanceEnd are two views on it. Written in place every
    // frame, never reallocated. Same stride-6 layout for the colours.
    const posArr = new Float32Array(total * 6);
    const colArr = new Float32Array(total * 6);
    // setPositions/setColors wrap these Float32Arrays in one
    // InstancedInterleavedBuffer each (stride 6); instanceStart/instanceEnd
    // and instanceColorStart/instanceColorEnd are views on them. We keep the
    // typed arrays and write in place every frame, never reallocating.
    const geo = new LineSegmentsGeometry();
    geo.setPositions(posArr);
    geo.setColors(colArr);
    const mat = new LineMaterial({
      linewidth: 2.4, // screen-space
      worldUnits: false,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending, // the per-strand fade lives in the vertex colours
      depthWrite: false,
      dashed: false,
      fog: true,
    });
    const ls = new LineSegments2(geo, mat);
    ls.frustumCulled = false;
    ls.renderOrder = 5;
    if (import.meta.env.DEV) {
      window.__strandGeo = geo;
      window.__strandLS = ls;
    }
    return { ls, geo, mat, posArr, colArr };
  }, []);

  useEffect(() => {
    const dpr = gl.getPixelRatio();
    rig.mat.resolution.set(size.width * dpr, size.height * dpr);
  }, [gl, size, rig]);

  useFrame(() => {
    const gate = film.g.strands;
    const { posArr, colArr, geo } = rig;
    const { pos: P, col: C } = scratch;
    let seg = 0;

    for (const s of STRANDS) {
      const t = clamp01((film.sp - s.at) / s.span);
      const [ax, ay, az] = s.anchor;

      // firing point follows the camera during FIRE, then plants: derived
      // from the spine, so it tracks any re-tune of the keyframes
      const spStart = Math.min(Math.max(film.sp, s.at), s.at + 0.12 * s.span);
      const base = evalSpine(spStart);
      _fwd.set(base.l[0] - base.p[0], base.l[1] - base.p[1], base.l[2] - base.p[2]).normalize();
      const sx = base.p[0] + s.side * 0.6;
      const sy = base.p[1] - 0.9;
      const sz = base.p[2] + _fwd.z * 1.2;

      // phase: FIRE 0-0.12, TAUT 0.12-0.55 (near-zero sag — that is what taut
      // means), RELEASE 0.55-0.80 (sag grows, a wave travels it), FADE 0.8-1
      let sag;
      let waveAmp = 0;
      let wavePh = 0;
      let alpha = 1;
      let tip;
      if (t <= 0.12) {
        tip = easeOutCubic(t / 0.12); // the free end runs out to the anchor
        sag = 0.05;
      } else {
        tip = 1;
        if (t <= 0.55) {
          sag = 0.06;
        } else {
          const rr = clamp01((t - 0.55) / 0.25);
          sag = 0.06 + 1.3 * rr * rr;
          waveAmp = Math.sin(Math.PI * rr) * 0.3;
          wavePh = (t - 0.55) * 14;
        }
        if (t > 0.8) alpha = 1 - smoothstep(0.8, 1.0, t);
      }
      alpha *= smoothstep(0, 0.02, t);

      for (let i = 0; i <= SEGS; i++) {
        const u = i / SEGS;
        const o = i * 3;
        P[o] = lerp(sx, ax, u);
        P[o + 1] =
          lerp(sy, ay, u) -
          sag * Math.sin(Math.PI * u) -
          waveAmp * Math.sin(u * 9.4 - wavePh) * Math.sin(Math.PI * u);
        P[o + 2] = lerp(sz, az, u);
      }

      // scarlet only as an impulse at the firing edge, MIXED not added:
      // added on top of a strand already above threshold it lands around
      // (2.54, 1.22, 1.24) and ACES pulls all three channels to one point —
      // a bright knot with no hue in it
      const impulse = 1 - smoothstep(0.1, 0.16, t);

      for (let i = 0; i <= SEGS; i++) {
        const u = i / SEGS;
        let cr = BONE[0] * GAIN;
        let cg = BONE[1] * GAIN;
        let cb = BONE[2] * GAIN;
        if (impulse > 0) {
          const k = Math.max(0, 1 - Math.abs(u - tip) / 0.18) * impulse;
          cr = lerp(cr, SCARLET[0] * 1.6, k);
          cg = lerp(cg, SCARLET[1] * 1.6, k);
          cb = lerp(cb, SCARLET[2] * 1.6, k);
        }
        const a = alpha * gate;
        const o = i * 3;
        C[o] = cr * a;
        C[o + 1] = cg * a;
        C[o + 2] = cb * a;
      }

      for (let i = 0; i < SEGS; i++) {
        const w = seg * 6;
        const a = i * 3;
        const b = a + 3;
        posArr[w] = P[a];
        posArr[w + 1] = P[a + 1];
        posArr[w + 2] = P[a + 2];
        posArr[w + 3] = P[b];
        posArr[w + 4] = P[b + 1];
        posArr[w + 5] = P[b + 2];
        colArr[w] = C[a];
        colArr[w + 1] = C[a + 1];
        colArr[w + 2] = C[a + 2];
        colArr[w + 3] = C[b];
        colArr[w + 4] = C[b + 1];
        colArr[w + 5] = C[b + 2];
        seg++;
      }
    }

    // instanceStart/instanceColorStart are ATTRIBUTES, not geometry properties
    geo.attributes.instanceStart.data.needsUpdate = true;
    geo.attributes.instanceColorStart.data.needsUpdate = true;
  });

  return <primitive object={rig.ls} />;
}
