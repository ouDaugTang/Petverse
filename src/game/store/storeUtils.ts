import type { GameRepo } from "@/game/repo/gameRepo";
import type { GameSnapshot, OwnedAnimal } from "@/game/types";

type SnapshotLike = Pick<GameSnapshot, "coins" | "inventory" | "ownedAnimals" | "placements">;

export function toSnapshot(state: SnapshotLike): GameSnapshot {
  return {
    coins: state.coins,
    inventory: state.inventory,
    ownedAnimals: state.ownedAnimals,
    placements: state.placements,
  };
}

export function findAnimal(
  ownedAnimals: OwnedAnimal[],
  animalId: string | null
): OwnedAnimal | undefined {
  if (!animalId) {
    return undefined;
  }

  return ownedAnimals.find((animal) => animal.id === animalId);
}

export function reconcileSelectedAnimalId(
  ownedAnimals: OwnedAnimal[],
  selectedAnimalId: string | null
): string | null {
  return findAnimal(ownedAnimals, selectedAnimalId)?.id ?? ownedAnimals[0]?.id ?? null;
}

export async function persistSnapshot(
  repo: GameRepo,
  snapshot: GameSnapshot,
  selectedAnimalId: string | null
): Promise<void> {
  try {
    await repo.saveState({
      snapshot,
      selectedAnimalId,
    });
  } catch {
    // LocalStorage and Supabase can be unavailable in restricted environments.
  }
}
