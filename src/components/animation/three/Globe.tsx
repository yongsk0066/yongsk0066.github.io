import { Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { useRef } from "react";
import { Euler, Vector3, type Mesh } from "three";
import * as THREE from "three";
const Earth = () => {
  const meshRef = useRef<Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) {
      return;
    }

    meshRef.current.rotation.y += 0.01;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[3, 11, 9]} />
      <meshStandardMaterial color="blue" />
    </mesh>
  );
};

const Airplane = () => {
  const meshRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) {
      return;
    }

    const radius = 3.5;
    const speed = 1;
    const angle = clock.getElapsedTime() * speed;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    meshRef.current.position.set(x, 0, z);
    // meshRef.current.rotateOnWorldAxis(new Vector3(0, 1, 0), 0.01);
  });

  return (
    <mesh ref={meshRef} rotation={[0, 0, Math.PI / 2]}>
      <coneGeometry args={[0.5, 1.5, 6]} />
      <meshStandardMaterial color="red" />
    </mesh>
  );
};

export default function Globe() {
  return (
    <Canvas
      style={{
        height: "500px",
      }}
      camera={{ position: [0, 0, 5], fov: 120 }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[2, 2, -5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <Earth />
      <Airplane />
    </Canvas>
  );
}
