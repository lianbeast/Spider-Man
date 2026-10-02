import { useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { film } from './state.js';
import { STRANDS, SWING, evalSpine } from './spine.js';

const _pos = new THREE.Vector3();
const _look = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _up = new THREE.Vector3();
const _cr = new THREE.Vector3();

export function CameraRig() {
  const { camera, scene } = useThree();

  useEffect(() => {
    // the default XYZ leaks visible roll the moment both axes are non-zero
    camera.rotation.order = 'YXZ';
    const fitFov = () => {
      camera.fov = camera.aspect < 0.75 ? 66 : 52;
      camera.updateProjectionMatrix();
    };
    fitFov();
    window.addEventListener('resize', fitFov);
    return () => window.removeEventListener('resize', fitFov);
  }, [camera]);

  useFrame(() => {
    const sp = evalSpine(film.sp);
    _pos.set(sp.p[0], sp.p[1], sp.p[2]);
    _look.set(sp.l[0], sp.l[1], sp.l[2]);

    // THE SWING, from the same table that drives the strands: lateral
    // side*3.2*sin(pi*u), a 1.5 dip to pass under the anchor, 0.15 rad of
    // bank into the turn. Added to POSITION ONLY, never to the look target —
    // the camera rotates to hold the axis while it translates, which is what
    // makes an offset read as an arc. Reduced motion keeps the strands (the
    // graphic) and zeroes the swing (the motion).
    const amp = film.reduce ? 0 : 1;
    let sx = 0;
    let sy = 0;
    let bank = 0;
    if (amp) {
      for (const s of STRANDS) {
        const t = (film.sp - s.at) / s.span;
        if (t <= SWING.u0 || t >= SWING.u1) continue;
        const u = (t - SWING.u0) / (SWING.u1 - SWING.u0);
        const w = Math.sin(Math.PI * u);
        sx += s.side * SWING.lateral * w;
        sy -= SWING.dip * w;
        bank += s.side * SWING.bank * w;
      }
    }
    camera.position.set(_pos.x + sx * amp, _pos.y + sy * amp, _pos.z);

    // bank by rotating the UP VECTOR about the view axis (Rodrigues), out to
    // mid-drop and BACK UPRIGHT by arrival — never a full roll
    _fwd.subVectors(_look, _pos).normalize();
    _up.set(0, 1, 0);
    if (Math.abs(_fwd.y) > 0.99) _up.set(0, 0, 1); // near-vertical guard
    const b = bank * amp;
    _cr.crossVectors(_fwd, _up);
    const d = _up.dot(_fwd);
    _up
      .multiplyScalar(Math.cos(b))
      .addScaledVector(_cr, Math.sin(b))
      .addScaledVector(_fwd, d * (1 - Math.cos(b)));
    camera.up.copy(_up);
    camera.lookAt(_look);

    // fog far closes for the wipe so the far end dissolves instead of
    // showing an end wall
    scene.fog.near = film.g.fogNear;
    scene.fog.far = film.g.fogFar;
  });

  return null;
}
