"use client";

import { useGLTF } from "@react-three/drei";
import { Component, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { Box3, type Group, type Object3D, Vector3 } from "three";

type ModelFallbackBoundaryProps = {
  fallback: ReactNode;
  children: ReactNode;
};

type ModelFallbackBoundaryState = {
  hasError: boolean;
};

type AnimalModelProps = {
  modelPath: string;
  fallbackModelPaths?: string[];
  fallbackColor: string;
  modelYawOffset: number;
};

class ModelFallbackBoundary extends Component<ModelFallbackBoundaryProps, ModelFallbackBoundaryState> {
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

export default function AnimalModel({
  modelPath,
  fallbackModelPaths,
  fallbackColor,
  modelYawOffset,
}: AnimalModelProps) {
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
