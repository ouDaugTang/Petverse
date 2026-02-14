import { ANIMAL_CATALOG, type AnimalKey, type OwnedAnimal } from "@/game";

type GroupedOwnedAnimals = {
  animal: (typeof ANIMAL_CATALOG)[number];
  members: OwnedAnimal[];
};

export function groupOwnedAnimals(ownedAnimals: OwnedAnimal[]): GroupedOwnedAnimals[] {
  const grouped = new Map<AnimalKey, OwnedAnimal[]>();
  for (const animal of ownedAnimals) {
    const list = grouped.get(animal.animalKey) ?? [];
    list.push(animal);
    grouped.set(animal.animalKey, list);
  }

  return ANIMAL_CATALOG.map((animal) => ({
    animal,
    members: grouped.get(animal.key) ?? [],
  })).filter((group) => group.members.length > 0);
}
