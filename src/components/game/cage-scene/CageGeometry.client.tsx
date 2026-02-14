"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { MathUtils, Vector3, type Mesh } from "three";

export default function CageGeometry() {
  const WALL_CENTER_Y = 1.205;
  const frontWallRef = useRef<Mesh>(null);
  const backWallRef = useRef<Mesh>(null);
  const leftWallRef = useRef<Mesh>(null);
  const rightWallRef = useRef<Mesh>(null);
  const cameraDirectionRef = useRef(new Vector3());

  useFrame(({ camera }, delta) => {
    const absX = Math.abs(camera.position.x);
    const absZ = Math.abs(camera.position.z);
    const sum = Math.max(0.0001, absX + absZ);
    const xRatio = absX / sum;
    const zRatio = absZ / sum;
    const primaryFadeOpacity = 0.025;
    const secondaryFadeOpacity = 0.14;
    const secondaryFadeThreshold = 0.28;

    let frontTarget = 1;
    let backTarget = 1;
    let leftTarget = 1;
    let rightTarget = 1;
    const cameraDirection = camera.getWorldDirection(cameraDirectionRef.current);
    const isTopDownView = cameraDirection.y <= -0.82;

    const xPrimary = xRatio >= zRatio;
    const zPrimary = zRatio >= xRatio;

    if (!isTopDownView) {
      if (camera.position.x >= 0) {
        rightTarget = xPrimary
          ? primaryFadeOpacity
          : xRatio >= secondaryFadeThreshold
            ? secondaryFadeOpacity
            : 1;
      } else {
        leftTarget = xPrimary
          ? primaryFadeOpacity
          : xRatio >= secondaryFadeThreshold
            ? secondaryFadeOpacity
            : 1;
      }

      if (camera.position.z >= 0) {
        frontTarget = zPrimary
          ? primaryFadeOpacity
          : zRatio >= secondaryFadeThreshold
            ? secondaryFadeOpacity
            : 1;
      } else {
        backTarget = zPrimary
          ? primaryFadeOpacity
          : zRatio >= secondaryFadeThreshold
            ? secondaryFadeOpacity
            : 1;
      }
    }

    const applyOpacity = (meshRef: { current: Mesh | null }, targetOpacity: number) => {
      const material = meshRef.current?.material;
      if (!material || Array.isArray(material)) {
        return;
      }

      const nextOpacity = MathUtils.damp(material.opacity, targetOpacity, 7, delta);
      const shouldBeTransparent = nextOpacity < 0.995;
      material.opacity = nextOpacity;
      material.depthWrite = true;
      material.polygonOffset = shouldBeTransparent;
      material.polygonOffsetFactor = shouldBeTransparent ? -1 : 0;
      material.polygonOffsetUnits = shouldBeTransparent ? -1 : 0;
      if (material.transparent !== shouldBeTransparent) {
        material.transparent = shouldBeTransparent;
        material.needsUpdate = true;
      }
    };

    applyOpacity(frontWallRef, frontTarget);
    applyOpacity(backWallRef, backTarget);
    applyOpacity(leftWallRef, leftTarget);
    applyOpacity(rightWallRef, rightTarget);
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[11, 11]} />
        <meshStandardMaterial color="#d8ccb4" roughness={0.9} />
      </mesh>

      <mesh ref={backWallRef} position={[0, WALL_CENTER_Y, -4.8]} receiveShadow renderOrder={2}>
        <boxGeometry args={[9.5, 2.4, 0.15]} />
        <meshStandardMaterial color="#8f7650" />
      </mesh>
      <mesh ref={frontWallRef} position={[0, WALL_CENTER_Y, 4.8]} receiveShadow renderOrder={2}>
        <boxGeometry args={[9.5, 2.4, 0.15]} />
        <meshStandardMaterial color="#8f7650" />
      </mesh>
      <mesh ref={leftWallRef} position={[-4.8, WALL_CENTER_Y, 0]} receiveShadow renderOrder={2}>
        <boxGeometry args={[0.15, 2.4, 9.5]} />
        <meshStandardMaterial color="#8f7650" />
      </mesh>
      <mesh ref={rightWallRef} position={[4.8, WALL_CENTER_Y, 0]} receiveShadow renderOrder={2}>
        <boxGeometry args={[0.15, 2.4, 9.5]} />
        <meshStandardMaterial color="#8f7650" />
      </mesh>
    </group>
  );
}
