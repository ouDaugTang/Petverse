import { parseGameSnapshot } from "@/game/types";
import type { GameSnapshot } from "@/game/types";
import type { GameRepo } from "@/game/repo/gameRepo";

const STORAGE_KEY = "petverse.game.snapshot.v1";

export function createLocalStorageGameRepo(storageKey = STORAGE_KEY): GameRepo {
  return {
    async loadState() {
      if (typeof window === "undefined") {
        return null;
      }

      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return null;
      }

      try {
        const parsed = JSON.parse(raw) as unknown;
        return parseGameSnapshot(parsed);
      } catch {
        return null;
      }
    },
    async saveState(state: GameSnapshot) {
      if (typeof window === "undefined") {
        return;
      }

      window.localStorage.setItem(storageKey, JSON.stringify(state));
    },
  };
}
