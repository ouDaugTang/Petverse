import type { AnimalKey } from "@/game/types";
import type { MessageKey } from "@/i18n/messages";

export const ANIMAL_NAME_KEYS: Record<AnimalKey, MessageKey> = {
  guineaPig: "animal.guineaPig",
  fennec: "animal.fennec",
  otter: "animal.otter",
};

export const FEED_NAME_KEY: MessageKey = "feed.basic.name";
