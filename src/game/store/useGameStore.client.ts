"use client";

import { create } from "zustand";

import { advanceGameTime, createDefaultGameSnapshot, type GameSnapshot } from "@/game";
import { createGameRepo } from "@/game/repo";
import { createStoreActions } from "@/game/store/actions";
import { persistSnapshot, reconcileSelectedAnimalId, toSnapshot } from "@/game/store/storeUtils";
import type { GameStore } from "@/game/store/types";

const repo = createGameRepo();

export const useGameStore = create<GameStore>((set, get) => {
  const syncCurrentSnapshot = (): GameSnapshot => {
    const currentState = get();
    const synced = advanceGameTime(toSnapshot(currentState));
    const nextSelectedAnimalId = reconcileSelectedAnimalId(
      synced.ownedAnimals,
      currentState.selectedAnimalId
    );

    set({
      ...synced,
      selectedAnimalId: nextSelectedAnimalId,
    });

    void persistSnapshot(repo, synced, nextSelectedAnimalId);
    return synced;
  };

  return {
    ...createDefaultGameSnapshot(),
    selectedAnimalId: null,
    hydrated: false,
    initialize: async () => {
      set({
        hydrated: false,
      });

      try {
        const loaded = await repo.loadState();
        if (loaded) {
          const synced = advanceGameTime(loaded.snapshot);
          const nextSelectedAnimalId = reconcileSelectedAnimalId(
            synced.ownedAnimals,
            loaded.selectedAnimalId
          );
          set({
            ...synced,
            selectedAnimalId: nextSelectedAnimalId,
            hydrated: true,
          });
          void persistSnapshot(repo, synced, nextSelectedAnimalId);
          return;
        }
      } catch {
        // Fallback to defaults.
      }

      set({
        hydrated: true,
      });
    },
    syncWorldTime: () => {
      syncCurrentSnapshot();
    },
    ...createStoreActions({
      get,
      set,
      repo,
      syncCurrentSnapshot,
    }),
  };
});
