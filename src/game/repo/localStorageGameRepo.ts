import { parseGameSnapshot } from "@/game/types";
import type { GameRepo, PersistedGameState } from "@/game/repo/gameRepo";

const STORAGE_KEY = "petverse.game.snapshot.v1";
const SELECTED_STORAGE_KEY_SUFFIX = ".selected";

export function createLocalStorageGameRepo(storageKey = STORAGE_KEY): GameRepo {
  const selectedStorageKey = `${storageKey}${SELECTED_STORAGE_KEY_SUFFIX}`;

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
        const snapshot = parseGameSnapshot(parsed);
        if (!snapshot) {
          return null;
        }

        const selectedRaw = window.localStorage.getItem(selectedStorageKey);
        const selectedAnimalId =
          typeof selectedRaw === "string" && selectedRaw.trim().length > 0 ? selectedRaw : null;

        return {
          snapshot,
          selectedAnimalId,
        };
      } catch {
        return null;
      }
    },
    async saveState(state: PersistedGameState) {
      if (typeof window === "undefined") {
        return;
      }

      window.localStorage.setItem(storageKey, JSON.stringify(state.snapshot));
      if (state.selectedAnimalId) {
        window.localStorage.setItem(selectedStorageKey, state.selectedAnimalId);
      } else {
        window.localStorage.removeItem(selectedStorageKey);
      }
    },
  };
}
