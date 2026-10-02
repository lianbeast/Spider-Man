import { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { bakeFigure } from './plate.js';
import { film } from './state.js';
import { smoothstep } from './math.js';

// Displacement happens GPU-side off instanced attributes, so the whole bead
// life (figure -> part -> dust -> dawn) stays a pure function of the frame
// inputs with zero CPU per-bead work.
const PROJECT = /* glsl */ `
vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  vec3 iPos = vec3( instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2] );
  vec3 rel = iPos - vec3( 0.0, 9.0, 0.0 );
  float cX = cos( uTilt.x ), sX = sin( uTilt.x );
  float y2 = rel.y * cX - rel.z * sX; rel.z = rel.y * sX + rel.z * cX; rel.y = y2;
  float cZ = cos( uTilt.y ), sZ = sin( uTilt.y );
  float x2 = rel.x * cZ - rel.y * sZ; rel.y = rel.x * sZ + rel.y * cZ; rel.x = x2;
  // pivot compensation: rotate about the figure's own centre, then add it back
  vec3 formed = vec3( 0.0, 9.0, 0.0 ) + rel + vec3( 0.0, uFloat, 0.0 );
  float sc = uScatter * uScatter;
  vec3 dust = uDust * vec3(
    sin( uTime * 0.37 + aSeed.w * 31.0 ),
    cos( uTime * 0.29 + aSeed.w * 17.0 ),
    sin( uTime * 0.23 + aSeed.w * 47.0 ) ) * ( 0.5 + aSeed.w );
  // the figure pours itself into an ember sea below the camera path: the
  // camera never flies through it, and the dawn later gathers it upward
  float seaK = smoothstep( 0.05, 0.4, sc );
  vec3 sea = vec3( aSeed.x * 30.0, 2.2 + abs( aSeed.y ) * 3.2, -30.0 - aSeed.z * 140.0 ) + dust;
  vec3 scattered = mix( formed, sea, seaK );
  vec3 sun = uSunPos + aSun;
  vec3 finalPos = mix( scattered, sun, uGather );
  // r0.5 beads are sized for the figure; mid-flight they shrink, at the dawn
  // they are chunky again
  float beadScale = mix( 1.0 - 0.85 * sc, 1.0, uGather );
  mvPosition = vec4( transformed * beadScale + finalPos, 1.0 );
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;
`;

export function Figure() {
  const { uniforms, mesh } = useMemo(() => {
    const { positions, colors, seeds, sunOff, placed } = bakeFigure(40000);

    const geo = new THREE.SphereGeometry(0.5, 8, 6);
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
    geo.setAttribute('aSun', new THREE.InstancedBufferAttribute(sunOff, 3));

    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const u = {
      uScatter: { value: 0 },
      uGather: { value: 0 },
      uBoost: { value: 1 },
      uFloat: { value: 0 },
      uTilt: { value: new THREE.Vector2() },
      uTime: { value: 0 },
      uDust: { value: 0 },
      uEmber: { value: 0 },
      uSunPos: { value: new THREE.Vector3(0, 3.2, -160) },
    };
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader =
        'attribute vec4 aSeed;\n' +
        'attribute vec3 aSun;\n' +
        'uniform float uScatter, uGather, uFloat, uTime, uDust;\n' +
        'uniform vec2 uTilt;\n' +
        'uniform vec3 uSunPos;\n' +
        sh.vertexShader.replace('#include <project_vertex>', PROJECT);
      sh.fragmentShader =
        'uniform float uBoost;\nuniform float uEmber;\n' +
        sh.fragmentShader.replace(
          '#include <color_fragment>',
          `#include <color_fragment>
{
  // letting go of the suit colour: dust and dawn pull to scarlet so the
  // ember frames never carry cobalt — two accents, never a shared frame
  float lum = dot( diffuseColor.rgb, vec3( 0.299, 0.587, 0.114 ) );
  diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.878, 0.125, 0.169 ) * pow( lum, 1.1 ) * 1.85, uEmber );
  diffuseColor.rgb *= uBoost;
}`,
        );
    };

    const m = new THREE.InstancedMesh(geo, mat, 40000);
    const M = new THREE.Matrix4();
    for (let k = 0; k < placed; k++) {
      M.makeTranslation(positions[k * 3], positions[k * 3 + 1], positions[k * 3 + 2]);
      m.setMatrixAt(k, M);
    }
    // the shade + suit remap are baked into instanceColor ONCE
    m.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    m.frustumCulled = false;
    return { uniforms: u, mesh: m };
  }, []);

  useFrame(() => {
    const g = film.g;
    const motion = film.reduce ? 0 : 1;
    uniforms.uScatter.value = g.scatter;
    uniforms.uGather.value = g.gather;
    uniforms.uBoost.value = g.boost;
    uniforms.uFloat.value =
      (Math.sin(film.t * 0.55) * 0.22 + Math.sin(film.t * 0.23) * 0.08) *
      g.idle * motion;
    uniforms.uTilt.value.set(
      film.cy * 0.085 * g.idle * motion,
      -film.cx * 0.11 * g.idle * motion,
    );
    uniforms.uTime.value = film.t;
    uniforms.uDust.value = (0.35 * g.scatter + 0.12 * g.gather) * motion;
    uniforms.uEmber.value = Math.max(g.gather, 0.9 * smoothstep(0.4, 0.9, g.scatter));
  });

  return <primitive object={mesh} />;
}
