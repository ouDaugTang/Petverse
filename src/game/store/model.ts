import type { GameSnapshot } from "@/game/types";
import { normalizeThumbnailRef } from "@/game/model/thumbnailRef";

type UpdateAnimalResult =
  | {
      ok: false;
      reason: "not-found" | "invalid-image-format";
    }
  | {
      ok: true;
      state: GameSnapshot;
      hasValue: boolean;
    };

export function normalizeNickname(nickname: string): string | undefined {
  const normalized = nickname.trim().slice(0, 32);
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeThumbnailDataUrl(dataUrl: string): string | undefined {
  return normalizeThumbnailRef(dataUrl);
}

export function updateAnimalNickname(
  snapshot: GameSnapshot,
  animalId: string,
  nickname: string
): UpdateAnimalResult {
  const targetIndex = snapshot.ownedAnimals.findIndex((animal) => animal.id === animalId);
  if (targetIndex === -1) {
    return { ok: false, reason: "not-found" };
  }

  const nextNickname = normalizeNickname(nickname);
  const nextAnimals = [...snapshot.ownedAnimals];
  nextAnimals[targetIndex] = {
    ...nextAnimals[targetIndex],
    nickname: nextNickname,
  };

  return {
    ok: true,
    state: {
      ...snapshot,
      ownedAnimals: nextAnimals,
    },
    hasValue: Boolean(nextNickname),
  };
}

export function updateAnimalThumbnail(
  snapshot: GameSnapshot,
  animalId: string,
  dataUrl: string
): UpdateAnimalResult {
  const targetIndex = snapshot.ownedAnimals.findIndex((animal) => animal.id === animalId);
  if (targetIndex === -1) {
    return { ok: false, reason: "not-found" };
  }

  const nextThumbnail = normalizeThumbnailDataUrl(dataUrl);
  if (dataUrl.trim().length > 0 && !nextThumbnail) {
    return { ok: false, reason: "invalid-image-format" };
  }

  const nextAnimals = [...snapshot.ownedAnimals];
  nextAnimals[targetIndex] = {
    ...nextAnimals[targetIndex],
    thumbnailDataUrl: nextThumbnail,
  };

  return {
    ok: true,
    state: {
      ...snapshot,
      ownedAnimals: nextAnimals,
    },
    hasValue: Boolean(nextThumbnail),
  };
}
