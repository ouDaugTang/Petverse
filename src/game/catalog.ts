import type { AnimalCatalogItem, AnimalKey, FeedCatalogItem } from "@/game/types";

export const STARTER_COINS = 120;
export const STARTER_FEED = 3;
export const DAY_IN_MS = 24 * 60 * 60 * 1000;
export const HUNGER_MAX = 100;
export const HUNGER_DECAY_PER_DAY = 40;

export const ANIMAL_CATALOG: AnimalCatalogItem[] = [
  {
    key: "guineaPig",
    name: "Guinea Pig",
    price: 35,
    modelPath: "/models/animals/guineaPig.glb",
    fallbackModelPaths: ["/models/animals/capybara.glb"],
    thumbnailPath: "/images/animals/guineaPig.svg",
    fallbackColor: "#b08056",
    modelYawOffset: Math.PI,
  },
  {
    key: "fennec",
    name: "Fennec",
    price: 45,
    modelPath: "/models/animals/fennec.glb",
    thumbnailPath: "/images/animals/fennec.svg",
    fallbackColor: "#e7c48d",
  },
  {
    key: "otter",
    name: "Otter",
    price: 55,
    modelPath: "/models/animals/otter.glb",
    thumbnailPath: "/images/animals/otter.svg",
    fallbackColor: "#7d6a58",
  },
];

export const FEED_CATALOG: FeedCatalogItem = {
  key: "basicFeed",
  name: "Basic Feed",
  price: 6,
  hungerRestore: 45,
};

export const ANIMAL_BY_KEY = ANIMAL_CATALOG.reduce(
  (accumulator, animal) => {
    accumulator[animal.key] = animal;
    return accumulator;
  },
  {} as Record<AnimalKey, AnimalCatalogItem>
);
