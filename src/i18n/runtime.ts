import type { AnimalKey } from "@/game/types";
import { ANIMAL_NAME_KEYS, FEED_NAME_KEY } from "@/i18n/gameText";
import {
  DEFAULT_LANGUAGE,
  isLanguage,
  LANGUAGE_STORAGE_KEY,
  messages,
  type Language,
  type MessageKey,
} from "@/i18n/messages";
import { formatMessage } from "@/i18n/translate";

const REASON_TO_MESSAGE_KEY: Record<string, MessageKey> = {
  "Unknown animal.": "game.reason.unknownAnimal",
  "Not enough coins.": "game.reason.notEnoughCoins",
  "No feed left.": "game.reason.noFeed",
  "Selected animal not found.": "game.reason.selectedNotFound",
  "Selected animal is dead.": "game.reason.selectedDead",
};

function detectLanguage(): Language {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored && isLanguage(stored)) {
    return stored;
  }

  const browserLanguage = window.navigator.language.toLowerCase();
  return browserLanguage.startsWith("ko") ? "ko" : DEFAULT_LANGUAGE;
}

export function translateRuntime(
  key: MessageKey,
  params?: Record<string, string | number | null | undefined>
): string {
  const language = detectLanguage();
  const template = messages[language][key] ?? messages[DEFAULT_LANGUAGE][key];
  return formatMessage(template, params);
}

export function translateReason(reason: string): string {
  const mappedKey = REASON_TO_MESSAGE_KEY[reason];
  if (!mappedKey) {
    return reason;
  }

  return translateRuntime(mappedKey);
}

export function translateAnimalNameRuntime(animalKey: AnimalKey): string {
  return translateRuntime(ANIMAL_NAME_KEYS[animalKey]);
}

export function translateFeedNameRuntime(): string {
  return translateRuntime(FEED_NAME_KEY);
}
