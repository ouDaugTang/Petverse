export {
  ANIMAL_BY_KEY,
  ANIMAL_CATALOG,
  getAnimalDefaultVariant,
  getAnimalVariant,
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
  ANIMAL_THUMBNAIL_BUCKET,
  isDataThumbnailRef,
  isStorageThumbnailRef,
  normalizeThumbnailRef,
  thumbnailRefFromStoragePath,
  thumbnailStoragePathFromRef,
} from "@/game/model/thumbnailRef";
export {
  parseGameSnapshot,
  isAnimalKey,
  isGameSnapshot,
  type AnimalKey,
  type AnimalVariantCatalogItem,
  type AnimalVariantKey,
  type CagePlacement,
  type FeedCatalogItem,
  type GameSnapshot,
  type OwnedAnimal,
  type AnimalCatalogItem,
} from "@/game/types";
export { useGameStore } from "@/game/store";
