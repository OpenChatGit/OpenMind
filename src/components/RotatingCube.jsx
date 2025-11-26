import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

const WireframeCube = () => {
  const groupRef = useRef();

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.x += 0.015;
      groupRef.current.rotation.y += 0.015;
    }
  });

  // Define cube vertices - smaller size to fit better
  const size = 0.6;
  const vertices = [
    [-size, -size, -size], [size, -size, -size], [size, size, -size], [-size, size, -size], // Back face
    [-size, -size, size], [size, -size, size], [size, size, size], [-size, size, size]  // Front face
  ];

  // Define edges
  const edges = [
    // Back face
    [vertices[0], vertices[1]], [vertices[1], vertices[2]], [vertices[2], vertices[3]], [vertices[3], vertices[0]],
    // Front face
    [vertices[4], vertices[5]], [vertices[5], vertices[6]], [vertices[6], vertices[7]], [vertices[7], vertices[4]],
    // Connecting edges
    [vertices[0], vertices[4]], [vertices[1], vertices[5]], [vertices[2], vertices[6]], [vertices[3], vertices[7]]
  ];

  return (
    <group ref={groupRef}>
      {edges.map((edge, i) => (
        <Line
          key={i}
          points={edge.map(v => new THREE.Vector3(...v))}
          color="#ffffff"
          lineWidth={2}
        />
      ))}
    </group>
  );
};

const RotatingCube = () => {
  return (
    <Canvas
      style={{ width: '100%', height: '100%', background: 'transparent' }}
      camera={{ position: [0, 0, 3], fov: 35 }}
      gl={{ alpha: true }}
    >
      <WireframeCube />
    </Canvas>
  );
};

export default RotatingCube;
