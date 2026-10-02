import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { film } from './state.js';

// Film grain lands in DISPLAY space, after the tone map — before it the
// curve crushes it.
const GrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uAmount: { value: 0.05 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uAmount;
    varying vec2 vUv;
    float hash( vec2 p ) {
      return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 );
    }
    void main() {
      vec4 c = texture2D( tDiffuse, vUv );
      float g = hash( vUv * vec2( 1613.0, 907.0 ) + fract( uTime * 61.7 ) ) - 0.5;
      c.rgb += g * uAmount;
      gl_FragColor = c;
    }`,
};

// Order is the argument: bloom -> vignette -> tone map (OutputPass) -> grain.
export function Post() {
  const { gl, scene, camera, size } = useThree();

  const chain = useMemo(() => {
    const composer = new EffectComposer(gl); // HalfFloat target keeps the negatives
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.45, 1.15);
    // default smoothWidth 0.01 clips hard and hands the blur a cut-out, so
    // what comes back is a rim tracing the shape rather than a glow off it
    bloom.highPassUniforms.smoothWidth.value = 0.35;
    composer.addPass(bloom);
    const vig = new ShaderPass(VignetteShader);
    // darkness 1.0 and NOT ABOVE: three's shader mixes toward
    // vec3(1.0 - darkness) — 1.15 mixes toward -0.15, and on a red field
    // only G and B go negative, so ACES maps the corners back GREEN.
    // Shape the falloff with offset instead.
    vig.uniforms.offset.value = 1.3;
    vig.uniforms.darkness.value = 1.0;
    composer.addPass(vig);
    composer.addPass(new OutputPass());
    const grain = new ShaderPass(GrainShader);
    composer.addPass(grain);
    return { composer, grain };
  }, [gl, scene, camera]);

  useEffect(() => {
    chain.composer.setPixelRatio(gl.getPixelRatio());
    chain.composer.setSize(size.width, size.height);
  }, [chain, gl, size]);

  useFrame(() => {
    chain.grain.uniforms.uTime.value = film.reduce ? 0 : film.t;
    chain.composer.render();
  }, 1);

  return null;
}
