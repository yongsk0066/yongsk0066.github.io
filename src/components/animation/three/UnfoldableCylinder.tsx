import type { SpringValue } from "@react-spring/three";
import { animated, config, useSpring } from "@react-spring/three";
import { Billboard, Line, OrbitControls, Text } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState, useMemo } from "react";
import type { Group } from "three";
import * as THREE from "three";

// Constants
const CYLINDER_RADIUS = 1;
const CYLINDER_HEIGHT = 4;
const DEFAULT_ANGLE = 30; // Angle in degrees

// Types
interface MathPointProps {
  position?: [number, number, number];
  label?: string;
  labelOffset?: [number, number, number];
}

// MathPoint component for consistent styling of mathematical points
const MathPoint = ({
  position = [0, 0, 0],
  label = "",
  labelOffset = [0.15, 0.15, 0],
}: MathPointProps) => {
  return (
    <group position={position} renderOrder={10}>
      <Billboard>
        {/* Circular dot with white fill and black outline - always faces camera */}
        <mesh renderOrder={10}>
          <circleGeometry args={[0.04, 32]} />
          <meshBasicMaterial color="#ffffff" depthTest={false} />
        </mesh>
        {/* Black ring for outline */}
        <mesh renderOrder={11}>
          <ringGeometry args={[0.037, 0.043, 32]} />
          <meshBasicMaterial color="#000000" depthTest={false} />
        </mesh>
      </Billboard>
      {label && (
        <Billboard
          position={labelOffset}
          follow={true}
          lockX={false}
          lockY={false}
          lockZ={false}
        >
          <Text
            color="#000000"
            fontSize={0.15}
            anchorX="left"
            anchorY="middle"
            renderOrder={12}
            material={new THREE.MeshBasicMaterial({ depthTest: false })}
          >
            {label}
          </Text>
        </Billboard>
      )}
    </group>
  );
};

// Helper function to create cylinder points around the circumference
const createCylinderPoints = (
  radius: number,
  height: number,
  segments: number
) => {
  const points: THREE.Vector3[][] = [];
  const circumference = 2 * Math.PI * radius;
  const center = height / 2; // 원기둥 중앙 높이

  // Create vertical grid lines (rectangular grid when unfolded)
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    points.push([new THREE.Vector3(x, 0, z), new THREE.Vector3(x, height, z)]);
  }

  // Create horizontal grid lines (circles on cylinder)
  const horizontalLines = 8;
  for (let j = 0; j <= horizontalLines; j++) {
    const y = (j / horizontalLines) * height;
    const circlePoints: THREE.Vector3[] = [];

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      circlePoints.push(new THREE.Vector3(x, y, z));
    }

    points.push(circlePoints);
  }

  // 특별히 원기둥 중앙 높이의 원을 표시하기 위한 포인트 추가
  const centerCirclePoints: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    centerCirclePoints.push(new THREE.Vector3(x, center, z));
  }
  points.push(centerCirclePoints);

  return points;
};

// Calculate the ellipse when the cylinder is intersected by a plane
const calculateEllipsePoints = (
  radius: number,
  height: number,
  angle: number,
  segments: number
) => {
  const points: THREE.Vector3[] = [];
  const angleRad = THREE.MathUtils.degToRad(angle);
  const center = height / 2;

  // The plane is rotated around X axis by angleRad
  const normal = new THREE.Vector3(0, Math.cos(angleRad), Math.sin(angleRad));

  // Plane equation: normal·(x,y,z) = normal·(0,center,0)
  const d = normal.dot(new THREE.Vector3(0, center, 0));

  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const x = Math.cos(t) * radius;
    const z = Math.sin(t) * radius;

    // Calculate y by solving the plane equation:
    // normal.x * x + normal.y * y + normal.z * z = d
    // y = (d - normal.x * x - normal.z * z) / normal.y
    const y = (d - normal.x * x - normal.z * z) / normal.y;

    // Add point to the intersection curve
    points.push(new THREE.Vector3(x, y, z));
  }

  return points;
};

// Calculate the ellipse points in unfolded 2D space
const calculateUnfoldedEllipsePoints = (
  radius: number,
  height: number,
  angle: number,
  segments: number,
  unfoldProgress: number
) => {
  const ellipsePoints = calculateEllipsePoints(radius, height, angle, segments);
  const circumference = 2 * Math.PI * radius;
  const transformedPoints: THREE.Vector3[] = [];

  for (const point of ellipsePoints) {
    // Calculate the angle around the cylinder
    let cylinderAngle = Math.atan2(point.z, point.x);
    if (cylinderAngle < 0) cylinderAngle += Math.PI * 2;

    // Calculate the position in the unfolded rectangle
    const unfoldedX = (cylinderAngle / (Math.PI * 2)) * circumference;

    // Linear interpolation between cylinder and unfolded positions
    const currentX =
      point.x * (1 - unfoldProgress) +
      (unfoldedX - circumference / 2) * unfoldProgress;
    const currentZ = point.z * (1 - unfoldProgress);

    transformedPoints.push(new THREE.Vector3(currentX, point.y, currentZ));
  }

  return transformedPoints;
};

interface UnfoldableCylinderSceneProps {
  sectionAngle?: number;
  unfoldProgress: number;
  viewMode: "cylinder" | "unfolded";
  ellipsePointAngle: number; // 타원 위의 점 P 각도 (0-360도)
}

// 원통좌표계 시각화 컴포넌트
const CylindricalCoordinateSystem = ({ center }: { center: number }) => {
  // 좌표계 원점 위치를 교차면 중앙으로 설정
  const origin: [number, number, number] = [0, center, 0];

  // 좌표축 길이
  const axisLength = 1.5;

  return (
    <group position={origin}>
      {/* 원점 */}
      <mesh>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* r축 (빨간색) - 반지름 방향 */}
      <Line
        points={[
          [0, 0, 0],
          [axisLength, 0, 0],
        ]}
        color="red"
        lineWidth={2}
      />
      <Text
        position={[axisLength + 0.1, 0, 0]}
        color="red"
        fontSize={0.15}
        anchorX="left"
        anchorY="middle"
      >
        r
      </Text>

      {/* θ축 (녹색) - 원주 방향 */}
      <Line
        points={[
          [0, 0, 0],
          [0, 0, axisLength],
        ]}
        color="green"
        lineWidth={2}
      />
      <Text
        position={[0, 0, axisLength + 0.1]}
        color="green"
        fontSize={0.15}
        anchorX="center"
        anchorY="bottom"
      >
        θ
      </Text>

      {/* z축 (파란색) - 높이 방향 */}
      <Line
        points={[
          [0, 0, 0],
          [0, axisLength, 0],
        ]}
        color="blue"
        lineWidth={2}
      />
      <Text
        position={[0, axisLength + 0.1, 0]}
        color="blue"
        fontSize={0.15}
        anchorX="center"
        anchorY="bottom"
      >
        z
      </Text>

      {/* θ 원호 표시 (각도 표시) */}
      <Line
        points={Array.from({ length: 31 }).map((_, i) => {
          const angle = ((i / 30) * Math.PI) / 2;
          return [Math.cos(angle) * 0.5, 0, Math.sin(angle) * 0.5];
        })}
        color="green"
        lineWidth={1.5}
      />
    </group>
  );
};

const UnfoldableCylinderScene = ({
  sectionAngle = DEFAULT_ANGLE,
  unfoldProgress,
  viewMode,
  ellipsePointAngle,
}: UnfoldableCylinderSceneProps) => {
  const cylinderRef = useRef<Group>(null);
  const planeRef = useRef<Group>(null);
  const controlsRef = useRef<any>(null);
  const pointPRef = useRef<Group>(null);

  // Line points state for vertical line from P to center circle
  const [linePToCenterPoints, setLinePToCenterPoints] = useState<
    THREE.Vector3[]
  >([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)]);

  // 선분 중간 위치 계산용 state
  const [lineMidPoint, setLineMidPoint] = useState<THREE.Vector3>(
    new THREE.Vector3(0, 0, 0)
  );

  const segments = 64;
  const center = CYLINDER_HEIGHT / 2;

  // 메모이제이션으로 성능 최적화
  const cylinderPoints = useMemo(
    () => createCylinderPoints(CYLINDER_RADIUS, CYLINDER_HEIGHT, segments),
    [segments]
  );

  const ellipsePoints = useMemo(
    () =>
      calculateEllipsePoints(
        CYLINDER_RADIUS,
        CYLINDER_HEIGHT,
        sectionAngle,
        segments
      ),
    [sectionAngle, segments]
  );

  const unfoldedEllipsePoints = useMemo(
    () =>
      calculateUnfoldedEllipsePoints(
        CYLINDER_RADIUS,
        CYLINDER_HEIGHT,
        sectionAngle,
        segments,
        unfoldProgress
      ),
    [sectionAngle, segments, unfoldProgress]
  );

  const circumference = 2 * Math.PI * CYLINDER_RADIUS;

  // 전개도 크기 계산 - 카메라 설정에 사용
  const rectangleWidth = circumference;
  const rectangleHeight = CYLINDER_HEIGHT;

  // 관측자 포인트들 표시 여부 (성능 향상을 위해 제한)
  const shouldRenderDetailedPoints = useMemo(
    () => viewMode === "cylinder" && segments <= 64,
    [viewMode, segments]
  );

  // 타원 위에 있는 점 P 계산 - 메모이제이션
  const pointP = useMemo(() => {
    // 타원 각도를 라디안으로 변환
    const ellipsePointRadians = THREE.MathUtils.degToRad(ellipsePointAngle);

    // 이미 계산된 타원 점들 중에서 가장 가까운 점을 찾음
    const steps = 64;
    const index = Math.round((ellipsePointRadians / (Math.PI * 2)) * steps);
    const safeIndex = Math.min(Math.max(0, index), ellipsePoints.length - 1);
    return ellipsePoints[safeIndex];
  }, [ellipsePoints, ellipsePointAngle]);

  // 점 P의 전개도에서의 위치 계산 - 메모이제이션
  const pointPPosition = useMemo(() => {
    // 원기둥 각도를 0-2π 범위로 변환
    let cylinderAngle = Math.atan2(pointP.z, pointP.x);
    if (cylinderAngle < 0) cylinderAngle += Math.PI * 2;

    // 전개도에서의 x 좌표 계산
    const unfoldedX = (cylinderAngle / (Math.PI * 2)) * circumference;

    // 진행 상태에 따라 보간
    const currentX =
      pointP.x * (1 - unfoldProgress) +
      (unfoldedX - circumference / 2) * unfoldProgress;
    const currentZ = pointP.z * (1 - unfoldProgress);

    return new THREE.Vector3(currentX, pointP.y, currentZ);
  }, [pointP, unfoldProgress, circumference]);

  // Transform cylinder grid lines based on unfold progress - 메모이제이션
  const transformedLines = useMemo(() => {
    return cylinderPoints.map((line, index) =>
      getTransformedLine(line, index, segments, unfoldProgress, circumference)
    );
  }, [cylinderPoints, segments, unfoldProgress, circumference]);

  // getTransformedLine 함수를 컴포넌트 외부로 이동하고 순수 함수로 만듦
  function getTransformedLine(
    line: THREE.Vector3[],
    index: number,
    segments: number,
    unfoldProgress: number,
    circumference: number
  ) {
    return line.map((point) => {
      // For vertical lines
      if (index < segments + 1) {
        // Calculate the angle around the cylinder
        let cylinderAngle = Math.atan2(point.z, point.x);
        if (cylinderAngle < 0) cylinderAngle += Math.PI * 2;

        // Calculate the position in the unfolded rectangle
        const unfoldedX = (cylinderAngle / (Math.PI * 2)) * circumference;

        // Linear interpolation between cylinder and unfolded positions
        const currentX =
          point.x * (1 - unfoldProgress) +
          (unfoldedX - circumference / 2) * unfoldProgress;
        const currentZ = point.z * (1 - unfoldProgress);

        return new THREE.Vector3(currentX, point.y, currentZ);
      }
      // For horizontal lines
      else {
        // Calculate the angle around the cylinder
        let cylinderAngle = Math.atan2(point.z, point.x);
        if (cylinderAngle < 0) cylinderAngle += Math.PI * 2;

        // Calculate the position in the unfolded rectangle
        const unfoldedX = (cylinderAngle / (Math.PI * 2)) * circumference;

        // Linear interpolation between cylinder and unfolded positions
        const currentX =
          point.x * (1 - unfoldProgress) +
          (unfoldedX - circumference / 2) * unfoldProgress;
        const currentZ = point.z * (1 - unfoldProgress);

        return new THREE.Vector3(currentX, point.y, currentZ);
      }
    });
  }

  // Create filled face for the intersection - 메모이제이션
  const { positions, indices } = useMemo(() => {
    // First calculate center of the ellipse
    let sumX = 0,
      sumY = 0,
      sumZ = 0;
    for (const point of unfoldedEllipsePoints) {
      sumX += point.x;
      sumY += point.y;
      sumZ += point.z;
    }
    const centerX = sumX / unfoldedEllipsePoints.length;
    const centerY = sumY / unfoldedEllipsePoints.length;
    const centerZ = sumZ / unfoldedEllipsePoints.length;

    // Create positions array with perimeter points
    const positions: number[] = [];

    // Add all perimeter points first
    for (const point of unfoldedEllipsePoints) {
      positions.push(point.x, point.y, point.z);
    }

    // Add center point at the end
    positions.push(centerX, centerY, centerZ);
    const centerIndex = unfoldedEllipsePoints.length;

    // Create triangles by connecting adjacent points to center
    const indices: number[] = [];

    // Use more points for a smoother ellipse
    const numPoints = unfoldedEllipsePoints.length;
    for (let i = 0; i < numPoints; i++) {
      // Get current point and next point indices (wrap around to start)
      const currIndex = i;
      const nextIndex = (i + 1) % numPoints;

      // Create a triangle with center and these two points
      indices.push(centerIndex, currIndex, nextIndex);
    }

    return { positions, indices };
  }, [unfoldedEllipsePoints]);

  // P에서 중앙 원까지의 수직선 계산
  useEffect(() => {
    // 원기둥 중앙 높이에 위치한 점 P의 바로 아래(또는 위) 점 계산
    const centralPoint = new THREE.Vector3(
      pointPPosition.x,
      center,
      pointPPosition.z
    );

    // 선분 업데이트
    setLinePToCenterPoints([pointPPosition.clone(), centralPoint]);

    // 선분의 중간 지점 계산 (텍스트 표시 위치)
    setLineMidPoint(
      new THREE.Vector3(
        pointPPosition.x,
        (pointPPosition.y + center) / 2,
        pointPPosition.z
      )
    );
  }, [pointPPosition, center]);

  // 중앙 원에 닿는 점 (P 아래 또는 위의 점)
  const centralPointPosition = useMemo(
    () => new THREE.Vector3(pointPPosition.x, center, pointPPosition.z),
    [pointPPosition, center]
  );

  // 원점에서 P(θ)까지의 선분 (3D 뷰에서만 표시) - 메모이제이션
  const originToPthetaLine = useMemo(
    () =>
      viewMode === "cylinder"
        ? [new THREE.Vector3(0, center, 0), centralPointPosition.clone()]
        : [],
    [viewMode, center, centralPointPosition]
  );

  // 각도 표시를 위한 호 계산 (r축과 P(θ) 사이의 각) - 메모이제이션
  const angleArcPoints = useMemo(() => {
    if (viewMode !== "cylinder") return [];

    // P(θ)의 방위각 계산
    let angle = Math.atan2(centralPointPosition.z, centralPointPosition.x);
    if (angle < 0) angle += Math.PI * 2;

    // 각도 표시를 위한 호 생성 (r축부터 P(θ)까지)
    const arcRadius = 0.4; // 호의 반지름
    const steps = 16; // 단계 수 감소로 성능 향상
    const arcPoints: THREE.Vector3[] = [];

    // 0부터 angle까지 호 그리기
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * angle;
      const x = Math.cos(t) * arcRadius;
      const z = Math.sin(t) * arcRadius;
      arcPoints.push(new THREE.Vector3(x, 0, z));
    }

    return arcPoints.map((p) => p.add(new THREE.Vector3(0, center, 0)));
  }, [viewMode, centralPointPosition, center]);

  // 각도 텍스트 위치 및 값 계산 - 메모이제이션
  const angleTextPosition = useMemo(() => {
    if (viewMode !== "cylinder") return new THREE.Vector3();

    // P(θ)의 방위각 계산 (각도 값)
    let angle = Math.atan2(centralPointPosition.z, centralPointPosition.x);
    if (angle < 0) angle += Math.PI * 2;

    // 각도의 중간 지점에 텍스트 배치
    const arcRadius = 0.45; // 텍스트 위치용 반지름 (호보다 약간 바깥)
    const halfAngle = angle / 2;

    return new THREE.Vector3(
      Math.cos(halfAngle) * arcRadius,
      center,
      Math.sin(halfAngle) * arcRadius
    );
  }, [viewMode, centralPointPosition, center]);

  const angleDegrees = useMemo(
    () =>
      Math.atan2(centralPointPosition.z, centralPointPosition.x) *
      (180 / Math.PI),
    [centralPointPosition]
  );

  const angleDisplay = useMemo(
    () =>
      angleDegrees < 0
        ? (angleDegrees + 360).toFixed(0)
        : angleDegrees.toFixed(0),
    [angleDegrees]
  );

  // Camera control functions
  const { camera } = useThree();

  // 뷰 모드에 따라 카메라 위치 설정
  useEffect(() => {
    if (!controlsRef.current) return;

    if (viewMode === "cylinder") {
      // 3D 원기둥 뷰 (약간 비스듬히)
      camera.position.set(3, 2, 3);
      controlsRef.current.target.set(0, center, 0);

      // 원기둥 뷰에서는 카메라 자유롭게 이동 가능
      controlsRef.current.minAzimuthAngle = -Infinity;
      controlsRef.current.maxAzimuthAngle = Infinity;
      controlsRef.current.minPolarAngle = 0;
      controlsRef.current.maxPolarAngle = Math.PI;
      controlsRef.current.enableZoom = true;
      controlsRef.current.enablePan = true;
    } else {
      // 전개도 뷰 (정면에서)
      camera.position.set(0, center, 20); // 더 멀리 위치
      controlsRef.current.target.set(0, center, 0);

      // 전개도 뷰에서는 카메라 제한 (정면 뷰로 고정)
      controlsRef.current.minAzimuthAngle = 0;
      controlsRef.current.maxAzimuthAngle = 0;
      controlsRef.current.minPolarAngle = Math.PI / 2;
      controlsRef.current.maxPolarAngle = Math.PI / 2;
      controlsRef.current.enableZoom = true; // 줌 활성화
      controlsRef.current.enablePan = true; // 패닝도 활성화
    }

    controlsRef.current.update();
  }, [camera, center, viewMode]);

  // 전개도 뷰에서는 카메라 자동 조정 (모든 콘텐츠가 보이도록)
  useEffect(() => {
    if (viewMode === "unfolded" && camera.type === "OrthographicCamera") {
      // 전개도의 가로, 세로 크기에 맞게 카메라 줌 조정
      // 여백을 포함한 적절한 줌 값 계산
      const orthoCam = camera as THREE.OrthographicCamera;
      const aspectRatio = window.innerWidth / window.innerHeight;

      // 전개도 크기에 약간의 여백을 추가하여 계산
      const padding = 2.0; // 여백을 크게 늘려 더 넓게 보이도록 함
      const targetWidth = rectangleWidth * padding;
      const targetHeight = rectangleHeight * padding;

      // 화면 비율에 따라 너비 또는 높이 기준으로 줌 계산
      let calculatedZoom;
      if (aspectRatio > targetWidth / targetHeight) {
        // 높이가 제한 요소인 경우
        calculatedZoom = window.innerHeight / targetHeight;
      } else {
        // 너비가 제한 요소인 경우
        calculatedZoom = window.innerWidth / targetWidth;
      }

      // 계산된 줌에 추가 스케일 팩터 적용하여 더 크게 보이도록 함
      orthoCam.zoom = calculatedZoom * 0.6; // 스케일 팩터 감소하여 더 넓게 보이도록 함
      orthoCam.updateProjectionMatrix();
    }
  }, [camera, viewMode, rectangleWidth, rectangleHeight]);

  return (
    <>
      {/* Controls */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.1}
        enableZoom={true}
        minZoom={10}
        maxZoom={150}
        target={[0, center, 0]}
      />

      {/* Lighting */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />

      {/* Cylinder grid lines - 메모이제이션된 변환된 라인 사용 */}
      <group ref={cylinderRef}>
        {transformedLines.map((line, index) => (
          <Line
            key={`grid-line-${index}`}
            points={line}
            color={
              // 원기둥 중앙 높이의 원(맨 마지막 추가한 라인)일 경우 초록색으로 표시
              index === cylinderPoints.length - 1
                ? "#00aa00"
                : // 전개도에서 원기둥 중앙 높이의 가로선 초록색으로 표시
                  viewMode === "unfolded" &&
                    index >= segments + 1 &&
                    index < cylinderPoints.length - 1 &&
                    Math.abs(cylinderPoints[index][0].y - center) < 0.01
                  ? "#00aa00"
                  : "#888888"
            }
            lineWidth={
              // 중앙 높이의 원 또는 해당 높이의 가로선일 경우 두껍게 표시
              index === cylinderPoints.length - 1 ||
              (viewMode === "unfolded" &&
                index >= segments + 1 &&
                index < cylinderPoints.length - 1 &&
                Math.abs(cylinderPoints[index][0].y - center) < 0.01)
                ? 2
                : 1
            }
            dashed={index < segments + 1}
            dashSize={0.05}
            gapSize={0.05}
          />
        ))}
      </group>

      {/* Unfolded rectangle outline - only visible when unfolding */}
      {unfoldProgress > 0 && (
        <>
          <Line
            points={[
              new THREE.Vector3(-rectangleWidth / 2, 0, 0),
              new THREE.Vector3(rectangleWidth / 2, 0, 0),
              new THREE.Vector3(rectangleWidth / 2, rectangleHeight, 0),
              new THREE.Vector3(-rectangleWidth / 2, rectangleHeight, 0),
              new THREE.Vector3(-rectangleWidth / 2, 0, 0),
            ]}
            color="black"
            lineWidth={2}
            dashed={false}
            transparent
            opacity={unfoldProgress}
          />

          {/* 원기둥 중앙 높이의 가로선을 초록색으로 추가 (전개도에만 표시) */}
          {viewMode === "unfolded" && (
            <Line
              points={[
                new THREE.Vector3(-rectangleWidth / 2, center, 0),
                new THREE.Vector3(rectangleWidth / 2, center, 0),
              ]}
              color="#00aa00"
              lineWidth={2}
              dashed={false}
              transparent
              opacity={unfoldProgress}
            />
          )}
        </>
      )}

      {/* Intersection ellipse */}
      <Line points={unfoldedEllipsePoints} color="#ff0000" lineWidth={3} />

      {/* Filled ellipse section */}
      <mesh>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={new Float32Array(positions)}
            count={positions.length / 3}
            itemSize={3}
          />
          <bufferAttribute
            attach="index"
            array={new Uint16Array(indices)}
            count={indices.length}
          />
        </bufferGeometry>
        <meshBasicMaterial
          color="#ff0000"
          side={THREE.DoubleSide}
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>

      {/* Section plane - only visible when not fully unfolded */}
      {unfoldProgress < 1 && (
        <group
          ref={planeRef}
          position={[0, center, 0]}
          rotation={[
            Math.PI / 2 + THREE.MathUtils.degToRad(sectionAngle),
            0,
            0,
          ]}
        >
          <mesh>
            <planeGeometry args={[4, 4]} />
            <meshStandardMaterial
              transparent
              opacity={0.05 * (1 - unfoldProgress)}
              side={THREE.DoubleSide}
            />
          </mesh>
          <Line
            points={[
              [-2, -2, 0],
              [2, -2, 0],
              [2, 2, 0],
              [-2, 2, 0],
              [-2, -2, 0],
            ]}
            color="black"
            lineWidth={1}
            transparent
            opacity={1 - unfoldProgress}
          />
        </group>
      )}

      {/* 원통좌표계 표시 - 원기둥 뷰에서만 표시 */}
      {viewMode === "cylinder" && unfoldProgress === 0 && (
        <CylindricalCoordinateSystem center={center} />
      )}

      {/* 원점에서 P(θ)까지의 검정 선분 - 3D 뷰에서만 */}
      {shouldRenderDetailedPoints && (
        <Line points={originToPthetaLine} color="#000000" lineWidth={2} />
      )}

      {/* 각도 표시용 호 - 3D 뷰에서만 */}
      {shouldRenderDetailedPoints && (
        <Line points={angleArcPoints} color="#000000" lineWidth={1.5} />
      )}

      {/* 각도 값 표시 - 3D 뷰에서만 */}
      {shouldRenderDetailedPoints && (
        <Billboard position={angleTextPosition}>
          <Text
            color="#000000"
            fontSize={0.12}
            anchorX="center"
            anchorY="middle"
            renderOrder={12}
            material={new THREE.MeshBasicMaterial({ depthTest: false })}
          >
            {`θ = ${angleDisplay}°`}
          </Text>
        </Billboard>
      )}

      {/* 임의의 점 P 표시 (타원 위에 위치) */}
      <group ref={pointPRef}>
        <MathPoint
          position={[pointPPosition.x, pointPPosition.y, pointPPosition.z]}
          label="P"
          labelOffset={[0.15, 0.15, 0]}
        />
      </group>

      {/* P에서 중앙 원까지의 수직선 (실선으로 변경 및 굵게) */}
      <Line
        points={linePToCenterPoints}
        color="#333333"
        lineWidth={2}
        dashed={false}
      />

      {/* 선분에 이름 및 수식 표시 */}
      {shouldRenderDetailedPoints && (
        <Billboard
          position={lineMidPoint.clone().add(new THREE.Vector3(0.2, 0, 0))}
        >
          <Text
            color="#333333"
            fontSize={0.15}
            anchorX="left"
            anchorY="middle"
            renderOrder={12}
            material={new THREE.MeshBasicMaterial({ depthTest: false })}
          >
            {`h = r·tan(α)·sin(θ)`}
          </Text>
        </Billboard>
      )}

      {/* 중앙 원에 닿는 점 P(θ) 표시 */}
      <MathPoint
        position={[
          centralPointPosition.x,
          centralPointPosition.y,
          centralPointPosition.z,
        ]}
        label="P(θ)"
        labelOffset={[0.15, 0.15, 0]}
      />
    </>
  );
};

export default function UnfoldableCylinder() {
  const [sectionAngle, setSectionAngle] = useState(DEFAULT_ANGLE);
  const [ellipsePointAngle, setEllipsePointAngle] = useState(30); // 초기 타원 각도

  // 각도가 변경될 때의 핸들러 단순화
  const handleAngleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSectionAngle(parseInt(e.target.value));
  };

  // 타원 위의 점 P 각도 변경 핸들러
  const handleEllipsePointAngleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setEllipsePointAngle(parseInt(e.target.value));
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 mb-4 rounded-lg bg-slate-50 dark:bg-slate-800">
        <div className="control-group">
          <div className="flex items-center justify-between">
            <label
              htmlFor="angle-slider"
              className="font-medium text-slate-700 dark:text-slate-300"
            >
              α (단면 각도)
            </label>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {sectionAngle}°
            </span>
          </div>
          <input
            id="angle-slider"
            type="range"
            min="0"
            max="80"
            value={sectionAngle}
            onChange={handleAngleChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 mt-2 accent-blue-500"
          />
        </div>

        <div className="control-group">
          <div className="flex items-center justify-between">
            <label
              htmlFor="ellipse-point-slider"
              className="font-medium text-slate-700 dark:text-slate-300"
            >
              θ (타원 위의 점 P 각도)
            </label>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {ellipsePointAngle}°
            </span>
          </div>
          <input
            id="ellipse-point-slider"
            type="range"
            min="0"
            max="360"
            value={ellipsePointAngle}
            onChange={handleEllipsePointAngleChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 mt-2 accent-blue-500"
            step="5"
          />
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {/* 위: 3D 원기둥 뷰 */}
        <div className="w-full aspect-[4/3] relative border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden">
          <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm font-medium z-10">
            3D 원기둥
          </div>
          <Canvas
            orthographic
            camera={{
              position: [3, 2, 3],
              zoom: 110,
              near: 0.1,
              far: 1000,
            }}
            frameloop="always"
            performance={{ current: 0.8, min: 0.5, max: 1 }}
          >
            <UnfoldableCylinderScene
              key={`cylinder-scene-3d-${sectionAngle}`}
              sectionAngle={sectionAngle}
              unfoldProgress={0}
              viewMode="cylinder"
              ellipsePointAngle={ellipsePointAngle}
            />
          </Canvas>
        </div>

        {/* 아래: 전개도 뷰 */}
        <div className="w-full aspect-[16/9] relative border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden">
          <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm font-medium z-10">
            전개도
          </div>
          <Canvas
            orthographic
            camera={{
              position: [0, CYLINDER_HEIGHT / 2, 20],
              zoom: 30,
              near: 0.1,
              far: 1000,
            }}
            frameloop="always"
            performance={{ current: 0.8, min: 0.5, max: 1 }}
          >
            <UnfoldableCylinderScene
              key={`cylinder-scene-unfolded-${sectionAngle}`}
              sectionAngle={sectionAngle}
              unfoldProgress={1}
              viewMode="unfolded"
              ellipsePointAngle={ellipsePointAngle}
            />
          </Canvas>
        </div>
      </div>
    </div>
  );
}
