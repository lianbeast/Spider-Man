import { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { film } from './state.js';
import { COBALT } from './palette.js';

// Three nested wireframe cylinders, r 9 / 13.95 / 19.8, axis down -Z, camera
// inside. Drifts 0.055 / -0.03 / 0.014 — differential rotation, without which
// the three read as one rotating tube. Cobalt at 0.22, additive, depthWrite
// off. No ground plane: where a floor would be, fog is — any finite plane
// shows its edge from some keyframe. One thin horizon bar only (Horizon.jsx).
const RADII = [9, 13.95, 19.8];
const DRIFTS = [0.055, -0.03, 0.014];
const HALF_LEN = 65; // cylinders span z +/-65 about the group origin
const RINGS = 22;
const GON = 48;
const SPOKES = 24;

function buildShellGeometry(r) {
  const pts = [];
  const ringZ = [];
  for (let k = 0; k < RINGS; k++) ringZ.push(HALF_LEN - (k * 2 * HALF_LEN) / (RINGS - 1));
  for (const z of ringZ) {
    for (let a = 0; a < GON; a++) {
      const t0 = (a / GON) * Math.PI * 2;
      const t1 = ((a + 1) / GON) * Math.PI * 2;
      pts.push(Math.cos(t0) * r, Math.sin(t0) * r, z, Math.cos(t1) * r, Math.sin(t1) * r, z);
    }
  }
  for (let a = 0; a < SPOKES; a++) {
    const t = (a / SPOKES) * Math.PI * 2;
    const x = Math.cos(t) * r;
    const y = Math.sin(t) * r;
    for (let k = 0; k < RINGS - 1; k++) {
      pts.push(x, y, ringZ[k], x, y, ringZ[k + 1]);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
  return geo;
}

export function Room() {
  const { group, mat, shells } = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({
      color: COBALT[500],
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: true,
    });
    const shells = RADII.map((r) => {
      const m = new THREE.LineSegments(buildShellGeometry(r), mat);
      m.frustumCulled = false;
      m.renderOrder = 1;
      return m;
    });
    const group = new THREE.Group();
    group.position.set(0, 9.5, -35);
    shells.forEach((s) => group.add(s));
    return { group, mat, shells };
  }, []);

  useFrame(() => {
    mat.opacity = 0.22 * film.g.room;
    if (!film.reduce) {
      for (let i = 0; i < shells.length; i++) shells[i].rotation.z = film.t * DRIFTS[i];
    }
  });

  return <primitive object={group} />;
}
