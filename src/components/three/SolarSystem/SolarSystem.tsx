import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import { degreesToRadians, mix, progress } from "popmotion";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type LegacyRef,
} from "react";
import type { Line, Mesh } from "three";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPixelatedPass } from "three/addons/postprocessing/RenderPixelatedPass.js";
import "./styles.css";
import { Text } from "@react-three/drei";

extend({ EffectComposer, RenderPixelatedPass, OutputPass });

function subscribe(callback: (this: Window, ev: UIEvent) => void) {
  window.addEventListener("resize", callback);
  return () => {
    window.removeEventListener("resize", callback);
  };
}

const useRatio = () => {
  const windowSize = useSyncExternalStore(subscribe, () => window.innerWidth);
  return Math.min(728, windowSize) / 1800;
};

// Common variables
const EARTH_ORBIT_RADIUS = 10;
const MOON_ORBIT_RADIUS = 3;
const EARTH_ROTATION_SPEED = 0.08;
const MOON_ROTATION_SPEED = 0.8;

const Sun = () => {
  const ratio = useRatio();
  const ref = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y += 0.001;
      ref.current.rotation.x += 0.002;
      ref.current.rotation.z += 0.002;
    }
  });

  return (
    <>
      {hovered && (
        <Text color="black" fontSize={1.2 * ratio} position={[0, 4 * ratio, 0]}>
          앗! 뜨거!
        </Text>
      )}
      <mesh
        ref={ref}
        rotation-x={0.35}
        onClick={() => {}}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <icosahedronGeometry args={[3 * ratio, 0]} />
        <meshPhongMaterial
          color={"#ff9500"}
          emissive="#df842f"
          shininess={20}
          specular="#ffffff"
        />
      </mesh>
    </>
  );
};

const Earth = () => {
  const ratio = useRatio();
  const ref = useRef<Mesh>(null);
  const trailRef = useRef<Line | null>(null);
  const trailPositions = useRef<THREE.Vector3[]>([]);
  const [shaderMaterial, setShaderMaterial] =
    useState<THREE.ShaderMaterial | null>(null);

  useEffect(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        green: { value: new THREE.Color("#29ce00") },
        blue: { value: new THREE.Color("#1975fe") },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normal;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 green;
        uniform vec3 blue;
        varying vec3 vNormal;
        
        void main() {
          float faceType = step(0.5, abs(vNormal.y));
          vec3 color = mix(green, blue, faceType);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
    setShaderMaterial(material);
  }, []);

  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.getElapsedTime();
      const x = Math.cos(t * EARTH_ROTATION_SPEED) * EARTH_ORBIT_RADIUS * ratio;
      const z = Math.sin(t * EARTH_ROTATION_SPEED) * EARTH_ORBIT_RADIUS * ratio;
      ref.current.position.set(x, 0, z);
      ref.current.rotation.y += 0.01;

      // Update trail
      trailPositions.current.push(new THREE.Vector3(x, 0, z));
      if (trailPositions.current.length > 4000 * ratio) {
        trailPositions.current.shift();
      }

      if (trailRef.current) {
        trailRef.current.geometry.setFromPoints(trailPositions.current);
      }
    }
  });

  return (
    <>
      <mesh ref={ref} castShadow receiveShadow>
        <dodecahedronGeometry args={[1.2 * ratio, 0]} />
        {shaderMaterial && (
          <primitive object={shaderMaterial} attach="material" />
        )}
      </mesh>
      <line ref={trailRef as unknown as LegacyRef<SVGLineElement>}>
        <bufferGeometry />
        <lineBasicMaterial color="black" opacity={0.6} transparent={true} />
      </line>
    </>
  );
};

const Moon = () => {
  const ratio = useRatio();
  const ref = useRef<Mesh>(null);
  const trailRef = useRef<Line>(null);
  const trailPositions = useRef<THREE.Vector3[]>([]);

  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.getElapsedTime();
      const earthX =
        Math.cos(t * EARTH_ROTATION_SPEED) * EARTH_ORBIT_RADIUS * ratio;
      const earthZ =
        Math.sin(t * EARTH_ROTATION_SPEED) * EARTH_ORBIT_RADIUS * ratio;
      const x =
        earthX + Math.cos(t * MOON_ROTATION_SPEED) * MOON_ORBIT_RADIUS * ratio;
      const z =
        earthZ + Math.sin(t * MOON_ROTATION_SPEED) * MOON_ORBIT_RADIUS * ratio;

      ref.current.position.set(x, 0, z);

      trailPositions.current.push(new THREE.Vector3(x, 0, z));
      if (trailPositions.current.length > 500 * ratio) {
        trailPositions.current.shift();
      }

      if (trailRef.current) {
        trailRef.current.geometry.setFromPoints(trailPositions.current);
      }
    }
  });

  return (
    <>
      <mesh ref={ref} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.6 * ratio, 0]} />
        <meshPhongMaterial
          color={"#727272"}
          shininess={10}
          specular="#ffffff"
        />
      </mesh>
      <line ref={trailRef as unknown as LegacyRef<SVGLineElement>}>
        <bufferGeometry />
        <lineBasicMaterial color="black" opacity={0.8} transparent={true} />
      </line>
    </>
  );
};

const Star = ({ p }: { p: number }) => {
  const ratio = useRatio();
  const ref = useRef<null | Mesh>(null);

  useLayoutEffect(() => {
    const distance = mix(12 * ratio, 15 * ratio, Math.random());
    const yAngle = mix(
      degreesToRadians(88),
      degreesToRadians(93),
      Math.random()
    );
    const xAngle = degreesToRadians(360) * p;
    ref.current?.position.setFromSphericalCoords(distance, yAngle, xAngle);
  });

  const vertexWidth = 0.1 * ratio;

  return (
    <mesh ref={ref}>
      <boxGeometry args={[vertexWidth, vertexWidth, vertexWidth]} />
      <meshBasicMaterial color={"#696969"} />
    </mesh>
  );
};

const Spaceship = () => {
  const ratio = useRatio();
  const meshRef = useRef<Mesh>(null);
  const trailRef = useRef<Line>(null);
  const trailPositions = useRef<THREE.Vector3[]>([]);
  const [state, setState] = useState("toMoon"); // "toMoon", "onMoon", "toEarth"
  const stateStartTime = useRef(0);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    const t = clock.getElapsedTime();
    const earthX =
      Math.cos(t * EARTH_ROTATION_SPEED) * EARTH_ORBIT_RADIUS * ratio;
    const earthZ =
      Math.sin(t * EARTH_ROTATION_SPEED) * EARTH_ORBIT_RADIUS * ratio;
    const moonX =
      earthX + Math.cos(t * MOON_ROTATION_SPEED) * MOON_ORBIT_RADIUS * ratio;
    const moonZ =
      earthZ + Math.sin(t * MOON_ROTATION_SPEED) * MOON_ORBIT_RADIUS * ratio;

    let progress = 0;
    let startPos = new THREE.Vector3();
    let endPos = new THREE.Vector3();

    switch (state) {
      case "toMoon":
        progress = (t - stateStartTime.current) / 4; // 4 seconds to reach the moon
        startPos.set(earthX, 0, earthZ);
        endPos.set(moonX, 0, moonZ);
        if (progress >= 1) {
          setState("onMoon");
          stateStartTime.current = t;
        }
        break;
      case "onMoon":
        if (t - stateStartTime.current >= 1) {
          setState("toEarth");
          stateStartTime.current = t;
        }
        startPos.set(moonX, 0, moonZ);
        endPos.set(moonX, 0, moonZ);
        progress = 1;
        break;
      case "toEarth":
        progress = (t - stateStartTime.current) / 4; // 4 seconds to return to Earth
        startPos.set(moonX, 0, moonZ);
        endPos.set(earthX, 0, earthZ);
        if (progress >= 1) {
          setState("toMoon");
          stateStartTime.current = t;
        }
        break;
    }

    // Calculate position
    const position = new THREE.Vector3().lerpVectors(
      startPos,
      endPos,
      progress
    );

    // Add vertical arc
    position.y = Math.sin(progress * Math.PI) * 4 * ratio;

    // Apply position
    meshRef.current.position.copy(position);

    // Calculate direction
    const direction = new THREE.Vector3()
      .subVectors(endPos, startPos)
      .normalize();
    direction.y =
      (Math.cos(progress * Math.PI) * 4 * ratio) /
      position.distanceTo(startPos);
    direction.normalize();

    // Apply rotation
    const up = new THREE.Vector3(0, 1, 0);
    meshRef.current.quaternion.setFromUnitVectors(up, direction);

    // Update trail
    trailPositions.current.push(position.clone());
    if (trailPositions.current.length > 3000 * ratio) {
      trailPositions.current.shift();
    }

    if (trailRef.current) {
      (trailRef.current?.geometry as THREE.BufferGeometry).setFromPoints(
        trailPositions.current
      );
    }
  });

  return (
    <>
      <mesh ref={meshRef}>
        <coneGeometry args={[0.3 * ratio, 1 * ratio, 5]} />
        <meshPhongMaterial color="silver" />
      </mesh>
      <line ref={trailRef as unknown as LegacyRef<SVGLineElement>}>
        <bufferGeometry />
        <lineBasicMaterial color="red" opacity={0.5} transparent={true} />
      </line>
    </>
  );
};

function Scene({ numStars = 300 }) {
  const ratio = useRatio();
  const { gl, scene, camera } = useThree();
  const composer = useRef<EffectComposer>();
  const time = useRef(0);

  useEffect(() => {
    composer.current = new EffectComposer(gl);
    const renderPixelatedPass = new RenderPixelatedPass(
      7 * ratio * 0.7,
      scene,
      camera
    );
    composer.current.addPass(renderPixelatedPass);
    const outputPass = new OutputPass();
    composer.current.addPass(outputPass);
  }, [gl, scene, camera]);

  useFrame((_, delta) => {
    time.current += delta;
    const distance = 19 * ratio;
    const yAngle = degreesToRadians(75 + Math.sin(time.current) * 3);
    const xAngle = time.current * 0.1;

    camera.position.setFromSphericalCoords(distance, yAngle, xAngle);
    camera.updateProjectionMatrix();
    camera.lookAt(0, -4 * ratio, 0);

    composer.current?.render();
  }, 1);

  useLayoutEffect(() => {
    gl.shadowMap.enabled = true;
    gl.setPixelRatio(1);
  }, [gl]);

  const stars = [];
  for (let i = 0; i < numStars; i++) {
    stars.push(<Star key={i} p={progress(0, numStars, i)} />);
  }

  return (
    <>
      <ambientLight intensity={3} color="#8e8475" />
      <directionalLight
        position={[10 * ratio, 10 * ratio, 10 * ratio]}
        intensity={3}
        color="#fffecd"
        castShadow
      />
      <spotLight
        position={[2 * ratio, 2 * ratio, 0]}
        intensity={30}
        color="#ffc100"
        angle={Math.PI / 16}
        penumbra={0.02}
        distance={10 * ratio}
        castShadow
      />
      <Sun />
      <Earth />
      <Moon />
      <Spaceship />

      {stars}
    </>
  );
}

export default function SolarSystem() {
  return (
    <div
      style={{
        width: "100%",
        aspectRatio: "4/3",
      }}
    >
      <Canvas gl={{ antialias: false }}>
        <Scene />
      </Canvas>
    </div>
  );
}
