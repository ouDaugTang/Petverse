"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import { Box3, MathUtils, Plane, Vector3, type Group, type Mesh } from "three";

import AnimalNameTag from "./AnimalNameTag.client";
import AnimalModel from "./AnimalModel.client";
import {
  clampPlacement,
  getAnimalVariant,
  type CagePlacement,
  type OwnedAnimal,
} from "@/game";
import { ANIMAL_NAME_KEYS, getAnimalVariantNameKey, useI18n } from "@/i18n";
import { randomWanderPoint } from "./wander";

type AnimalActorProps = {
  animal: OwnedAnimal;
  placement: CagePlacement;
  selected: boolean;
  onSelect: (animalId: string) => void;
  onDragStateChange: (animalId: string | null) => void;
  onPlacementCommit: (animalId: string, placement: CagePlacement) => void;
};

export default function AnimalActor({
  animal,
  placement,
  selected,
  onSelect,
  onDragStateChange,
  onPlacementCommit,
}: AnimalActorProps) {
  const { t } = useI18n();
  const animalVariant = getAnimalVariant(animal.animalKey, animal.variantKey);
  const groupRef = useRef<Group>(null);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef(new Vector3());
  const dragPlaneRef = useRef(new Plane(new Vector3(0, 1, 0), 0));
  const dragIntersectionRef = useRef(new Vector3());
  const modelGroupRef = useRef<Group>(null);
  const selectionRingRef = useRef<Mesh>(null);
  const boundsBoxRef = useRef(new Box3());
  const boundsSizeRef = useRef(new Vector3());
  const ringMeasureCooldownRef = useRef(0);
  const [selectionRingRadius, setSelectionRingRadius] = useState(0.72);
  const movementTargetRef = useRef<{ x: number; z: number }>({ x: placement.x, z: placement.z });
  const idleTimerRef = useRef<number>(MathUtils.randFloat(0.8, 2.2));

  const pickNextWanderTarget = useCallback(() => {
    movementTargetRef.current = randomWanderPoint();
  }, []);

  useEffect(() => {
    const group = groupRef.current;
    if (!group || isDraggingRef.current) {
      return;
    }

    group.position.set(placement.x, 0, placement.z);
    group.rotation.set(0, placement.rotation, 0);
    movementTargetRef.current = { x: placement.x, z: placement.z };
    idleTimerRef.current = MathUtils.randFloat(0.6, 1.8);
  }, [placement.x, placement.z, placement.rotation]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    const selectionRing = selectionRingRef.current;
    if (selectionRing) {
      const pulse = 1 + Math.sin(performance.now() * 0.002) * 0.04;
      selectionRing.scale.set(pulse, pulse, pulse);
    }

    ringMeasureCooldownRef.current -= delta;
    if (ringMeasureCooldownRef.current <= 0) {
      ringMeasureCooldownRef.current = 0.45;
      const modelGroup = modelGroupRef.current;
      if (modelGroup) {
        const bounds = boundsBoxRef.current.setFromObject(modelGroup);
        if (!bounds.isEmpty()) {
          const size = bounds.getSize(boundsSizeRef.current);
          const footprintRadius = Math.max(size.x, size.z) * 0.5;
          const nextRadius = MathUtils.clamp(footprintRadius + 0.18, 0.58, 1.55);
          setSelectionRingRadius((current) =>
            Math.abs(current - nextRadius) > 0.03 ? nextRadius : current
          );
        }
      }
    }

    if (!group || isDraggingRef.current || animal.isDead) {
      return;
    }

    const dx = movementTargetRef.current.x - group.position.x;
    const dz = movementTargetRef.current.z - group.position.z;
    const distance = Math.hypot(dx, dz);

    if (distance < 0.08) {
      idleTimerRef.current -= delta;
      if (idleTimerRef.current <= 0) {
        pickNextWanderTarget();
        idleTimerRef.current = MathUtils.randFloat(0.8, 2.6);
      }
      return;
    }

    const speed = MathUtils.clamp(0.7 + animal.age * 0.02, 0.7, 1.25);
    const step = Math.min(distance, speed * delta);
    const dirX = dx / distance;
    const dirZ = dz / distance;

    group.position.x += dirX * step;
    group.position.z += dirZ * step;
    group.rotation.y = Math.atan2(dirX, dirZ);
  });

  const toClampedPlacement = useCallback((event: ThreeEvent<PointerEvent>): CagePlacement | null => {
    const group = groupRef.current;
    if (!group) {
      return null;
    }

    const intersection = dragIntersectionRef.current;
    const hasIntersection = event.ray.intersectPlane(dragPlaneRef.current, intersection);
    if (!hasIntersection) {
      return null;
    }

    return clampPlacement({
      x: intersection.x + dragOffsetRef.current.x,
      z: intersection.z + dragOffsetRef.current.z,
      rotation: group.rotation.y,
    });
  }, []);

  const finishDrag = useCallback(() => {
    const group = groupRef.current;
    if (!group) {
      return;
    }

    const committed = clampPlacement({
      x: group.position.x,
      z: group.position.z,
      rotation: group.rotation.y,
    });

    group.position.set(committed.x, 0, committed.z);
    group.rotation.set(0, committed.rotation, 0);
    onPlacementCommit(animal.id, committed);
    isDraggingRef.current = false;
    onDragStateChange(null);
    idleTimerRef.current = MathUtils.randFloat(0.4, 1.4);
    pickNextWanderTarget();
  }, [animal.id, onDragStateChange, onPlacementCommit, pickNextWanderTarget]);

  const animalName =
    animal.nickname?.trim() ||
    `${t(ANIMAL_NAME_KEYS[animal.animalKey])} · ${t(
      getAnimalVariantNameKey(animal.animalKey, animal.variantKey)
    )}`;

  return (
    <group
      ref={groupRef}
      position={[placement.x, 0, placement.z]}
      rotation={[0, placement.rotation, 0]}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect(animal.id);
        if (animal.isDead) {
          return;
        }

        isDraggingRef.current = true;
        onDragStateChange(animal.id);
        const group = groupRef.current;
        if (group) {
          const intersection = dragIntersectionRef.current;
          const hasIntersection = event.ray.intersectPlane(dragPlaneRef.current, intersection);
          if (hasIntersection) {
            dragOffsetRef.current.set(
              group.position.x - intersection.x,
              0,
              group.position.z - intersection.z
            );
          }
        }

        const target = event.target as Element | null;
        target?.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!isDraggingRef.current) {
          return;
        }

        event.stopPropagation();
        const nextPlacement = toClampedPlacement(event);
        const group = groupRef.current;
        if (!nextPlacement || !group) {
          return;
        }

        const dx = nextPlacement.x - group.position.x;
        const dz = nextPlacement.z - group.position.z;
        group.position.set(nextPlacement.x, 0, nextPlacement.z);
        if (Math.hypot(dx, dz) > 0.0001) {
          group.rotation.y = Math.atan2(dx, dz);
        }

        movementTargetRef.current = { x: nextPlacement.x, z: nextPlacement.z };
      }}
      onPointerUp={(event) => {
        if (!isDraggingRef.current) {
          return;
        }

        event.stopPropagation();
        const target = event.target as Element | null;
        target?.releasePointerCapture(event.pointerId);
        finishDrag();
      }}
      onPointerCancel={() => {
        if (!isDraggingRef.current) {
          return;
        }
        finishDrag();
      }}
    >
      <group ref={modelGroupRef}>
        <AnimalModel
          modelPath={animalVariant.modelPath}
          fallbackModelPaths={animalVariant.fallbackModelPaths}
          fallbackColor={animalVariant.fallbackColor}
          modelYawOffset={animalVariant.modelYawOffset ?? 0}
        />
      </group>
      {selected ? (
        <mesh ref={selectionRingRef} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[selectionRingRadius - 0.1, selectionRingRadius + 0.08, 48]} />
          <meshBasicMaterial color="#f6d365" transparent opacity={0.95} depthWrite={false} />
        </mesh>
      ) : null}
      <AnimalNameTag selected={selected} animalName={animalName} age={animal.age} isDead={animal.isDead} t={t} />
    </group>
  );
}
