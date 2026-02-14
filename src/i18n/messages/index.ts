import { enMessages } from "./en";
import { koMessages } from "./ko";

export const LANGUAGE_STORAGE_KEY = "petverse.language";
export const DEFAULT_LANGUAGE = "en";

export type Language = "en" | "ko";
export type MessageKey = keyof typeof enMessages;

export const messages: Record<Language, Record<MessageKey, string>> = {
  en: enMessages,
  ko: koMessages,
};

export function isLanguage(value: string): value is Language {
  return value === "en" || value === "ko";
}
