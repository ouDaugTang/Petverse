import { animalMessagesEn } from "./animals";
import { commonMessagesEn } from "./common";
import { gameMessagesEn } from "./game";

export const enMessages = {
  ...commonMessagesEn,
  ...gameMessagesEn,
  ...animalMessagesEn,
} as const;
