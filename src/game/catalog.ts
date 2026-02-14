import type {
  AnimalCatalogItem,
  AnimalKey,
  AnimalVariantCatalogItem,
  AnimalVariantKey,
  FeedCatalogItem,
} from "@/game/types";

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
    variants: [
      {
        key: "default",
        name: "Classic",
        modelPath: "/models/animals/guineaPig.glb",
        fallbackModelPaths: ["/models/animals/capybara.glb"],
        thumbnailPath: "/images/animals/guineaPig.svg",
        fallbackColor: "#b08056",
        modelYawOffset: Math.PI,
      },
      {
        key: "cream",
        name: "Cream",
        modelPath: "/models/animals/guineaPig.glb",
        fallbackModelPaths: ["/models/animals/capybara.glb"],
        thumbnailPath: "/images/animals/guineaPig.svg",
        fallbackColor: "#c49a73",
        modelYawOffset: Math.PI,
      },
      {
        key: "dark",
        name: "Dark",
        modelPath: "/models/animals/guineaPig.glb",
        fallbackModelPaths: ["/models/animals/capybara.glb"],
        thumbnailPath: "/images/animals/guineaPig.svg",
        fallbackColor: "#7b5a3b",
        modelYawOffset: Math.PI,
      },
    ],
  },
  {
    key: "fennec",
    name: "Fennec",
    price: 45,
    variants: [
      {
        key: "default",
        name: "Sandy",
        modelPath: "/models/animals/fennec.glb",
        thumbnailPath: "/images/animals/fennec.svg",
        fallbackColor: "#e7c48d",
      },
      {
        key: "pale",
        name: "Pale",
        modelPath: "/models/animals/fennec.glb",
        thumbnailPath: "/images/animals/fennec.svg",
        fallbackColor: "#f0d6ad",
      },
    ],
  },
  {
    key: "otter",
    name: "Otter",
    price: 55,
    variants: [
      {
        key: "default",
        name: "River",
        modelPath: "/models/animals/otter.glb",
        thumbnailPath: "/images/animals/otter.svg",
        fallbackColor: "#7d6a58",
      },
      {
        key: "silver",
        name: "Silver",
        modelPath: "/models/animals/otter.glb",
        thumbnailPath: "/images/animals/otter.svg",
        fallbackColor: "#8f8478",
      },
    ],
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

export function getAnimalDefaultVariant(animalKey: AnimalKey): AnimalVariantCatalogItem {
  return ANIMAL_BY_KEY[animalKey].variants[0];
}

export function getAnimalVariant(
  animalKey: AnimalKey,
  variantKey?: AnimalVariantKey
): AnimalVariantCatalogItem {
  const animal = ANIMAL_BY_KEY[animalKey];
  if (!variantKey) {
    return getAnimalDefaultVariant(animalKey);
  }

  return animal.variants.find((variant) => variant.key === variantKey) ?? getAnimalDefaultVariant(animalKey);
}
