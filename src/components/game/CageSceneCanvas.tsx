"use client";

import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Box3, MathUtils, Plane, Vector3, type Group, type Mesh, type Object3D } from "three";

import { ANIMAL_BY_KEY } from "@/game/catalog";
import { CAGE_BOUNDS, clampPlacement, placementForIndex } from "@/game/logic";
import { useGameStore } from "@/game/store/useGameStore";
import { ANIMAL_NAME_KEYS } from "@/i18n/gameText";
import { useI18n } from "@/i18n/provider";
import type { CagePlacement, OwnedAnimal } from "@/game/types";

type AnimalActorProps = {
  animal: OwnedAnimal;
  placement: CagePlacement;
  selected: boolean;
  onSelect: (animalId: string) => void;
  onDragStateChange: (animalId: string | null) => void;
  onPlacementCommit: (animalId: string, placement: CagePlacement) => void;
};

type ModelFallbackBoundaryProps = {
  fallback: ReactNode;
  children: ReactNode;
};

type ModelFallbackBoundaryState = {
  hasError: boolean;
};

const WANDER_MARGIN = 0.6;

function randomWanderPoint() {
  return {
    x: MathUtils.randFloat(CAGE_BOUNDS.minX + WANDER_MARGIN, CAGE_BOUNDS.maxX - WANDER_MARGIN),
    z: MathUtils.randFloat(CAGE_BOUNDS.minZ + WANDER_MARGIN, CAGE_BOUNDS.maxZ - WANDER_MARGIN),
  };
}

class ModelFallbackBoundary extends Component<
  ModelFallbackBoundaryProps,
  ModelFallbackBoundaryState
> {
  state: ModelFallbackBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ModelFallbackBoundaryState {
    return {
      hasError: true,
    };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

function FallbackAnimalMesh({ color }: { color: string }) {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.45, 0]}>
        <sphereGeometry args={[0.45, 24, 24]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>
    </group>
  );
}

function LoadedAnimalModel({ path, modelYawOffset }: { path: string; modelYawOffset: number }) {
  const gltf = useGLTF(path) as { scene: Group };
  const normalized = useMemo(() => {
    const scene = gltf.scene.clone(true);
    scene.traverse((node: Object3D) => {
      if ("isMesh" in node && node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = false;
      }
    });
    const box = new Box3().setFromObject(scene);

    if (box.isEmpty()) {
      return {
        scene,
        scale: 1,
        offset: [0, 0, 0] as [number, number, number],
      };
    }

    const center = new Vector3();
    const size = new Vector3();
    box.getCenter(center);
    box.getSize(size);

    const targetHeight = 1.05;
    const scale = size.y > 0 ? targetHeight / size.y : 1;

    return {
      scene,
      scale,
      offset: [-center.x * scale, -box.min.y * scale, -center.z * scale] as [
        number,
        number,
        number,
      ],
    };
  }, [gltf.scene]);

  return (
    <group scale={normalized.scale} position={normalized.offset} rotation={[0, modelYawOffset, 0]}>
      <primitive object={normalized.scene} />
    </group>
  );
}

function AnimalModel({
  modelPath,
  fallbackModelPaths,
  fallbackColor,
  modelYawOffset,
}: {
  modelPath: string;
  fallbackModelPaths?: string[];
  fallbackColor: string;
  modelYawOffset: number;
}) {
  const [resolvedModelPath, setResolvedModelPath] = useState<string | null>(null);
  const [checkFinished, setCheckFinished] = useState<boolean>(false);
  const candidateModelPaths = useMemo(
    () => [modelPath, ...(fallbackModelPaths ?? [])],
    [modelPath, fallbackModelPaths]
  );

  useEffect(() => {
    let isActive = true;

    async function checkModel() {
      for (const path of candidateModelPaths) {
        try {
          const response = await fetch(path, { method: "HEAD" });
          if (response.ok) {
            if (isActive) {
              setResolvedModelPath(path);
              setCheckFinished(true);
            }
            return;
          }
        } catch {
          // Try next path.
        }
      }

      if (isActive) {
        setResolvedModelPath(null);
        setCheckFinished(true);
      }
    }

    setResolvedModelPath(null);
    setCheckFinished(false);
    void checkModel();

    return () => {
      isActive = false;
    };
  }, [candidateModelPaths]);

  const fallback = <FallbackAnimalMesh color={fallbackColor} />;
  if (!checkFinished || !resolvedModelPath) {
    return fallback;
  }

  return (
    <ModelFallbackBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <LoadedAnimalModel path={resolvedModelPath} modelYawOffset={modelYawOffset} />
      </Suspense>
    </ModelFallbackBoundary>
  );
}

function AnimalActor({
  animal,
  placement,
  selected,
  onSelect,
  onDragStateChange,
  onPlacementCommit,
}: AnimalActorProps) {
  const { t } = useI18n();
  const animalDefinition = ANIMAL_BY_KEY[animal.animalKey];
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

  const toClampedPlacement = useCallback(
    (event: ThreeEvent<PointerEvent>): CagePlacement | null => {
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
    },
    []
  );

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

  if (!animalDefinition) {
    return null;
  }

  const animalName = animal.nickname?.trim() || t(ANIMAL_NAME_KEYS[animal.animalKey]);

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
          modelPath={animalDefinition.modelPath}
          fallbackModelPaths={animalDefinition.fallbackModelPaths}
          fallbackColor={animalDefinition.fallbackColor}
          modelYawOffset={animalDefinition.modelYawOffset ?? 0}
        />
      </group>
      {selected ? (
        <mesh ref={selectionRingRef} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[selectionRingRadius - 0.1, selectionRingRadius + 0.08, 48]} />
          <meshBasicMaterial color="#f6d365" transparent opacity={0.95} depthWrite={false} />
        </mesh>
      ) : null}
      <Html center transform sprite position={[0, 1.84, 0]} style={{ pointerEvents: "none" }}>
        <div
          className={`inline-flex min-w-[132px] items-center justify-center gap-1.5 rounded-md border border-stone-100/20 bg-stone-900/85 px-2.5 py-1 text-[11px] font-semibold leading-none text-stone-100 shadow-lg transition-all duration-200 ease-out ${
            selected ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
          }`}
        >
          <span className="max-w-[86px] truncate">{animalName}</span>
          <span className="rounded bg-stone-100/15 px-1.5 py-0.5">
            {t("cage.sceneAge", { age: animal.age })}
          </span>
          {animal.isDead ? (
            <span className="rounded bg-rose-500/80 px-1.5 py-0.5">{t("common.dead")}</span>
          ) : null}
        </div>
      </Html>
    </group>
  );
}

function CageGeometry() {
  const WALL_CENTER_Y = 1.205;
  const frontWallRef = useRef<Mesh>(null);
  const backWallRef = useRef<Mesh>(null);
  const leftWallRef = useRef<Mesh>(null);
  const rightWallRef = useRef<Mesh>(null);

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

    const xPrimary = xRatio >= zRatio;
    const zPrimary = zRatio >= xRatio;

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

export default function CageSceneCanvas() {
  const ownedAnimals = useGameStore((state) => state.ownedAnimals);
  const placements = useGameStore((state) => state.placements);
  const selectedAnimalId = useGameStore((state) => state.selectedAnimalId);
  const selectAnimal = useGameStore((state) => state.selectAnimal);
  const moveAnimal = useGameStore((state) => state.moveAnimal);
  const [draggingAnimalId, setDraggingAnimalId] = useState<string | null>(null);

  return (
    <div
      id="cage-scene-canvas"
      className="h-[440px] w-full overflow-hidden rounded-xl border border-stone-300 bg-[#e5ddcb]"
    >
      <Canvas
        camera={{ position: [0, 6.8, 9.8], fov: 45 }}
        gl={{ preserveDrawingBuffer: true }}
        shadows
        onPointerMissed={() => {
          if (!draggingAnimalId) {
            selectAnimal(null);
          }
        }}
      >
        <color attach="background" args={["#efe8d9"]} />
        <ambientLight intensity={0.6} />
        <directionalLight
          castShadow
          intensity={1}
          position={[7, 8, 4]}
          shadow-mapSize={[1024, 1024]}
        />
        <CageGeometry />

        {ownedAnimals.map((animal, index) => (
          <AnimalActor
            key={animal.id}
            animal={animal}
            placement={placements[animal.id] ?? placementForIndex(index)}
            selected={animal.id === selectedAnimalId}
            onSelect={selectAnimal}
            onDragStateChange={setDraggingAnimalId}
            onPlacementCommit={moveAnimal}
          />
        ))}

        <OrbitControls
          makeDefault
          enabled={draggingAnimalId === null}
          minPolarAngle={0.45}
          maxPolarAngle={1.35}
          minDistance={6}
          maxDistance={15}
        />
      </Canvas>
    </div>
  );
}
