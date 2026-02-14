import { normalizeThumbnailRef } from "@/game/model/thumbnailRef";

export type AnimalKey = "guineaPig" | "fennec" | "otter";
export type AnimalVariantKey = string;

export type OwnedAnimal = {
  id: string;
  animalKey: AnimalKey;
  variantKey: AnimalVariantKey;
  age: number;
  hunger: number;
  isDead: boolean;
  lastUpdatedAt: number;
  ageProgressMs: number;
  nickname?: string;
  thumbnailDataUrl?: string;
};

export type CagePlacement = {
  x: number;
  z: number;
  rotation: number;
};

export type Inventory = {
  feed: number;
};

export type GameSnapshot = {
  coins: number;
  inventory: Inventory;
  ownedAnimals: OwnedAnimal[];
  placements: Record<string, CagePlacement>;
};

export type AnimalCatalogItem = {
  key: AnimalKey;
  name: string;
  price: number;
  variants: AnimalVariantCatalogItem[];
};

export type AnimalVariantCatalogItem = {
  key: AnimalVariantKey;
  name: string;
  modelPath: string;
  fallbackModelPaths?: string[];
  thumbnailPath?: string;
  fallbackColor: string;
  modelYawOffset?: number;
};

export type FeedCatalogItem = {
  key: "basicFeed";
  name: string;
  price: number;
  hungerRestore: number;
};

const DEFAULT_HUNGER_MAX = 100;

function asFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function asFiniteInteger(value: unknown): number | null {
  const parsed = asFiniteNumber(value);
  if (parsed === null) {
    return null;
  }

  return Math.trunc(parsed);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeOwnedAnimal(value: unknown, now: number): OwnedAnimal | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Partial<OwnedAnimal> & {
    animalKey?: unknown;
    variantKey?: unknown;
    level?: unknown;
    xp?: unknown;
  };

  const normalizedAnimalKey = normalizeAnimalKey(candidate.animalKey);
  if (typeof candidate.id !== "string" || !normalizedAnimalKey) {
    return null;
  }

  const legacyLevel = asFiniteInteger(candidate.level);
  const normalizedAge =
    asFiniteInteger(candidate.age) ?? (legacyLevel !== null ? Math.max(0, legacyLevel) : 0);
  const normalizedHunger = clamp(asFiniteNumber(candidate.hunger) ?? DEFAULT_HUNGER_MAX, 0, 100);
  const normalizedLastUpdatedAt = asFiniteInteger(candidate.lastUpdatedAt) ?? now;
  const normalizedAgeProgressMs = Math.max(0, asFiniteInteger(candidate.ageProgressMs) ?? 0);
  const normalizedIsDead = Boolean(candidate.isDead) || normalizedHunger <= 0;
  const normalizedVariantKey =
    typeof candidate.variantKey === "string" && candidate.variantKey.trim().length > 0
      ? candidate.variantKey.trim()
      : "default";
  const normalizedNickname =
    typeof candidate.nickname === "string" ? candidate.nickname.trim().slice(0, 32) : undefined;
  const normalizedThumbnailDataUrl =
    typeof candidate.thumbnailDataUrl === "string"
      ? normalizeThumbnailRef(candidate.thumbnailDataUrl)
      : undefined;

  return {
    id: candidate.id,
    animalKey: normalizedAnimalKey,
    variantKey: normalizedVariantKey,
    age: normalizedAge,
    hunger: normalizedIsDead ? 0 : normalizedHunger,
    isDead: normalizedIsDead,
    lastUpdatedAt: normalizedLastUpdatedAt,
    ageProgressMs: normalizedAgeProgressMs,
    nickname: normalizedNickname || undefined,
    thumbnailDataUrl: normalizedThumbnailDataUrl,
  };
}

function normalizeAnimalKey(value: unknown): AnimalKey | null {
  if (value === "capybara") {
    return "guineaPig";
  }

  return isAnimalKey(value) ? value : null;
}

function normalizePlacements(value: unknown): Record<string, CagePlacement> | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const entries = Object.entries(value);
  const next: Record<string, CagePlacement> = {};

  for (const [animalId, placement] of entries) {
    if (typeof placement !== "object" || placement === null) {
      continue;
    }

    const candidate = placement as Partial<CagePlacement>;
    const x = asFiniteNumber(candidate.x);
    const z = asFiniteNumber(candidate.z);
    const rotation = asFiniteNumber(candidate.rotation);

    if (x === null || z === null || rotation === null) {
      continue;
    }

    next[animalId] = { x, z, rotation };
  }

  return next;
}

export function isAnimalKey(value: unknown): value is AnimalKey {
  return value === "guineaPig" || value === "fennec" || value === "otter";
}

export function parseGameSnapshot(value: unknown): GameSnapshot | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const now = Date.now();
  const parsed = value as Partial<GameSnapshot>;
  const coins = asFiniteInteger(parsed.coins);
  const feed = asFiniteInteger(parsed.inventory?.feed);

  if (coins === null || feed === null) {
    return null;
  }

  if (!Array.isArray(parsed.ownedAnimals)) {
    return null;
  }

  const normalizedAnimals: OwnedAnimal[] = [];
  for (const animal of parsed.ownedAnimals) {
    const normalizedAnimal = normalizeOwnedAnimal(animal, now);
    if (!normalizedAnimal) {
      return null;
    }

    normalizedAnimals.push(normalizedAnimal);
  }

  const placements = normalizePlacements(parsed.placements);
  if (!placements) {
    return null;
  }

  return {
    coins,
    inventory: {
      feed: Math.max(0, feed),
    },
    ownedAnimals: normalizedAnimals,
    placements,
  };
}

export function isGameSnapshot(value: unknown): value is GameSnapshot {
  const parsed = parseGameSnapshot(value);
  if (!parsed) {
    return false;
  }

  for (const animal of parsed.ownedAnimals) {
    if (
      typeof animal.id !== "string" ||
      !isAnimalKey(animal.animalKey) ||
      typeof animal.variantKey !== "string" ||
      typeof animal.age !== "number" ||
      typeof animal.hunger !== "number" ||
      typeof animal.isDead !== "boolean" ||
      typeof animal.lastUpdatedAt !== "number" ||
      typeof animal.ageProgressMs !== "number" ||
      (animal.nickname !== undefined && typeof animal.nickname !== "string") ||
      (animal.thumbnailDataUrl !== undefined && typeof animal.thumbnailDataUrl !== "string")
    ) {
      return false;
    }
  }

  return true;
}
