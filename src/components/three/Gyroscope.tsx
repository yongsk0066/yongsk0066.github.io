import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line, Html } from "@react-three/drei";
import { useRef, useState } from "react";
import * as THREE from "three";

function Band({
  color,
  radius,
  width = 0.2,
  thickness = 0.03,
}: {
  color: string;
  radius: number;
  width?: number;
  thickness?: number;
}) {
  const segments = 64;
  const shape = new THREE.Shape();

  shape.moveTo(-width / 2, -thickness / 2);
  shape.lineTo(width / 2, -thickness / 2);
  shape.lineTo(width / 2, thickness / 2);
  shape.lineTo(-width / 2, thickness / 2);
  shape.closePath();

  const extrudeSettings = {
    steps: segments,
    bevelEnabled: false,
    extrudePath: new THREE.CatmullRomCurve3(
      Array.from({ length: segments + 1 }, (_, i) => {
        const angle = (i / segments) * Math.PI * 2;
        return new THREE.Vector3(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          0
        );
      }),
      true
    ),
  };

  return (
    <mesh>
      <extrudeGeometry args={[shape, extrudeSettings]} />
      <meshStandardMaterial color={color} side={THREE.DoubleSide} />
    </mesh>
  );
}

function AxisRod({
  color,
  start,
  end,
}: {
  color: string;
  start: [number, number, number];
  end: [number, number, number];
}) {
  const [x1, y1, z1] = start;
  const [x2, y2, z2] = end;

  const length = Math.sqrt((x2-x1)**2 + (y2-y1)**2 + (z2-z1)**2);
  const center: [number, number, number] = [(x1+x2)/2, (y1+y2)/2, (z1+z2)/2];

  const direction = new THREE.Vector3(x2-x1, y2-y1, z2-z1).normalize();
  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  const euler = new THREE.Euler().setFromQuaternion(quaternion);

  return (
    <mesh position={center} rotation={euler}>
      <cylinderGeometry args={[0.035, 0.035, length, 16]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function Mount({ color, position }: { color: string; position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.06, 16, 16]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function RotationAxis({
  color,
  direction,
  length,
  highlighted = false,
}: {
  color: string;
  direction: 'x' | 'y' | 'z';
  length: number;
  highlighted?: boolean;
}) {
  const points: [number, number, number][] =
    direction === 'x' ? [[-length, 0, 0], [length, 0, 0]] :
    direction === 'y' ? [[0, -length, 0], [0, length, 0]] :
                        [[0, 0, -length], [0, 0, length]];

  return (
    <Line
      points={points}
      color={highlighted ? "#ffffff" : color}
      lineWidth={highlighted ? 3 : 1}
      transparent
      opacity={highlighted ? 1 : 0.6}
    />
  );
}

function Arrow() {
  return (
    <group>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.24, 16]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
      <mesh position={[0, 0.32, 0]}>
        <coneGeometry args={[0.1, 0.16, 16]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.08, 16]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
    </group>
  );
}

// 짐벌락 지표 UI
function GimbalLockIndicator({
  pitchDeg,
  gimbalLockIndex,
  axisAngle
}: {
  pitchDeg: number;
  gimbalLockIndex: number;
  axisAngle: number;
}) {
  const isLocked = gimbalLockIndex > 0.95;

  return (
    <Html position={[0, 2.5, 0]} center>
      <div style={{
        background: isLocked ? 'rgba(239, 68, 68, 0.9)' : 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '12px 16px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '12px',
        minWidth: '200px',
        border: isLocked ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.2)',
        transition: 'all 0.3s ease',
      }}>
        <div style={{
          fontWeight: 'bold',
          marginBottom: '8px',
          color: isLocked ? '#fbbf24' : '#22c55e',
          fontSize: '14px'
        }}>
          {isLocked ? '⚠️ GIMBAL LOCK!' : '✓ Normal'}
        </div>
        <div style={{ marginBottom: '4px' }}>
          <span style={{ color: '#22c55e' }}>Pitch:</span> {pitchDeg.toFixed(1)}°
        </div>
        <div style={{ marginBottom: '4px' }}>
          <span style={{ color: '#ef4444' }}>Yaw</span>-<span style={{ color: '#3b82f6' }}>Roll</span> Angle: {axisAngle.toFixed(1)}°
        </div>
        <div style={{ marginBottom: '8px' }}>
          <span style={{ color: '#fbbf24' }}>Lock Index:</span> {(gimbalLockIndex * 100).toFixed(1)}%
        </div>
        {/* 프로그레스 바 */}
        <div style={{
          width: '100%',
          height: '8px',
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${gimbalLockIndex * 100}%`,
            height: '100%',
            background: gimbalLockIndex > 0.8 ? '#ef4444' : gimbalLockIndex > 0.5 ? '#fbbf24' : '#22c55e',
            transition: 'all 0.1s ease'
          }} />
        </div>
      </div>
    </Html>
  );
}

function Gyroscope3D() {
  const outerRef = useRef<THREE.Group>(null);
  const middleRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);

  const [pitchDeg, setPitchDeg] = useState(0);
  const [gimbalLockIndex, setGimbalLockIndex] = useState(0);
  const [axisAngle, setAxisAngle] = useState(90);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // 빨강 (Yaw): Y축 회전
    if (outerRef.current) {
      outerRef.current.rotation.y += delta * 0.4;
    }

    // 초록 (Pitch): 0° → 90° → 유지 → 0° 반복
    // 짐벌락 상태에서 더 오래 머무르도록
    if (middleRef.current) {
      const cycle = (t % 16) / 16; // 16초 주기
      let pitchAngle: number;

      if (cycle < 0.25) {
        // 0~4초: 0°에서 90°로 상승
        pitchAngle = (cycle / 0.25) * Math.PI / 2;
      } else if (cycle < 0.625) {
        // 4~10초: 90° 유지 (짐벌락 상태!)
        pitchAngle = Math.PI / 2;
      } else {
        // 10~16초: 90°에서 0°로 하강
        pitchAngle = (1 - (cycle - 0.625) / 0.375) * Math.PI / 2;
      }

      middleRef.current.rotation.x = pitchAngle;

      // 짐벌락 지표 계산
      const degrees = (pitchAngle * 180) / Math.PI;
      const lockIndex = Math.abs(Math.sin(pitchAngle));
      const yawRollAngle = 90 - degrees; // Yaw-Roll 축 사이 각도

      setPitchDeg(degrees);
      setGimbalLockIndex(lockIndex);
      setAxisAngle(Math.abs(yawRollAngle));
    }

    // 파랑 (Roll): Z축 회전
    if (innerRef.current) {
      innerRef.current.rotation.z += delta * 0.6;
    }
  });

  const outerRadius = 1.6;
  const middleRadius = 1.25;
  const innerRadius = 0.9;

  const isNearLock = gimbalLockIndex > 0.9;

  return (
    <group>
      {/* 짐벌락 지표 UI */}
      <GimbalLockIndicator
        pitchDeg={pitchDeg}
        gimbalLockIndex={gimbalLockIndex}
        axisAngle={axisAngle}
      />

      {/* 빨강의 Y축 회전축 - 외부 고정 */}
      <RotationAxis
        color="#ef4444"
        direction="y"
        length={outerRadius * 1.3}
        highlighted={isNearLock}
      />

      {/* === OUTER (Red) - Yaw === */}
      <group ref={outerRef}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          <Band color="#ef4444" radius={outerRadius} />
        </group>

        <AxisRod color="#ef4444" start={[0, 0, outerRadius]} end={[0, 0, middleRadius]} />
        <AxisRod color="#ef4444" start={[0, 0, -outerRadius]} end={[0, 0, -middleRadius]} />

        <Mount color="#ef4444" position={[0, 0, middleRadius]} />
        <Mount color="#ef4444" position={[0, 0, -middleRadius]} />

        {/* 초록의 X축 회전축 */}
        <RotationAxis color="#22c55e" direction="x" length={middleRadius * 1.3} />

        {/* === MIDDLE (Green) - Pitch === */}
        <group ref={middleRef}>
          <group rotation={[0, Math.PI / 2, 0]}>
            <Band color="#22c55e" radius={middleRadius} />
          </group>

          <AxisRod color="#22c55e" start={[0, middleRadius, 0]} end={[0, innerRadius, 0]} />
          <AxisRod color="#22c55e" start={[0, -middleRadius, 0]} end={[0, -innerRadius, 0]} />

          <Mount color="#22c55e" position={[0, innerRadius, 0]} />
          <Mount color="#22c55e" position={[0, -innerRadius, 0]} />

          {/* 파랑의 Z축 회전축 - 짐벌락시 Y축(빨강)과 정렬됨 */}
          <RotationAxis
            color="#3b82f6"
            direction="z"
            length={innerRadius * 1.3}
            highlighted={isNearLock}
          />

          {/* === INNER (Blue) - Roll === */}
          <group ref={innerRef}>
            <Band color="#3b82f6" radius={innerRadius} />

            <AxisRod color="#3b82f6" start={[innerRadius, 0, 0]} end={[0.15, 0, 0]} />
            <AxisRod color="#3b82f6" start={[-innerRadius, 0, 0]} end={[-0.15, 0, 0]} />

            <Mount color="#3b82f6" position={[0.15, 0, 0]} />
            <Mount color="#3b82f6" position={[-0.15, 0, 0]} />

            <Arrow />
          </group>
        </group>
      </group>
    </group>
  );
}

export default function Gyroscope() {
  return (
    <div style={{ width: "100%", height: "450px" }}>
      <Canvas
        camera={{ position: [2.5, 2, 2.5], fov: 50 }}
        gl={{ alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.4} />
        <Gyroscope3D />
        <OrbitControls enableZoom={true} enablePan={false} />
      </Canvas>
    </div>
  );
}
