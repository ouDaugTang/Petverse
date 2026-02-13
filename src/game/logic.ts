import {
  ANIMAL_BY_KEY,
  DAY_IN_MS,
  FEED_CATALOG,
  HUNGER_DECAY_PER_DAY,
  HUNGER_MAX,
} from "@/game/catalog";
import type { AnimalKey, CagePlacement, GameSnapshot, OwnedAnimal } from "@/game/types";

type ActionFailure = {
  ok: false;
  state: GameSnapshot;
  reason: string;
};

type ActionSuccess<TMeta = undefined> = {
  ok: true;
  state: GameSnapshot;
  meta: TMeta;
};

export type ActionResult<TMeta = undefined> = ActionFailure | ActionSuccess<TMeta>;

type PurchaseAnimalOptions = {
  idFactory?: () => string;
  now?: number;
};

export const CAGE_BOUNDS = {
  minX: -4.2,
  maxX: 4.2,
  minZ: -4.2,
  maxZ: 4.2,
} as const;

const CAGE_SLOTS: CagePlacement[] = [
  { x: -2.2, z: -1.4, rotation: 0.6 },
  { x: 0.2, z: -0.5, rotation: -0.15 },
  { x: 2.3, z: 1.1, rotation: -0.7 },
  { x: -1.8, z: 1.8, rotation: 0.3 },
  { x: 1.4, z: -2.1, rotation: 0.95 },
];

const defaultIdFactory = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `animal-${Date.now()}`;
};

const failure = (state: GameSnapshot, reason: string): ActionFailure => ({
  ok: false,
  state,
  reason,
});

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeNow(now?: number): number {
  if (typeof now === "number" && Number.isFinite(now)) {
    return Math.trunc(now);
  }

  return Date.now();
}

function simulateAnimalOverTime(animal: OwnedAnimal, elapsedMs: number): OwnedAnimal {
  if (elapsedMs <= 0) {
    return animal;
  }

  if (animal.isDead || animal.hunger <= 0) {
    return {
      ...animal,
      hunger: 0,
      isDead: true,
    };
  }

  const hungerDecayPerMs = HUNGER_DECAY_PER_DAY / DAY_IN_MS;
  const timeToStarveMs =
    hungerDecayPerMs <= 0 ? Number.POSITIVE_INFINITY : animal.hunger / hungerDecayPerMs;
  const aliveElapsedMs = Math.min(elapsedMs, timeToStarveMs);
  const hungerAfterElapsed = Math.max(0, animal.hunger - aliveElapsedMs * hungerDecayPerMs);

  let nextAge = animal.age;
  let nextAgeProgressMs = animal.ageProgressMs + aliveElapsedMs;
  const ageGained = Math.floor(nextAgeProgressMs / DAY_IN_MS);
  if (ageGained > 0) {
    nextAge += ageGained;
    nextAgeProgressMs -= ageGained * DAY_IN_MS;
  }

  const diedFromStarvation = aliveElapsedMs < elapsedMs || hungerAfterElapsed <= 0;

  return {
    ...animal,
    age: nextAge,
    ageProgressMs: Math.max(0, Math.trunc(nextAgeProgressMs)),
    hunger: diedFromStarvation ? 0 : hungerAfterElapsed,
    isDead: diedFromStarvation,
  };
}

export function clampPlacement(placement: CagePlacement): CagePlacement {
  return {
    x: clamp(placement.x, CAGE_BOUNDS.minX, CAGE_BOUNDS.maxX),
    z: clamp(placement.z, CAGE_BOUNDS.minZ, CAGE_BOUNDS.maxZ),
    rotation: placement.rotation,
  };
}

export function placementForIndex(index: number): CagePlacement {
  const slot = CAGE_SLOTS[index % CAGE_SLOTS.length] ?? CAGE_SLOTS[0];
  return clampPlacement({ ...slot });
}

export function advanceGameTime(state: GameSnapshot, now?: number): GameSnapshot {
  const normalizedNow = normalizeNow(now);
  const nextAnimals = state.ownedAnimals.map((animal) => {
    const elapsedMs = Math.max(0, normalizedNow - animal.lastUpdatedAt);
    const simulated = simulateAnimalOverTime(animal, elapsedMs);

    return {
      ...simulated,
      lastUpdatedAt: normalizedNow,
    };
  });

  return {
    ...state,
    ownedAnimals: nextAnimals,
  };
}

export function purchaseAnimal(
  state: GameSnapshot,
  animalKey: AnimalKey,
  options?: PurchaseAnimalOptions
): ActionResult<{ animalId: string }> {
  const animalDefinition = ANIMAL_BY_KEY[animalKey];
  if (!animalDefinition) {
    return failure(state, "Unknown animal.");
  }

  if (state.coins < animalDefinition.price) {
    return failure(state, "Not enough coins.");
  }

  const now = normalizeNow(options?.now);
  const animalId = options?.idFactory?.() ?? defaultIdFactory();
  const nextAnimal: OwnedAnimal = {
    id: animalId,
    animalKey,
    age: 0,
    hunger: HUNGER_MAX,
    isDead: false,
    lastUpdatedAt: now,
    ageProgressMs: 0,
  };

  const placement = placementForIndex(state.ownedAnimals.length);
  const nextState: GameSnapshot = {
    ...state,
    coins: state.coins - animalDefinition.price,
    ownedAnimals: [...state.ownedAnimals, nextAnimal],
    placements: {
      ...state.placements,
      [animalId]: placement,
    },
  };

  return {
    ok: true,
    state: nextState,
    meta: {
      animalId,
    },
  };
}

export function purchaseFeed(state: GameSnapshot, quantity = 1): ActionResult {
  const parsedQuantity = Math.max(1, Math.floor(quantity));
  const totalCost = FEED_CATALOG.price * parsedQuantity;
  if (state.coins < totalCost) {
    return failure(state, "Not enough coins.");
  }

  return {
    ok: true,
    state: {
      ...state,
      coins: state.coins - totalCost,
      inventory: {
        ...state.inventory,
        feed: state.inventory.feed + parsedQuantity,
      },
    },
    meta: undefined,
  };
}

export function sellAnimal(
  state: GameSnapshot,
  animalId: string
): ActionResult<{ animalId: string; animalKey: AnimalKey; refundCoins: number }> {
  const target = state.ownedAnimals.find((animal) => animal.id === animalId);
  if (!target) {
    return failure(state, "Selected animal not found.");
  }

  const animalDefinition = ANIMAL_BY_KEY[target.animalKey];
  if (!animalDefinition) {
    return failure(state, "Unknown animal.");
  }

  const refundCoins = Math.max(1, Math.floor(animalDefinition.price * 0.6));
  const nextAnimals = state.ownedAnimals.filter((animal) => animal.id !== animalId);
  const nextPlacements = { ...state.placements };
  delete nextPlacements[animalId];

  return {
    ok: true,
    state: {
      ...state,
      coins: state.coins + refundCoins,
      ownedAnimals: nextAnimals,
      placements: nextPlacements,
    },
    meta: {
      animalId,
      animalKey: target.animalKey,
      refundCoins,
    },
  };
}

export function feedAnimal(
  state: GameSnapshot,
  animalId: string
): ActionResult<{ hunger: number }> {
  if (state.inventory.feed < 1) {
    return failure(state, "No feed left.");
  }

  const targetIndex = state.ownedAnimals.findIndex((animal) => animal.id === animalId);
  if (targetIndex === -1) {
    return failure(state, "Selected animal not found.");
  }

  const target = state.ownedAnimals[targetIndex];
  if (target.isDead) {
    return failure(state, "Selected animal is dead.");
  }

  const nextAnimals = [...state.ownedAnimals];
  const nextHunger = Math.min(HUNGER_MAX, target.hunger + FEED_CATALOG.hungerRestore);
  nextAnimals[targetIndex] = {
    ...target,
    hunger: nextHunger,
  };

  return {
    ok: true,
    state: {
      ...state,
      inventory: {
        ...state.inventory,
        feed: state.inventory.feed - 1,
      },
      ownedAnimals: nextAnimals,
    },
    meta: {
      hunger: nextHunger,
    },
  };
}
