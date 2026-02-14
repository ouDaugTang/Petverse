import type { AnimalKey, CagePlacement, GameSnapshot } from "@/game";

export type StoreActionResult = {
  ok: boolean;
  message: string;
};

export type GameStore = GameSnapshot & {
  selectedAnimalId: string | null;
  hydrated: boolean;
  initialize: () => Promise<void>;
  syncWorldTime: () => void;
  selectAnimal: (animalId: string | null) => void;
  buyAnimal: (animalKey: AnimalKey) => StoreActionResult;
  sellAnimal: (animalId: string) => StoreActionResult;
  buyFeed: (quantity?: number) => StoreActionResult;
  feedSelectedAnimal: () => StoreActionResult;
  moveAnimal: (animalId: string, placement: CagePlacement) => void;
  renameAnimal: (animalId: string, nickname: string) => StoreActionResult;
  setAnimalThumbnail: (animalId: string, dataUrl: string) => StoreActionResult;
  setSelectedAnimalThumbnail: (dataUrl: string) => StoreActionResult;
};

export type SetGameState = (partial: Partial<GameStore>) => void;
export type GetGameState = () => GameStore;
