import { Line, OrbitControls, Text, Billboard } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { Group, Mesh } from "three";

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

// Helper function to create dashed lines for cylinder - vertical orientation
const createCylinderOutlines = () => {
  const lineSegments: (THREE.Vector3[] | [THREE.Vector3, THREE.Vector3])[] = [];
  const angles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

  angles.forEach((angle) => {
    const radians = THREE.MathUtils.degToRad(angle);
    const x = Math.cos(radians) * CYLINDER_RADIUS;
    const z = Math.sin(radians) * CYLINDER_RADIUS;

    // Create vertical line from bottom to top (along y-axis now)
    lineSegments.push([
      new THREE.Vector3(x, 0, z),
      new THREE.Vector3(x, CYLINDER_HEIGHT, z),
    ]);
  });

  // Create circles for top and bottom
  const circlePoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * Math.PI * 2;
    circlePoints.push(
      new THREE.Vector3(
        Math.cos(angle) * CYLINDER_RADIUS,
        0,
        Math.sin(angle) * CYLINDER_RADIUS
      )
    );
  }
  lineSegments.push(circlePoints);

  const topCirclePoints = circlePoints.map(
    (p) => new THREE.Vector3(p.x, CYLINDER_HEIGHT, p.z)
  );
  lineSegments.push(topCirclePoints);

  return lineSegments;
};

// Helper functions for creating custom sphere wireframe - vertical orientation
const getLongitudePoints = (
  radius: number,
  longitude: number,
  segments: number
): THREE.Vector3[] => {
  const points: THREE.Vector3[] = [];
  const longitudeRad = THREE.MathUtils.degToRad(longitude);

  for (let i = 0; i <= segments; i++) {
    const latitude = (i / segments) * Math.PI;
    points.push(
      new THREE.Vector3(
        radius * Math.sin(latitude) * Math.cos(longitudeRad),
        radius * Math.cos(latitude), // y is up now
        radius * Math.sin(latitude) * Math.sin(longitudeRad) // z is depth now
      )
    );
  }

  return points;
};

const getLatitudePoints = (
  radius: number,
  latitude: number,
  segments: number
): THREE.Vector3[] => {
  const points: THREE.Vector3[] = [];
  const latitudeRad = THREE.MathUtils.degToRad(latitude);

  for (let i = 0; i <= segments; i++) {
    const longitude = (i / segments) * Math.PI * 2;
    points.push(
      new THREE.Vector3(
        radius * Math.sin(latitudeRad) * Math.cos(longitude),
        radius * Math.cos(latitudeRad), // y is up now
        radius * Math.sin(latitudeRad) * Math.sin(longitude) // z is depth now
      )
    );
  }

  return points;
};

interface CylinderSectionSceneProps {
  sectionAngle?: number;
  ellipsePointAngle?: number;
}

const CylinderSectionScene = ({
  sectionAngle = DEFAULT_ANGLE,
  ellipsePointAngle = 0,
}: CylinderSectionSceneProps) => {
  const planeRef = useRef<Group>(null);
  const borderRef = useRef<Group>(null);
  const controlsRef = useRef<any>(null);
  const intersectionFaceRef = useRef<Mesh>(null);
  const upperSphereRef = useRef<Group>(null);
  const lowerSphereRef = useRef<Group>(null);
  const pointPRef = useRef<Group>(null);
  const pointP1Ref = useRef<Group>(null);
  const pointP2Ref = useRef<Group>(null);

  // Line points as state to ensure they're available when rendering
  const [lineP1Points, setLineP1Points] = useState<THREE.Vector3[]>([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 1, 0),
  ]);
  const [lineP2Points, setLineP2Points] = useState<THREE.Vector3[]>([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, -1, 0),
  ]);
  const [linePF1Points, setLinePF1Points] = useState<THREE.Vector3[]>([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 1, 0),
  ]);
  const [linePF2Points, setLinePF2Points] = useState<THREE.Vector3[]>([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, -1, 0),
  ]);
  const [lineS1F1Points, setLineS1F1Points] = useState<THREE.Vector3[]>([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 1, 0),
  ]);
  const [lineS2F2Points, setLineS2F2Points] = useState<THREE.Vector3[]>([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, -1, 0),
  ]);
  const [lineP1S1Points, setLineP1S1Points] = useState<THREE.Vector3[]>([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 1, 0),
  ]);
  const [lineP2S2Points, setLineP2S2Points] = useState<THREE.Vector3[]>([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, -1, 0),
  ]);
  const [lineS1PPoints, setLineS1PPoints] = useState<THREE.Vector3[]>([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 1, 0),
  ]);
  const [lineS2PPoints, setLineS2PPoints] = useState<THREE.Vector3[]>([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, -1, 0),
  ]);
  const [intersectionPoints, setIntersectionPoints] = useState<THREE.Vector3[]>(
    []
  );

  // Convert angle to radians
  const angleRad = THREE.MathUtils.degToRad(sectionAngle);

  // Calculate the center of the cylinder
  const center = CYLINDER_HEIGHT / 2;

  // Cylinder outline dashed lines
  const cylinderOutlines = createCylinderOutlines();

  // Calculate Dandelin spheres positions and radiuses - vertical orientation
  const calculateDandelinSpheres = () => {
    // Radius of the sphere is equal to the cylinder radius
    const sphereRadius = CYLINDER_RADIUS;

    // Calculate the normal vector of the plane - rotated for vertical orientation
    // Now the plane rotates around x-axis, normal changes from (0,1,0) to (0,cos(angle),sin(angle))
    const normal = new THREE.Vector3(0, Math.cos(angleRad), Math.sin(angleRad));
    normal.normalize();

    // For the Dandelin spheres, we need to find points along the cylinder axis (y-axis now)
    // where a sphere with radius equal to the cylinder radius will be tangent to the plane

    // Plane equation: normal·(x,y,z) = d
    // Where d is the distance from origin to plane along normal
    const d = normal.dot(new THREE.Vector3(0, center, 0));

    // Distance from center of sphere to plane must equal radius for tangency
    // Move along the y-axis (cylinder axis) in both directions

    // To find the center positions, we solve:
    // For center (0, y, 0), distance to plane = sphereRadius

    // Distance from y-coordinate to plane along normal = sphereRadius
    const distanceFromCenterToPlane = sphereRadius / normal.y;

    // Upper sphere center (above the plane)
    const upperY = center + distanceFromCenterToPlane;

    // Lower sphere center (below the plane)
    const lowerY = center - distanceFromCenterToPlane;

    // Upper sphere center
    const upperCenter = new THREE.Vector3(0, upperY, 0);

    // Lower sphere center
    const lowerCenter = new THREE.Vector3(0, lowerY, 0);

    // Calculate tangent points (contact points with the plane)
    // The tangent points are along the normal direction from the center
    // Tangent point = center - normal * radius
    const upperTangentPoint = new THREE.Vector3()
      .copy(upperCenter)
      .sub(new THREE.Vector3().copy(normal).multiplyScalar(sphereRadius));

    const lowerTangentPoint = new THREE.Vector3()
      .copy(lowerCenter)
      .add(new THREE.Vector3().copy(normal).multiplyScalar(sphereRadius));

    // Calculate the contact circle between sphere and cylinder
    const calculateContactCircle = (sphereCenter: THREE.Vector3) => {
      const circlePoints: THREE.Vector3[] = [];
      const steps = 64;

      for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const x = Math.cos(angle) * CYLINDER_RADIUS;
        const z = Math.sin(angle) * CYLINDER_RADIUS;
        // The y value is the same as the sphere center's y
        const y = sphereCenter.y;

        circlePoints.push(new THREE.Vector3(x, y, z));
      }

      return circlePoints;
    };

    return {
      upper: {
        center: upperCenter,
        radius: sphereRadius,
        tangentPoint: upperTangentPoint,
        contactCircle: calculateContactCircle(upperCenter),
      },
      lower: {
        center: lowerCenter,
        radius: sphereRadius,
        tangentPoint: lowerTangentPoint,
        contactCircle: calculateContactCircle(lowerCenter),
      },
    };
  };

  const dandelinSpheres = calculateDandelinSpheres();

  // Update geometry when angle changes - vertical orientation
  useEffect(() => {
    if (
      !planeRef.current ||
      !intersectionFaceRef.current ||
      !upperSphereRef.current ||
      !lowerSphereRef.current ||
      !pointPRef.current ||
      !pointP1Ref.current ||
      !pointP2Ref.current
    )
      return;

    // Calculate the intersection between plane and cylinder
    const calculateIntersection = () => {
      const points: THREE.Vector3[] = [];
      const steps = 64;

      // The plane is rotated around X axis by angleRad
      // Start with normal (0,1,0) and rotate around X by angleRad
      const normal = new THREE.Vector3(
        0,
        Math.cos(angleRad),
        Math.sin(angleRad)
      );

      // Position the plane at the center of the cylinder
      // Plane equation: normal·(x,y,z) = normal·(0,center,0)
      const d = normal.dot(new THREE.Vector3(0, center, 0));

      // For each point around the cylinder, calculate intersection
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * Math.PI * 2;
        const x = Math.cos(t) * CYLINDER_RADIUS;
        const z = Math.sin(t) * CYLINDER_RADIUS;

        // Calculate y by solving the plane equation:
        // normal.x * x + normal.y * y + normal.z * z = d
        // y = (d - normal.x * x - normal.z * z) / normal.y
        const y = (d - normal.x * x - normal.z * z) / normal.y;

        // Add point to the intersection curve
        points.push(new THREE.Vector3(x, y, z));
      }

      return points;
    };

    // Get intersection points
    const points = calculateIntersection();
    setIntersectionPoints(points);

    // Update the controls target to the center of the cylinder
    if (controlsRef.current) {
      controlsRef.current.target.set(0, center, 0);
      controlsRef.current.update();
    }

    // Update the plane position and rotation
    planeRef.current.position.set(0, center, 0);
    planeRef.current.rotation.set(Math.PI / 2 + angleRad, 0, 0); // Plane starts horizontal (90 degrees) then rotates opposite direction

    // Update the border position and rotation
    if (borderRef.current) {
      borderRef.current.position.set(0, center, 0);
      borderRef.current.rotation.set(Math.PI / 2 + angleRad, 0, 0); // Same rotation as plane
    }

    // Create filled face for the intersection
    // First calculate center of the ellipse
    let sumX = 0,
      sumY = 0,
      sumZ = 0;
    for (const point of points) {
      sumX += point.x;
      sumY += point.y;
      sumZ += point.z;
    }
    const centerX = sumX / points.length;
    const centerY = sumY / points.length;
    const centerZ = sumZ / points.length;

    // Create positions array with perimeter points
    const positions: number[] = [];

    // Add all perimeter points first
    for (const point of points) {
      positions.push(point.x, point.y, point.z);
    }

    // Add center point at the end
    positions.push(centerX, centerY, centerZ);
    const centerIndex = points.length;

    // Create triangles by connecting adjacent points to center
    const indices: number[] = [];

    // Use more points for a smoother ellipse
    const numPoints = points.length;
    for (let i = 0; i < numPoints; i++) {
      // Get current point and next point indices (wrap around to start)
      const currIndex = i;
      const nextIndex = (i + 1) % numPoints;

      // Create a triangle with center and these two points
      indices.push(centerIndex, currIndex, nextIndex);
    }

    // Create buffer geometry with these positions and indices
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.setIndex(indices);

    // Ensure proper normals
    geometry.computeVertexNormals();

    // Update the intersection mesh with new geometry
    intersectionFaceRef.current.geometry.dispose();
    intersectionFaceRef.current.geometry = geometry;

    // Calculate the position of point P on the ellipse
    const ellipsePointRadians = THREE.MathUtils.degToRad(ellipsePointAngle);
    const calculatePointOnEllipse = () => {
      // Use the ellipse points that we already calculated
      const intersectionPoints = calculateIntersection();
      // Since we have discrete points and not a continuous ellipse, find the closest point
      // by checking the angle around the ellipse
      const steps = 64;
      const index = Math.round((ellipsePointRadians / (Math.PI * 2)) * steps);
      const safeIndex = Math.min(
        Math.max(0, index),
        intersectionPoints.length - 1
      );
      return intersectionPoints[safeIndex];
    };

    // Get the position of point P
    const pointP = calculatePointOnEllipse();

    // Update the position of point P
    pointPRef.current.position.copy(pointP);

    // Calculate positions of points P1 and P2
    // These are the points on the contact circles that form a vertical line with P
    const p1Position = new THREE.Vector3(
      pointP.x,
      dandelinSpheres.upper.center.y,
      pointP.z
    );

    const p2Position = new THREE.Vector3(
      pointP.x,
      dandelinSpheres.lower.center.y,
      pointP.z
    );

    // Update positions of P1 and P2
    pointP1Ref.current.position.copy(p1Position);
    pointP2Ref.current.position.copy(p2Position);

    // Update the lines connecting P to P1 and P to P2
    setLineP1Points([pointP.clone(), p1Position.clone()]);
    setLineP2Points([pointP.clone(), p2Position.clone()]);

    // Update the lines connecting P to F1 and F2 (focal points)
    setLinePF1Points([
      pointP.clone(),
      dandelinSpheres.upper.tangentPoint.clone(),
    ]);
    setLinePF2Points([
      pointP.clone(),
      dandelinSpheres.lower.tangentPoint.clone(),
    ]);

    // Update the lines connecting sphere centers (S1, S2) to focal points (F1, F2)
    setLineS1F1Points([
      dandelinSpheres.upper.center.clone(),
      dandelinSpheres.upper.tangentPoint.clone(),
    ]);
    setLineS2F2Points([
      dandelinSpheres.lower.center.clone(),
      dandelinSpheres.lower.tangentPoint.clone(),
    ]);

    // Update the lines connecting P1 to S1 and P2 to S2
    setLineP1S1Points([
      p1Position.clone(),
      dandelinSpheres.upper.center.clone(),
    ]);
    setLineP2S2Points([
      p2Position.clone(),
      dandelinSpheres.lower.center.clone(),
    ]);

    // Update the lines connecting S1 to P and S2 to P
    setLineS1PPoints([dandelinSpheres.upper.center.clone(), pointP.clone()]);
    setLineS2PPoints([dandelinSpheres.lower.center.clone(), pointP.clone()]);
  }, [sectionAngle, angleRad, center, ellipsePointAngle]);

  // Camera control functions
  const { camera } = useThree();

  // View from -X axis direction (side view)
  const viewFromXAxis = () => {
    if (!controlsRef.current) return;

    // Position camera along -X axis
    camera.position.set(-5, center, 0);

    // Update the controls target to the center of the cylinder
    controlsRef.current.target.set(0, center, 0);
    controlsRef.current.update();
  };

  // Expose method to parent via window
  useEffect(() => {
    // Make the function available to parent component
    (window as any).__viewFromXAxis = viewFromXAxis;
  }, [center]);

  return (
    <>
      {/* Controls */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.1}
        enableZoom={true}
        minZoom={30}
        maxZoom={120}
        target={[0, center, 0]}
      />

      {/* Lighting */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />

      {/* Cylinder outlines - dashed lines */}
      {cylinderOutlines.map((points, i) => (
        <Line
          key={i}
          points={points}
          color="magenta"
          lineWidth={1}
          dashed={i < cylinderOutlines.length - 2} // Dash only vertical lines
          dashSize={0.2}
          gapSize={0.1}
        />
      ))}

      {/* Invisible cylinder for hit detection - vertical orientation */}
      <mesh position={[0, CYLINDER_HEIGHT / 2, 0]} visible={false}>
        <cylinderGeometry
          args={[CYLINDER_RADIUS, CYLINDER_RADIUS, CYLINDER_HEIGHT, 32]}
        />
        <meshStandardMaterial transparent opacity={0} />
      </mesh>

      {/* Section Plane with visible black border */}
      <group ref={planeRef}>
        {/* Section plane - transparent */}
        <mesh>
          <planeGeometry args={[4, 4]} />
          <meshStandardMaterial
            transparent
            opacity={0.05}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* Section plane border - separate for better visibility */}
      <group ref={borderRef}>
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
        />
      </group>

      {/* Intersection Face - Light Blue with better rendering */}
      <mesh ref={intersectionFaceRef}>
        <bufferGeometry />
        <meshBasicMaterial
          color="#0000ff"
          side={THREE.DoubleSide}
          transparent
          opacity={0.3}
          depthWrite={false} /* Helps with transparency issues */
        />
      </mesh>

      {/* Intersection Outline - Clearer Blue (thicker) */}
      {intersectionPoints.length > 1 && (
        <Line points={intersectionPoints} color="#0000ff" lineWidth={2} />
      )}

      {/* Dandelin Spheres - Upper and Lower using custom wireframe approach */}
      <group
        ref={upperSphereRef}
        position={dandelinSpheres.upper.center.toArray()}
      >
        {/* Sphere center point S1 */}
        <MathPoint label="S1" />

        {/* Create custom wireframe sphere with denser lines */}
        {Array.from({ length: 24 }).map((_, i) => (
          <Line
            key={`longitude-${i}`}
            points={getLongitudePoints(
              dandelinSpheres.upper.radius,
              i * 15,
              48
            )}
            color="#aaaaaa"
            lineWidth={0.8}
            dashed={false}
          />
        ))}
        {Array.from({ length: 12 }).map((_, i) => (
          <Line
            key={`latitude-${i}`}
            points={getLatitudePoints(
              dandelinSpheres.upper.radius,
              (i + 1) * 15,
              48
            )}
            color="#aaaaaa"
            lineWidth={0.8}
            dashed={false}
          />
        ))}
      </group>

      <group
        ref={lowerSphereRef}
        position={dandelinSpheres.lower.center.toArray()}
      >
        {/* Sphere center point S2 */}
        <MathPoint label="S2" />

        {/* Create custom wireframe sphere with denser lines */}
        {Array.from({ length: 24 }).map((_, i) => (
          <Line
            key={`longitude-${i}`}
            points={getLongitudePoints(
              dandelinSpheres.lower.radius,
              i * 15,
              48
            )}
            color="#aaaaaa"
            lineWidth={0.8}
            dashed={false}
          />
        ))}
        {Array.from({ length: 12 }).map((_, i) => (
          <Line
            key={`latitude-${i}`}
            points={getLatitudePoints(
              dandelinSpheres.lower.radius,
              (i + 1) * 15,
              48
            )}
            color="#aaaaaa"
            lineWidth={0.8}
            dashed={false}
          />
        ))}
      </group>

      {/* Contact circles for Dandelin spheres */}
      {dandelinSpheres.upper.contactCircle.length > 1 && (
        <Line
          points={dandelinSpheres.upper.contactCircle}
          color="#ff8800"
          lineWidth={2}
        />
      )}

      {dandelinSpheres.lower.contactCircle.length > 1 && (
        <Line
          points={dandelinSpheres.lower.contactCircle}
          color="#ff8800"
          lineWidth={2}
        />
      )}

      {/* Focal points (tangent points) */}
      <MathPoint
        position={
          dandelinSpheres.upper.tangentPoint.toArray() as [
            number,
            number,
            number,
          ]
        }
        label="F1"
      />

      <MathPoint
        position={
          dandelinSpheres.lower.tangentPoint.toArray() as [
            number,
            number,
            number,
          ]
        }
        label="F2"
      />

      {/* Point P on the ellipse */}
      <group ref={pointPRef}>
        <MathPoint label="P" />
      </group>

      {/* Lines connecting P to P1 and P to P2 */}
      {lineP1Points.length > 1 && (
        <Line points={lineP1Points} color="#cc0000" lineWidth={3} />
      )}

      {lineP2Points.length > 1 && (
        <Line points={lineP2Points} color="#cc0000" lineWidth={3} />
      )}

      {/* Points P1 and P2 on the contact circles */}
      <group ref={pointP1Ref}>
        <MathPoint label="P1" />
      </group>

      <group ref={pointP2Ref}>
        <MathPoint label="P2" />
      </group>

      {/* Lines connecting P to F1 and F2 (focal points) */}
      {linePF1Points.length > 1 && (
        <Line points={linePF1Points} color="#cc0000" lineWidth={3} />
      )}

      {linePF2Points.length > 1 && (
        <Line points={linePF2Points} color="#cc0000" lineWidth={3} />
      )}

      {/* Lines connecting sphere centers to focal points */}
      {lineS1F1Points.length > 1 && (
        <Line points={lineS1F1Points} color="#FFA500" lineWidth={1.5} />
      )}

      {lineS2F2Points.length > 1 && (
        <Line points={lineS2F2Points} color="#FFA500" lineWidth={1.5} />
      )}

      {/* Lines connecting P1 to S1 and P2 to S2 */}
      {lineP1S1Points.length > 1 && (
        <Line points={lineP1S1Points} color="#00AA00" lineWidth={1.5} />
      )}

      {lineP2S2Points.length > 1 && (
        <Line points={lineP2S2Points} color="#00AA00" lineWidth={1.5} />
      )}

      {/* Lines connecting S1 to P and S2 to P (only visible when P is at 90 degrees) */}
      {ellipsePointAngle === 90 && lineS1PPoints.length > 1 && (
        <Line points={lineS1PPoints} color="#00AA00" lineWidth={2} />
      )}

      {ellipsePointAngle === 90 && lineS2PPoints.length > 1 && (
        <Line points={lineS2PPoints} color="#00AA00" lineWidth={2} />
      )}
    </>
  );
};

export default function CylinderSection() {
  const [sectionAngle, setSectionAngle] = useState(DEFAULT_ANGLE);
  const [ellipsePointAngle, setEllipsePointAngle] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Function to handle camera view button
  const handleViewFromXAxis = () => {
    // Set P point position to 90 degrees
    setEllipsePointAngle(90);

    // Call the function exposed on window
    if (typeof (window as any).__viewFromXAxis === "function") {
      (window as any).__viewFromXAxis();
    }
  };

  return (
    <div
      style={{
        width: "100%",
        aspectRatio: "4/3",
      }}
    >
      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="angle-slider">단면 각도: {sectionAngle}°</label>
        <input
          id="angle-slider"
          type="range"
          min="0"
          max="80"
          value={sectionAngle}
          onChange={(e) => setSectionAngle(parseInt(e.target.value))}
          style={{ width: "100%", maxWidth: "300px", marginLeft: "1rem" }}
        />
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="point-slider">점 P 위치: {ellipsePointAngle}°</label>
        <input
          id="point-slider"
          type="range"
          min="0"
          max="360"
          value={ellipsePointAngle}
          onChange={(e) => setEllipsePointAngle(parseInt(e.target.value))}
          style={{ width: "100%", maxWidth: "300px", marginLeft: "1rem" }}
        />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <button
          onClick={handleViewFromXAxis}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          측면에서 보기
        </button>
      </div>

      <Canvas
        ref={canvasRef}
        orthographic
        camera={{
          position: [3, 2, 3], // Adjusted for vertical orientation
          zoom: 60,
          near: 0.1,
          far: 1000,
        }}
      >
        <CylinderSectionScene
          sectionAngle={sectionAngle}
          ellipsePointAngle={ellipsePointAngle}
        />
      </Canvas>
    </div>
  );
}
