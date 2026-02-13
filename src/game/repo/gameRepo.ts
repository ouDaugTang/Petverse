import type { GameSnapshot } from "@/game/types";

export interface GameRepo {
  loadState: () => Promise<GameSnapshot | null>;
  saveState: (state: GameSnapshot) => Promise<void>;
}
