import {
  clampPlacement,
  feedAnimal,
  purchaseAnimal,
  purchaseFeed,
  sellAnimal as sellAnimalFromSnapshot,
  type AnimalKey,
  type CagePlacement,
  type GameSnapshot,
} from "@/game";
import type { GameRepo } from "@/game/repo/gameRepo";
import { updateAnimalNickname, updateAnimalThumbnail } from "@/game/store/model";
import { findAnimal, persistSnapshot, reconcileSelectedAnimalId } from "@/game/store/storeUtils";
import type { GameStore, GetGameState, SetGameState } from "@/game/store/types";
import {
  translateAnimalNameRuntime,
  translateFeedNameRuntime,
  translateReason,
  translateRuntime,
} from "@/i18n/runtime";

type StoreActionDeps = {
  get: GetGameState;
  set: SetGameState;
  repo: GameRepo;
  syncCurrentSnapshot: () => GameSnapshot;
};

export function createStoreActions({ get, set, repo, syncCurrentSnapshot }: StoreActionDeps) {
  return {
    selectAnimal: (animalId: string | null) => {
      const selectedAnimal = findAnimal(get().ownedAnimals, animalId);
      set({
        selectedAnimalId: selectedAnimal?.id ?? null,
      });
    },
    buyAnimal: (animalKey: AnimalKey) => {
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

      void persistSnapshot(repo, result.state);

      return {
        ok: true,
        message: translateRuntime("game.action.buyAnimal", {
          animal: translateAnimalNameRuntime(animalKey),
        }),
      };
    },
    sellAnimal: (animalId: string) => {
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

      void persistSnapshot(repo, result.state);

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

      void persistSnapshot(repo, result.state);

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

      void persistSnapshot(repo, result.state);

      return {
        ok: true,
        message: translateRuntime("game.action.feedSuccess", {
          hunger: Math.round(result.meta.hunger),
        }),
      };
    },
    moveAnimal: (animalId: string, placement: CagePlacement) => {
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

      void persistSnapshot(repo, nextState);
    },
    renameAnimal: (animalId: string, nickname: string) => {
      const synced = syncCurrentSnapshot();
      const result = updateAnimalNickname(synced, animalId, nickname);
      if (!result.ok) {
        return {
          ok: false,
          message: translateReason("Selected animal not found."),
        };
      }

      set({
        ownedAnimals: result.state.ownedAnimals,
      });

      void persistSnapshot(repo, result.state);

      return {
        ok: true,
        message: result.hasValue
          ? translateRuntime("game.action.renameUpdated")
          : translateRuntime("game.action.renameCleared"),
      };
    },
    setAnimalThumbnail: (animalId: string, dataUrl: string) => {
      const synced = syncCurrentSnapshot();
      const result = updateAnimalThumbnail(synced, animalId, dataUrl);
      if (!result.ok && result.reason === "invalid-image-format") {
        return {
          ok: false,
          message: translateRuntime("game.reason.invalidImageFormat"),
        };
      }
      if (!result.ok) {
        return {
          ok: false,
          message: translateReason("Selected animal not found."),
        };
      }

      set({
        ownedAnimals: result.state.ownedAnimals,
      });

      void persistSnapshot(repo, result.state);

      return {
        ok: true,
        message: result.hasValue
          ? translateRuntime("game.action.thumbnailUpdated")
          : translateRuntime("game.action.thumbnailCleared"),
      };
    },
    setSelectedAnimalThumbnail: (dataUrl: string) => {
      const selectedAnimalId = get().selectedAnimalId;
      if (!selectedAnimalId) {
        return {
          ok: false,
          message: translateRuntime("game.reason.selectFirst"),
        };
      }

      return get().setAnimalThumbnail(selectedAnimalId, dataUrl);
    },
  } satisfies Pick<
    GameStore,
    | "selectAnimal"
    | "buyAnimal"
    | "sellAnimal"
    | "buyFeed"
    | "feedSelectedAnimal"
    | "moveAnimal"
    | "renameAnimal"
    | "setAnimalThumbnail"
    | "setSelectedAnimalThumbnail"
  >;
}
