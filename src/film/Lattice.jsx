import { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { film } from './state.js';
import { BONE } from './palette.js';

// A wireframe cage around the figure. Wireframe output is non-indexed vertex
// PAIRS, so both vertices of a segment get one SHARED random plus an end
// parameter — that is what lets each segment draw itself from one end as the
// build scalar passes its own staggered threshold. ONE scalar (uBuild, the
// act-1 gate) weaves it in and un-weaves it.
export function Lattice() {
  const { mesh, uniforms } = useMemo(() => {
    const src = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(8.5, 1));
    const pos = src.attributes.position;
    const n = pos.count;
    const other = new Float32Array(n * 3);
    const rand = new Float32Array(n);
    const end = new Float32Array(n);
    for (let s = 0; s < n / 2; s++) {
      const a = s * 2;
      const b = s * 2 + 1;
      const r = Math.random();
      rand[a] = r;
      rand[b] = r; // shared per segment
      end[a] = 0;
      end[b] = 1;
      for (let c = 0; c < 3; c++) {
        other[a * 3 + c] = pos.array[b * 3 + c];
        other[b * 3 + c] = pos.array[a * 3 + c];
      }
    }
    src.setAttribute('aOther', new THREE.BufferAttribute(other, 3));
    src.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
    src.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));

    const uniforms = {
      uBuild: { value: 0 },
      uGain: { value: 0.55 },
      uColor: { value: new THREE.Color(BONE[50]) },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexShader: /* glsl */ `
        attribute vec3 aOther;
        attribute float aRand;
        attribute float aEnd;
        uniform float uBuild;
        varying float vA;
        void main() {
          float b = clamp( ( uBuild - aRand * 0.72 ) / 0.28, 0.0, 1.0 );
          vA = b;
          // the tip vertex slides from the segment's base (aOther) to its own
          // position as the build scalar passes this segment's threshold
          vec3 p = mix( aOther, position, aEnd * b );
          gl_Position = projectionMatrix * modelViewMatrix * vec4( p, 1.0 );
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uGain;
        varying float vA;
        void main() { gl_FragColor = vec4( uColor * uGain, vA ); }`,
    });

    const m = new THREE.LineSegments(src, mat);
    m.position.set(0, 9, 0);
    m.frustumCulled = false;
    m.renderOrder = 2;
    if (import.meta.env.DEV) window.__lattice = m;
    return { mesh: m, uniforms };
  }, []);

  useFrame(() => {
    uniforms.uBuild.value = film.g.lattice;
    mesh.rotation.y = film.reduce ? 0 : film.t * 0.05;
  });

  return <primitive object={mesh} />;
}
