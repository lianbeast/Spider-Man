import { useEffect } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { startDriver, film } from './film/state.js';
import { Figure } from './film/Figure.jsx';
import { Lattice } from './film/Lattice.jsx';
import { Room } from './film/Room.jsx';
import { Horizon } from './film/Horizon.jsx';
import { Strands } from './film/Strands.jsx';
import { CameraRig } from './film/CameraRig.jsx';
import { Post } from './film/Post.jsx';
import { Overlays } from './film/Overlays.jsx';

export default function App() {
  useEffect(() => {
    startDriver();
  }, []);

  return (
    <div id="track">
      <div id="stage">
        <Canvas
          dpr={film.dpr}
          camera={{ fov: 52, near: 0.1, far: 420, position: [0, 9, 36] }}
          gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
          onCreated={({ gl, scene }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.0;
            scene.background = new THREE.Color(0x150406);
            scene.fog = new THREE.Fog(0x150406, 10, 120);
          }}
        >
          <Figure />
          <Lattice />
          <Room />
          <Horizon />
          <Strands />
          <CameraRig />
          <Post />
        </Canvas>
        <Overlays />
      </div>
    </div>
  );
}
