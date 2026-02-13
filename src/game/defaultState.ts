import { STARTER_COINS, STARTER_FEED } from "@/game/catalog";
import type { GameSnapshot } from "@/game/types";

export function createDefaultGameSnapshot(): GameSnapshot {
  return {
    coins: STARTER_COINS,
    inventory: {
      feed: STARTER_FEED,
    },
    ownedAnimals: [],
    placements: {},
  };
}
