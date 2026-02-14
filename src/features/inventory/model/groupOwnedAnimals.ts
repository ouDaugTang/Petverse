import { ANIMAL_BY_KEY, ANIMAL_CATALOG, type AnimalKey, type OwnedAnimal } from "@/game";

type GroupedOwnedAnimalVariants = {
  variantKey: string;
  members: OwnedAnimal[];
};

type GroupedOwnedAnimals = {
  animalKey: AnimalKey;
  members: OwnedAnimal[];
  variants: GroupedOwnedAnimalVariants[];
};

function sortVariantGroups(animalKey: AnimalKey, groups: GroupedOwnedAnimalVariants[]) {
  const knownVariantOrder = new Map(
    ANIMAL_BY_KEY[animalKey].variants.map((variant, index) => [variant.key, index])
  );

  return groups.sort((left, right) => {
    const leftIndex = knownVariantOrder.get(left.variantKey);
    const rightIndex = knownVariantOrder.get(right.variantKey);

    if (leftIndex !== undefined && rightIndex !== undefined) {
      return leftIndex - rightIndex;
    }

    if (leftIndex !== undefined) {
      return -1;
    }

    if (rightIndex !== undefined) {
      return 1;
    }

    return left.variantKey.localeCompare(right.variantKey);
  });
}

export function groupOwnedAnimals(ownedAnimals: OwnedAnimal[]): GroupedOwnedAnimals[] {
  const grouped = new Map<AnimalKey, OwnedAnimal[]>();
  for (const animal of ownedAnimals) {
    const list = grouped.get(animal.animalKey) ?? [];
    list.push(animal);
    grouped.set(animal.animalKey, list);
  }

  return ANIMAL_CATALOG.map((animal) => {
    const members = grouped.get(animal.key) ?? [];
    const groupedByVariant = new Map<string, OwnedAnimal[]>();

    for (const member of members) {
      const variantMembers = groupedByVariant.get(member.variantKey) ?? [];
      variantMembers.push(member);
      groupedByVariant.set(member.variantKey, variantMembers);
    }

    const variants = sortVariantGroups(
      animal.key,
      Array.from(groupedByVariant.entries()).map(([variantKey, variantMembers]) => ({
        variantKey,
        members: variantMembers,
      }))
    );

    return {
      animalKey: animal.key,
      members,
      variants,
    };
  }).filter((group) => group.members.length > 0);
}
