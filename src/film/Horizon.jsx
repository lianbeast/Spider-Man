import { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { film } from './state.js';
import { BONE } from './palette.js';

// Where a floor would be, fog is. One thin horizon bar only, held relative to
// the camera at the fog line so no finite plane ever shows its edge.
export function Horizon() {
  const { camera } = useThree();
  const { mesh, mat } = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      color: BONE[50],
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: true,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(320, 0.09), mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 1;
    return { mesh, mat };
  }, []);

  useFrame(() => {
    mat.opacity = 0.4 * film.g.bar;
    mesh.position.set(0, 1.5, camera.position.z - 90);
  });

  return <primitive object={mesh} />;
}
