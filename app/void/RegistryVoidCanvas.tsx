"use client";

import { AdaptiveDpr, Preload, ScrollControls, useScroll } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo } from "react";
import * as THREE from "three";
import { VOID_SCROLL_PAGES } from "../content/void";
import RegistryVoidWorld from "./RegistryVoidWorld";

type ScrollApi = {
  onOffset: (offset: number) => void;
  onElement: (el: HTMLDivElement) => void;
};

const cameraPath = [
  new THREE.Vector3(0, 1.64, 18.5),
  new THREE.Vector3(0.05, 1.62, 6),
  new THREE.Vector3(0, 1.58, -10),
  new THREE.Vector3(0, 1.48, -22.4),
  new THREE.Vector3(0, 1.28, -25.2),
  new THREE.Vector3(0, 0.7, -28.4),
  new THREE.Vector3(0, -4.2, -33.6),
  new THREE.Vector3(0, -10.4, -37.8),
  new THREE.Vector3(0, -14.6, -42.5),
  new THREE.Vector3(0.15, -13.4, -48.2),
  new THREE.Vector3(0.4, -12.2, -51.4),
];

const lookPath = [
  new THREE.Vector3(0, 1.45, 6),
  new THREE.Vector3(0, 1.4, -8),
  new THREE.Vector3(0, 1.35, -22),
  new THREE.Vector3(0, 1.25, -26.2),
  new THREE.Vector3(0, 1.1, -28),
  new THREE.Vector3(0, -2.4, -34),
  new THREE.Vector3(0, -10, -39),
  new THREE.Vector3(0, -14.8, -50),
  new THREE.Vector3(0.6, -12.4, -62),
  new THREE.Vector3(1.4, -10.6, -72),
  new THREE.Vector3(2.2, -9.2, -78),
];

function CameraRig() {
  const scroll = useScroll();
  const posCurve = useMemo(() => new THREE.CatmullRomCurve3(cameraPath), []);
  const lookCurve = useMemo(() => new THREE.CatmullRomCurve3(lookPath), []);
  const look = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const t = THREE.MathUtils.clamp(scroll.offset, 0, 1);
    posCurve.getPoint(t, state.camera.position);
    lookCurve.getPoint(Math.min(t + 0.035, 1), look);
    state.camera.lookAt(look);
    const fog = state.scene.fog;
    if (fog instanceof THREE.Fog) {
      fog.near = THREE.MathUtils.lerp(7, 14, t);
      fog.far = THREE.MathUtils.lerp(48, 90, t);
    }
  });

  return null;
}

function ScrollBridge({ onOffset, onElement }: ScrollApi) {
  const scroll = useScroll();

  useEffect(() => {
    onElement(scroll.el);
  }, [onElement, scroll.el]);

  useFrame(() => {
    onOffset(scroll.offset);
  });

  return null;
}

export default function RegistryVoidCanvas({ onOffset, onElement }: ScrollApi) {
  return (
    <Canvas
      camera={{ far: 160, fov: 56, near: 0.1, position: [0, 1.64, 18.5] }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
    >
      <AdaptiveDpr />
      <ScrollControls damping={0.18} pages={VOID_SCROLL_PAGES}>
        <ScrollBridge onElement={onElement} onOffset={onOffset} />
        <CameraRig />
        <Suspense fallback={null}>
          <RegistryVoidWorld />
        </Suspense>
      </ScrollControls>
      <Preload all />
    </Canvas>
  );
}
