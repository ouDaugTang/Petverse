import type { GameSnapshot } from "@/game/types";

export type PersistedGameState = {
  snapshot: GameSnapshot;
  selectedAnimalId: string | null;
};

export interface GameRepo {
  loadState: () => Promise<PersistedGameState | null>;
  saveState: (state: PersistedGameState) => Promise<void>;
}
