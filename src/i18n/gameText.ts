import type { AnimalKey } from "@/game";
import type { MessageKey } from "@/i18n/messages/index";

export const ANIMAL_NAME_KEYS: Record<AnimalKey, MessageKey> = {
  guineaPig: "animal.guineaPig",
  fennec: "animal.fennec",
  otter: "animal.otter",
};

export const ANIMAL_VARIANT_NAME_KEYS: Record<AnimalKey, Record<string, MessageKey>> = {
  guineaPig: {
    default: "animal.variant.guineaPig.default",
    cream: "animal.variant.guineaPig.cream",
    dark: "animal.variant.guineaPig.dark",
  },
  fennec: {
    default: "animal.variant.fennec.default",
    pale: "animal.variant.fennec.pale",
  },
  otter: {
    default: "animal.variant.otter.default",
    silver: "animal.variant.otter.silver",
  },
};

export function getAnimalVariantNameKey(animalKey: AnimalKey, variantKey?: string): MessageKey {
  if (!variantKey) {
    return ANIMAL_VARIANT_NAME_KEYS[animalKey].default ?? ANIMAL_NAME_KEYS[animalKey];
  }

  return ANIMAL_VARIANT_NAME_KEYS[animalKey][variantKey] ?? ANIMAL_NAME_KEYS[animalKey];
}

export const FEED_NAME_KEY: MessageKey = "feed.basic.name";
