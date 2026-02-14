"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useState } from "react";

import { AnimalActor, CageGeometry } from "@/components/game/cage-scene";
import { placementForIndex, useGameStore } from "@/game";

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
