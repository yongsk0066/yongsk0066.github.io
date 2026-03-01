import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { AxesHelper, Matrix4, Mesh, Vector3 } from "three";

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
    const speed = 1.5;
    const angle = clock.getElapsedTime() * speed;

    // 기울어진 회전 축 설정 (예: X축에 30도 기울이기)
    const tiltAngle = -Math.PI / 4; // 30도
    const rotationMatrix = new Matrix4().makeRotationX(tiltAngle);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const originalPosition = new Vector3(x, 0, z);
    const tiltedPosition = originalPosition.applyMatrix4(rotationMatrix);
    meshRef.current.position.set(
      tiltedPosition.x,
      tiltedPosition.y,
      tiltedPosition.z
    );

    // 비행기의 회전을 기울어진 축에 맞추기
    const direction = new Vector3(-Math.sin(angle), 0, Math.cos(angle))
      .applyMatrix4(rotationMatrix)
      .normalize();

    const lookAt = new Vector3().addVectors(tiltedPosition, direction);

    meshRef.current.lookAt(lookAt);
    meshRef.current.rotateX(Math.PI / 2);
  });

  return (
    <mesh ref={meshRef}>
      <coneGeometry args={[0.5, 1.5, 6]} />
      <meshStandardMaterial color="red" />
    </mesh>
  );
};

const Axes = () => {
  const axesRef = useRef<AxesHelper>(null);

  return <primitive ref={axesRef} object={new AxesHelper(20)} />;
};

export default function Globe() {
  return (
    <Canvas
      style={{
        height: "500px",
      }}
      camera={{ position: [5, 5, 7], fov: 60 }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1.2} castShadow />
      <directionalLight
        position={[2, 2, -5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <Earth />
      <Airplane />
      <Axes />
    </Canvas>
  );
}
