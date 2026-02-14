import { enMessages } from "../en";

import { animalMessagesKo } from "./animals";
import { commonMessagesKo } from "./common";
import { gameMessagesKo } from "./game";

export const koMessages: Record<keyof typeof enMessages, string> = {
  ...enMessages,
  ...commonMessagesKo,
  ...gameMessagesKo,
  ...animalMessagesKo,
};
