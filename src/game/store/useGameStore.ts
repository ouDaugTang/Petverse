"use client";

import { create } from "zustand";

import { createDefaultGameSnapshot } from "@/game/defaultState";
import {
  advanceGameTime,
  clampPlacement,
  feedAnimal,
  purchaseAnimal,
  purchaseFeed,
  sellAnimal as sellAnimalFromSnapshot,
} from "@/game/logic";
import { createGameRepo } from "@/game/repo";
import {
  translateAnimalNameRuntime,
  translateFeedNameRuntime,
  translateReason,
  translateRuntime,
} from "@/i18n/runtime";
import type { AnimalKey, CagePlacement, GameSnapshot, OwnedAnimal } from "@/game/types";

type StoreActionResult = {
  ok: boolean;
  message: string;
};

type GameStore = GameSnapshot & {
  selectedAnimalId: string | null;
  hydrated: boolean;
  initialize: () => Promise<void>;
  syncWorldTime: () => void;
  selectAnimal: (animalId: string | null) => void;
  buyAnimal: (animalKey: AnimalKey) => StoreActionResult;
  sellAnimal: (animalId: string) => StoreActionResult;
  buyFeed: (quantity?: number) => StoreActionResult;
  feedSelectedAnimal: () => StoreActionResult;
  moveAnimal: (animalId: string, placement: CagePlacement) => void;
  renameAnimal: (animalId: string, nickname: string) => StoreActionResult;
  setAnimalThumbnail: (animalId: string, dataUrl: string) => StoreActionResult;
  setSelectedAnimalThumbnail: (dataUrl: string) => StoreActionResult;
};

const repo = createGameRepo();

function toSnapshot(state: GameStore): GameSnapshot {
  return {
    coins: state.coins,
    inventory: state.inventory,
    ownedAnimals: state.ownedAnimals,
    placements: state.placements,
  };
}

function findAnimal(ownedAnimals: OwnedAnimal[], animalId: string | null): OwnedAnimal | undefined {
  if (!animalId) {
    return undefined;
  }

  return ownedAnimals.find((animal) => animal.id === animalId);
}

function reconcileSelectedAnimalId(
  ownedAnimals: OwnedAnimal[],
  selectedAnimalId: string | null
): string | null {
  return findAnimal(ownedAnimals, selectedAnimalId)?.id ?? ownedAnimals[0]?.id ?? null;
}

async function persistSnapshot(snapshot: GameSnapshot): Promise<void> {
  try {
    await repo.saveState(snapshot);
  } catch {
    // LocalStorage and Supabase can be unavailable in restricted environments.
  }
}

function normalizeNickname(nickname: string): string | undefined {
  const normalized = nickname.trim().slice(0, 32);
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeThumbnailDataUrl(dataUrl: string): string | undefined {
  const normalized = dataUrl.trim();
  if (!normalized) {
    return undefined;
  }

  if (!normalized.startsWith("data:image/")) {
    return undefined;
  }

  return normalized;
}

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

    void persistSnapshot(synced);
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
          const synced = advanceGameTime(loaded);
          set({
            ...synced,
            selectedAnimalId: reconcileSelectedAnimalId(synced.ownedAnimals, null),
            hydrated: true,
          });
          void persistSnapshot(synced);
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
    selectAnimal: (animalId) => {
      const selectedAnimal = findAnimal(get().ownedAnimals, animalId);
      set({
        selectedAnimalId: selectedAnimal?.id ?? null,
      });
    },
    buyAnimal: (animalKey) => {
      const synced = syncCurrentSnapshot();
      const result = purchaseAnimal(synced, animalKey);

      if (!result.ok) {
        return {
          ok: false,
          message: translateReason(result.reason),
        };
      }

      set({
        ...result.state,
        selectedAnimalId: result.meta.animalId,
      });

      void persistSnapshot(result.state);

      return {
        ok: true,
        message: translateRuntime("game.action.buyAnimal", {
          animal: translateAnimalNameRuntime(animalKey),
        }),
      };
    },
    sellAnimal: (animalId) => {
      const synced = syncCurrentSnapshot();
      const result = sellAnimalFromSnapshot(synced, animalId);

      if (!result.ok) {
        return {
          ok: false,
          message: translateReason(result.reason),
        };
      }

      const selectedAnimalId = get().selectedAnimalId;
      const nextSelectedAnimalId = reconcileSelectedAnimalId(
        result.state.ownedAnimals,
        selectedAnimalId === animalId ? null : selectedAnimalId
      );

      set({
        ...result.state,
        selectedAnimalId: nextSelectedAnimalId,
      });

      void persistSnapshot(result.state);

      return {
        ok: true,
        message: translateRuntime("game.action.sellAnimal", {
          animal: translateAnimalNameRuntime(result.meta.animalKey),
          coins: result.meta.refundCoins,
        }),
      };
    },
    buyFeed: (quantity = 1) => {
      const synced = syncCurrentSnapshot();
      const result = purchaseFeed(synced, quantity);

      if (!result.ok) {
        return {
          ok: false,
          message: translateReason(result.reason),
        };
      }

      set({
        ...result.state,
      });

      void persistSnapshot(result.state);

      return {
        ok: true,
        message: translateRuntime("game.action.buyFeed", {
          quantity,
          feed: translateFeedNameRuntime(),
        }),
      };
    },
    feedSelectedAnimal: () => {
      const synced = syncCurrentSnapshot();
      const selectedAnimalId = get().selectedAnimalId;
      if (!selectedAnimalId) {
        return {
          ok: false,
          message: translateRuntime("game.reason.selectFirst"),
        };
      }

      const result = feedAnimal(synced, selectedAnimalId);

      if (!result.ok) {
        return {
          ok: false,
          message: translateReason(result.reason),
        };
      }

      set({
        ...result.state,
      });

      void persistSnapshot(result.state);

      return {
        ok: true,
        message: translateRuntime("game.action.feedSuccess", {
          hunger: Math.round(result.meta.hunger),
        }),
      };
    },
    moveAnimal: (animalId, placement) => {
      const synced = syncCurrentSnapshot();
      const target = findAnimal(synced.ownedAnimals, animalId);
      if (!target) {
        return;
      }

      const nextPlacement = clampPlacement(placement);
      const nextState: GameSnapshot = {
        ...synced,
        placements: {
          ...synced.placements,
          [animalId]: nextPlacement,
        },
      };

      set({
        placements: nextState.placements,
      });

      void persistSnapshot(nextState);
    },
    renameAnimal: (animalId, nickname) => {
      const synced = syncCurrentSnapshot();
      const targetIndex = synced.ownedAnimals.findIndex((animal) => animal.id === animalId);
      if (targetIndex === -1) {
        return {
          ok: false,
          message: translateReason("Selected animal not found."),
        };
      }

      const nextNickname = normalizeNickname(nickname);
      const nextAnimals = [...synced.ownedAnimals];
      nextAnimals[targetIndex] = {
        ...nextAnimals[targetIndex],
        nickname: nextNickname,
      };

      const nextState: GameSnapshot = {
        ...synced,
        ownedAnimals: nextAnimals,
      };

      set({
        ownedAnimals: nextAnimals,
      });

      void persistSnapshot(nextState);

      return {
        ok: true,
        message: nextNickname
          ? translateRuntime("game.action.renameUpdated")
          : translateRuntime("game.action.renameCleared"),
      };
    },
    setAnimalThumbnail: (animalId, dataUrl) => {
      const synced = syncCurrentSnapshot();
      const targetIndex = synced.ownedAnimals.findIndex((animal) => animal.id === animalId);
      if (targetIndex === -1) {
        return {
          ok: false,
          message: translateReason("Selected animal not found."),
        };
      }

      const nextThumbnail = normalizeThumbnailDataUrl(dataUrl);
      if (dataUrl.trim().length > 0 && !nextThumbnail) {
        return {
          ok: false,
          message: translateRuntime("game.reason.invalidImageFormat"),
        };
      }

      const nextAnimals = [...synced.ownedAnimals];
      nextAnimals[targetIndex] = {
        ...nextAnimals[targetIndex],
        thumbnailDataUrl: nextThumbnail,
      };

      const nextState: GameSnapshot = {
        ...synced,
        ownedAnimals: nextAnimals,
      };

      set({
        ownedAnimals: nextAnimals,
      });

      void persistSnapshot(nextState);

      return {
        ok: true,
        message: nextThumbnail
          ? translateRuntime("game.action.thumbnailUpdated")
          : translateRuntime("game.action.thumbnailCleared"),
      };
    },
    setSelectedAnimalThumbnail: (dataUrl) => {
      const selectedAnimalId = get().selectedAnimalId;
      if (!selectedAnimalId) {
        return {
          ok: false,
          message: translateRuntime("game.reason.selectFirst"),
        };
      }

      return get().setAnimalThumbnail(selectedAnimalId, dataUrl);
    },
  };
});
