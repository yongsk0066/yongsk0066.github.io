import { Canvas } from "@react-three/fiber";
import { Suspense, useRef, useEffect, useMemo, useState } from "react";
import {
  Physics,
  RigidBody,
  InstancedRigidBodies,
  CuboidCollider,
  RapierRigidBody,
} from "@react-three/rapier";
import { Box } from "@react-three/drei";
import { Color, InstancedMesh } from "three";

const niceColors = [
  "#99b898",
  "#fecea8",
  "#ff847c",
  "#e84a5f",
  "#2a363b",
] as const;

type InstancedGeometryProps = {
  colors: Float32Array;
  number: number;
  size: number;
};

const Spheres = ({ colors, number, size }: InstancedGeometryProps) => {
  const rigidBodies = useRef<RapierRigidBody[]>(null);

  useEffect(() => {
    if (!rigidBodies.current) {
      return;
    }

    // Apply smaller impulses to random instances
    for (let i = 0; i < 10; i++) {
      rigidBodies.current[Math.floor(Math.random() * number)].applyImpulse(
        { x: 0, y: 5, z: 0 },
        true
      );
    }
  }, []);

  const instances = useMemo(() => {
    const instances = [];
    for (let i = 0; i < number; i++) {
      instances.push({
        key: "instance_" + Math.random(),
        position: [Math.random() - 0.5, Math.random() * 2, Math.random() - 0.5],
      });
    }
    return instances;
  }, [number]);

  return (
    <InstancedRigidBodies
      ref={rigidBodies}
      instances={instances}
      colliders="ball"
    >
      <instancedMesh args={[undefined, undefined, number]}>
        <sphereGeometry args={[size, 48]}>
          <instancedBufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
          />
        </sphereGeometry>
        <meshLambertMaterial vertexColors />
      </instancedMesh>
    </InstancedRigidBodies>
  );
};

const Boxes = ({ colors, number, size }: InstancedGeometryProps) => {
  const rigidBodies = useRef<RapierRigidBody[]>(null);

  useEffect(() => {
    if (!rigidBodies.current) {
      return;
    }

    // Apply smaller impulses to random instances
    for (let i = 0; i < 10; i++) {
      rigidBodies.current[Math.floor(Math.random() * number)].applyImpulse(
        { x: 0, y: 5, z: 0 },
        true
      );
    }
  }, []);

  const instances = useMemo(() => {
    const instances = [];
    for (let i = 0; i < number; i++) {
      instances.push({
        key: "instance_" + Math.random(),
        position: [Math.random() - 0.5, Math.random() * 2, Math.random() - 0.5],
      });
    }
    return instances;
  }, [number]);

  return (
    <InstancedRigidBodies
      ref={rigidBodies}
      instances={instances}
      colliders="cuboid"
    >
      <instancedMesh args={[undefined, undefined, number]}>
        <boxGeometry args={[size, size, size]}>
          <instancedBufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
          />
        </boxGeometry>
        <meshLambertMaterial vertexColors />
      </instancedMesh>
    </InstancedRigidBodies>
  );
};

const instancedGeometry = {
  box: Boxes,
  sphere: Spheres,
};

export default function PhysicTest() {
  const [geometry, setGeometry] = useState<"box" | "sphere">("box");
  const [number] = useState(200);
  const [size] = useState(0.1);

  const colors = useMemo(() => {
    const array = new Float32Array(number * 3);
    const color = new Color();
    for (let i = 0; i < number; i++)
      color
        .set(niceColors[Math.floor(Math.random() * 5)])
        .convertSRGBToLinear()
        .toArray(array, i * 3);
    return array;
  }, [number]);

  const InstancedGeometry = instancedGeometry[geometry];

  return (
    <Canvas
      style={{
        height: "400px",
      }}
      camera={{ fov: 50, position: [-1, 1, 2.5], up: [0, 1, 0] }}
      onCreated={({ scene }) => (scene.background = new Color("lightblue"))}
      onPointerMissed={() =>
        setGeometry((geometry) => (geometry === "box" ? "sphere" : "box"))
      }
      shadows
    >
      <hemisphereLight intensity={0.35 * Math.PI} />
      <spotLight
        angle={0.3}
        castShadow
        decay={0}
        intensity={2 * Math.PI}
        penumbra={1}
        position={[10, 10, 10]}
      />
      <Suspense>
        <Physics gravity={[0, -5, 0]} colliders="hull">
          <InstancedGeometry {...{ colors, number, size }} />
          <RigidBody type="fixed" colliders="cuboid" position={[0, -1, 0]}>
            <CuboidCollider args={[10, 0.5, 10]} />
            <mesh receiveShadow>
              <boxGeometry args={[10, 0.5, 10]} />
              <meshStandardMaterial color="#999999" />
            </mesh>
          </RigidBody>
        </Physics>
      </Suspense>
    </Canvas>
  );
}
