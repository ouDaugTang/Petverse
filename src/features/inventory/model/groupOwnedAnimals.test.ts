import type { OwnedAnimal } from "@/game";
import { groupOwnedAnimals } from "@/features/inventory/model";

function createOwnedAnimal(
  id: string,
  animalKey: OwnedAnimal["animalKey"],
  variantKey: string
): OwnedAnimal {
  return {
    id,
    animalKey,
    variantKey,
    age: 1,
    hunger: 80,
    isDead: false,
    lastUpdatedAt: 1,
    ageProgressMs: 0,
  };
}

describe("groupOwnedAnimals", () => {
  it("groups by species and then by variant", () => {
    const ownedAnimals: OwnedAnimal[] = [
      createOwnedAnimal("a1", "guineaPig", "default"),
      createOwnedAnimal("a2", "guineaPig", "cream"),
      createOwnedAnimal("a3", "fennec", "pale"),
    ];

    const grouped = groupOwnedAnimals(ownedAnimals);

    expect(grouped).toHaveLength(2);
    expect(grouped[0].animalKey).toBe("guineaPig");
    expect(grouped[0].variants.map((group) => group.variantKey)).toEqual(["default", "cream"]);
    expect(grouped[1].animalKey).toBe("fennec");
    expect(grouped[1].variants.map((group) => group.variantKey)).toEqual(["pale"]);
  });

  it("keeps unknown variants in inventory groups", () => {
    const ownedAnimals: OwnedAnimal[] = [
      createOwnedAnimal("a1", "guineaPig", "default"),
      createOwnedAnimal("a2", "guineaPig", "mysteryBlue"),
    ];

    const grouped = groupOwnedAnimals(ownedAnimals);
    const guineaPigGroup = grouped.find((group) => group.animalKey === "guineaPig");

    expect(guineaPigGroup).toBeDefined();
    expect(guineaPigGroup?.variants.map((group) => group.variantKey)).toEqual([
      "default",
      "mysteryBlue",
    ]);
    expect(guineaPigGroup?.variants.find((group) => group.variantKey === "mysteryBlue")?.members).toHaveLength(1);
  });
});
