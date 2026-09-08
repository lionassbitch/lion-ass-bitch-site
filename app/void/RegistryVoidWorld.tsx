"use client";

import { MeshReflectorMaterial, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  createBrickTexture,
  createDoorNumberTexture,
  createGlyphTexture,
  createRegistryNoticeTexture,
  createStoneTexture,
  createVoidNoticeTexture,
} from "./canvasTextures";

const STREET_Z = 20;
const DOOR_Z = -26;
const STAIR_Z = -32;
const CITY_Z = -56;

function unitNoise(seed: number) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function rainPositions(count: number) {
  const data = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    data[i * 3] = (unitNoise(i + 1) - 0.5) * 11;
    data[i * 3 + 1] = unitNoise(i + 17) * 14;
    data[i * 3 + 2] = THREE.MathUtils.lerp(STREET_Z + 2, DOOR_Z + 2, unitNoise(i + 41));
  }
  return data;
}

function useGeneratedTextures() {
  return useMemo(
    () => ({
      brick: createBrickTexture(),
      stone: createStoneTexture(),
      glyphs: createGlyphTexture(),
      notice: createRegistryNoticeTexture(),
      voidNotice: createVoidNoticeTexture(),
      doorNumber: createDoorNumberTexture(),
    }),
    [],
  );
}

function Windows() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = 70;

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    if (!mesh.current) return;
    let i = 0;
    for (const side of [-1, 1]) {
      for (let row = 0; row < 7; row += 1) {
        for (let col = 0; col < 5; col += 1) {
          const lit = (row + col + side) % 4 !== 0;
          dummy.position.set(side * 4.08, 1.55 + row * 1.42, 16 - col * 7.4 - (row % 2) * 1.1);
          dummy.scale.set(lit ? 0.32 : 0.0001, lit ? 0.5 : 0.0001, 0.04);
          dummy.updateMatrix();
          mesh.current.setMatrixAt(i, dummy.matrix);
          color.set(lit ? (row % 3 === 0 ? "#ffd08a" : "#f0b35a") : "#000000");
          mesh.current.setColorAt(i, color);
          i += 1;
        }
      }
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, []);

  return (
    <instancedMesh castShadow={false} ref={mesh} args={[undefined, undefined, count]}>
      <boxGeometry />
      <meshStandardMaterial
        color="#ffd08a"
        emissive="#ffb347"
        emissiveIntensity={2.4}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

function FireEscape({ side }: { side: number }) {
  return (
    <group position={[side * 3.85, 3.4, 4]}>
      {Array.from({ length: 6 }, (_, index) => (
        <group key={index} position={[0, -index * 1.15, -index * 0.15]}>
          <mesh>
            <boxGeometry args={[1.35, 0.05, 0.9]} />
            <meshStandardMaterial color="#1a1412" metalness={0.7} roughness={0.4} />
          </mesh>
          <mesh position={[side * 0.6, 0.45, 0]}>
            <boxGeometry args={[0.05, 0.9, 0.9]} />
            <meshStandardMaterial color="#211816" metalness={0.65} roughness={0.45} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function StreetLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 3.2, 8]} />
        <meshStandardMaterial color="#1b1612" metalness={0.55} roughness={0.4} />
      </mesh>
      <mesh position={[0, 3.28, 0]}>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshStandardMaterial
          color="#ffd7a0"
          emissive="#ffb14a"
          emissiveIntensity={3.2}
          toneMapped={false}
        />
      </mesh>
      <pointLight color="#ffb14a" distance={9} intensity={3.4} position={[0, 3.2, 0]} />
    </group>
  );
}

function Rain() {
  const ref = useRef<THREE.Points>(null);
  const count = 640;
  const positions = useMemo(() => rainPositions(count), []);

  useFrame((_, delta) => {
    const attr = ref.current?.geometry.getAttribute("position");
    if (!attr) return;
    for (let i = 0; i < count; i += 1) {
      let y = attr.getY(i) - delta * 11;
      if (y < 0) y = 13.5;
      attr.setY(i, y);
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#c9d4e2" opacity={0.32} size={0.03} transparent />
    </points>
  );
}

function TrashBag({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} scale={[0.55, 0.42, 0.5]}>
      <sphereGeometry args={[1, 14, 10]} />
      <meshStandardMaterial color="#0d0c0e" roughness={0.92} />
    </mesh>
  );
}

function Street({ brick }: { brick: THREE.Texture }) {
  const mural = useTexture("/assets/lab-trinity-neon.webp");

  return (
    <group>
      <mesh position={[0, 0, -2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10.4, 50]} />
        <MeshReflectorMaterial
          blur={[280, 80]}
          color="#141010"
          metalness={0.62}
          minDepthThreshold={0.4}
          mixBlur={1}
          mixStrength={42}
          resolution={384}
          roughness={0.28}
        />
      </mesh>

      <mesh position={[-5.4, 6.4, -3]}>
        <boxGeometry args={[2.8, 13, 46]} />
        <meshStandardMaterial color="#3a241c" map={brick} roughness={0.86} />
      </mesh>
      <mesh position={[5.4, 6.4, -3]}>
        <boxGeometry args={[2.8, 13, 46]} />
        <meshStandardMaterial color="#332018" map={brick} roughness={0.88} />
      </mesh>

      <mesh position={[-3.96, 3.6, 8]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[6.4, 4.2]} />
        <meshBasicMaterial map={mural} toneMapped={false} />
      </mesh>

      <Windows />
      <FireEscape side={-1} />
      <FireEscape side={1} />
      <StreetLamp position={[-2.5, 0, 12]} />
      <StreetLamp position={[2.5, 0, 2]} />
      <StreetLamp position={[-2.5, 0, -12]} />
      <Rain />

      <mesh position={[0, 6.6, DOOR_Z - 0.4]}>
        <boxGeometry args={[8.2, 13.4, 1.2]} />
        <meshStandardMaterial color="#2c1c16" map={brick} roughness={0.9} />
      </mesh>
    </group>
  );
}

function Door22({
  brick,
  notice,
  doorNumber,
}: {
  brick: THREE.Texture;
  notice: THREE.Texture;
  doorNumber: THREE.Texture;
}) {
  return (
    <group position={[0, 0, DOOR_Z]}>
      {[-1.15, 0, 1.15].map((x, index) => (
        <mesh key={x} position={[x, 0.12 + index * 0.02, 1.05]}>
          <boxGeometry args={[2.4, 0.16, 0.7]} />
          <meshStandardMaterial color="#3a322c" roughness={0.7} />
        </mesh>
      ))}

      <mesh position={[0, 2.05, 0.42]}>
        <boxGeometry args={[1.55, 3.15, 0.12]} />
        <meshStandardMaterial color="#120e10" roughness={0.62} metalness={0.18} />
      </mesh>
      <mesh position={[0, 3.78, 0.5]}>
        <planeGeometry args={[0.7, 0.36]} />
        <meshBasicMaterial map={doorNumber} transparent />
      </mesh>
      <mesh position={[0, 2.05, 0.5]}>
        <planeGeometry args={[0.72, 1.02]} />
        <meshBasicMaterial map={notice} />
      </mesh>
      <mesh position={[0, 0.08, 0.48]}>
        <boxGeometry args={[1.5, 0.045, 0.08]} />
        <meshStandardMaterial
          color="#d9b6ff"
          emissive="#b56bff"
          emissiveIntensity={6}
          toneMapped={false}
        />
      </mesh>
      <pointLight color="#b56bff" distance={7} intensity={8} position={[0, 0.35, 0.7]} />
      <pointLight color="#9a4dff" distance={10} intensity={5} position={[0, 1.2, -1.4]} />

      <TrashBag position={[-2.15, 0.28, 1.15]} />
      <TrashBag position={[-1.55, 0.22, 1.35]} />
      <mesh position={[-3.1, 1.6, 0.55]}>
        <planeGeometry args={[1.4, 2.1]} />
        <meshStandardMaterial
          color="#ffcf7a"
          emissive="#d89a3a"
          emissiveIntensity={1.4}
          map={brick}
        />
      </mesh>
    </group>
  );
}

function Crystal({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <mesh position={position} scale={scale}>
      <icosahedronGeometry args={[0.42, 0]} />
      <meshStandardMaterial
        color="#5a2d9a"
        emissive="#b56bff"
        emissiveIntensity={3.4}
        metalness={0.35}
        roughness={0.18}
        toneMapped={false}
      />
    </mesh>
  );
}

function Descent({ stone, glyphs }: { stone: THREE.Texture; glyphs: THREE.Texture }) {
  const steps = Array.from({ length: 16 }, (_, index) => index);

  return (
    <group position={[0, 0, STAIR_Z]}>
      <mesh position={[-2.15, -6, -4]}>
        <boxGeometry args={[1.1, 16, 14]} />
        <meshStandardMaterial color="#1a141c" map={stone} roughness={0.92} />
      </mesh>
      <mesh position={[2.15, -6, -4]}>
        <boxGeometry args={[1.1, 16, 14]} />
        <meshStandardMaterial color="#181218" map={stone} roughness={0.92} />
      </mesh>
      <mesh position={[-1.55, -4, -3.4]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[12, 10]} />
        <meshStandardMaterial
          color="#120e16"
          emissive="#3b1d66"
          emissiveIntensity={0.35}
          map={glyphs}
          transparent
        />
      </mesh>
      <mesh position={[1.55, -4, -3.4]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[12, 10]} />
        <meshStandardMaterial
          color="#120e16"
          emissive="#3b1d66"
          emissiveIntensity={0.35}
          map={glyphs}
          transparent
        />
      </mesh>

      {steps.map((index) => (
        <mesh key={index} position={[0, -index * 0.95, -index * 0.62]}>
          <boxGeometry args={[2.4, 0.22, 0.72]} />
          <meshStandardMaterial color="#1c171f" map={stone} roughness={0.78} />
        </mesh>
      ))}

      <Crystal position={[-1.35, -1.2, -1.4]} scale={1.15} />
      <Crystal position={[1.4, -3.4, -3.1]} scale={0.85} />
      <Crystal position={[-1.1, -6.6, -5.2]} scale={1.4} />
      <Crystal position={[1.2, -9.1, -7]} scale={1.05} />
      <Crystal position={[0.2, -12.4, -9.2]} scale={1.7} />
      <pointLight color="#c08cff" distance={14} intensity={12} position={[0, -14.5, -10]} />
      <mesh position={[0, -15.4, -11.2]}>
        <planeGeometry args={[2.6, 3.4]} />
        <meshBasicMaterial color="#f2e8ff" toneMapped={false} />
      </mesh>
    </group>
  );
}

function Spires() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = 36;

  useLayoutEffect(() => {
    if (!mesh.current) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (4.5 + (i % 7) * 1.15 + (i % 3) * 0.3);
      const z = -8 - (i % 12) * 2.1;
      const h = 6 + (i % 9) * 1.4;
      dummy.position.set(x, h / 2 - 1.2, z);
      dummy.scale.set(0.22 + (i % 4) * 0.04, h, 0.22 + (i % 3) * 0.05);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <boxGeometry />
      <meshStandardMaterial
        color="#0c0a10"
        emissive="#4a1f88"
        emissiveIntensity={0.22}
        metalness={0.55}
        roughness={0.38}
      />
    </instancedMesh>
  );
}

function Searchlight({ position, tilt = 0.18 }: { position: [number, number, number]; tilt?: number }) {
  return (
    <mesh position={position} rotation={[tilt, 0, 0.08]}>
      <cylinderGeometry args={[0.05, 1.6, 18, 16, 1, true]} />
      <meshBasicMaterial
        color="#f4f1ff"
        opacity={0.09}
        side={THREE.DoubleSide}
        transparent
      />
    </mesh>
  );
}

function VoidCity({ voidNotice }: { voidNotice: THREE.Texture }) {
  const city = useTexture("/assets/crystal-city.png");

  return (
    <group position={[0, -15.6, CITY_Z]}>
      <mesh position={[0, 3.6, 6.4]}>
        <boxGeometry args={[8.4, 8.2, 1.1]} />
        <meshStandardMaterial color="#0b090c" roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.6, 5.8]}>
        <boxGeometry args={[3.4, 4.6, 1.4]} />
        <meshStandardMaterial color="#050406" roughness={1} />
      </mesh>
      <mesh position={[-1.7, 1.1, 5.95]}>
        <planeGeometry args={[0.72, 1.02]} />
        <meshBasicMaterial map={voidNotice} />
      </mesh>

      <mesh position={[0, 6.4, -22]}>
        <planeGeometry args={[54, 30]} />
        <meshBasicMaterial map={city} toneMapped={false} />
      </mesh>

      <mesh position={[0, 2.15, -6.4]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[2.4, 4.3, 4]} />
        <meshStandardMaterial color="#09070c" metalness={0.45} roughness={0.32} />
      </mesh>
      <mesh position={[0, -0.05, -6.4]}>
        <boxGeometry args={[5.6, 0.28, 5.6]} />
        <meshStandardMaterial color="#0d0b10" metalness={0.3} roughness={0.5} />
      </mesh>

      <Spires />
      <Searchlight position={[-3.4, 8, -10]} tilt={0.22} />
      <Searchlight position={[2.8, 9.2, -14]} tilt={0.12} />
      <Searchlight position={[0.4, 10, -18]} tilt={0.08} />
      <pointLight color="#c9b6ff" distance={40} intensity={18} position={[0, 8, -16]} />
      <pointLight color="#6d3cff" distance={28} intensity={10} position={[0, 2, -8]} />
    </group>
  );
}

export default function RegistryVoidWorld() {
  const textures = useGeneratedTextures();

  return (
    <group>
      <color args={["#050306"]} attach="background" />
      <fog attach="fog" args={["#050306", 8, 62]} />
      <ambientLight intensity={0.09} />
      <hemisphereLight args={["#2a1838", "#08060a", 0.42]} />
      <Street brick={textures.brick} />
      <Door22 brick={textures.brick} doorNumber={textures.doorNumber} notice={textures.notice} />
      <Descent glyphs={textures.glyphs} stone={textures.stone} />
      <VoidCity voidNotice={textures.voidNotice} />
    </group>
  );
}
