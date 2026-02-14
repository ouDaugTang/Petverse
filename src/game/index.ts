export {
  ANIMAL_BY_KEY,
  ANIMAL_CATALOG,
  FEED_CATALOG,
  STARTER_COINS,
  STARTER_FEED,
  DAY_IN_MS,
  HUNGER_DECAY_PER_DAY,
  HUNGER_MAX,
} from "@/game/catalog";
export {
  CAGE_BOUNDS,
  advanceGameTime,
  clampPlacement,
  feedAnimal,
  placementForIndex,
  purchaseAnimal,
  purchaseFeed,
  sellAnimal,
} from "@/game/logic";
export { createDefaultGameSnapshot } from "@/game/defaultState";
export {
  parseGameSnapshot,
  isAnimalKey,
  isGameSnapshot,
  type AnimalKey,
  type CagePlacement,
  type FeedCatalogItem,
  type GameSnapshot,
  type OwnedAnimal,
  type AnimalCatalogItem,
} from "@/game/types";
export { useGameStore } from "@/game/store";
