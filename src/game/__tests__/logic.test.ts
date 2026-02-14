import { DAY_IN_MS, HUNGER_DECAY_PER_DAY, HUNGER_MAX } from "@/game/catalog";
import { advanceGameTime, feedAnimal, purchaseAnimal, sellAnimal } from "@/game/logic";
import { createDefaultGameSnapshot } from "@/game/defaultState";

describe("game logic", () => {
  it("purchasing an animal deducts coins and initializes age/hunger state", () => {
    const now = 1_700_000_000_000;
    const initial = createDefaultGameSnapshot();
    const result = purchaseAnimal(initial, "guineaPig", {
      idFactory: () => "animal-1",
      now,
      variantKey: "cream",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.state.coins).toBe(initial.coins - 35);
    expect(result.state.ownedAnimals).toHaveLength(1);
    expect(result.state.ownedAnimals[0]).toMatchObject({
      id: "animal-1",
      animalKey: "guineaPig",
      variantKey: "cream",
      age: 0,
      hunger: HUNGER_MAX,
      isDead: false,
      ageProgressMs: 0,
      lastUpdatedAt: now,
    });
    expect(result.state.placements["animal-1"]).toBeDefined();
  });

  it("feeding consumes feed and restores hunger", () => {
    const now = 1_700_000_000_000;
    const base = createDefaultGameSnapshot();
    const purchased = purchaseAnimal(base, "fennec", { idFactory: () => "animal-2", now });
    if (!purchased.ok) {
      throw new Error("Setup failed for test.");
    }

    const advanced = advanceGameTime(
      {
        ...purchased.state,
        inventory: {
          ...purchased.state.inventory,
          feed: 2,
        },
      },
      now + DAY_IN_MS / 2
    );
    const beforeFeed = advanced.ownedAnimals[0].hunger;
    const fed = feedAnimal(advanced, "animal-2");

    expect(fed.ok).toBe(true);
    if (!fed.ok) {
      return;
    }

    expect(fed.state.inventory.feed).toBe(1);
    expect(fed.state.ownedAnimals[0].variantKey).toBe("default");
    expect(fed.state.ownedAnimals[0].hunger).toBeGreaterThan(beforeFeed);
    expect(fed.state.ownedAnimals[0].hunger).toBeLessThanOrEqual(HUNGER_MAX);
  });

  it("age increases by one after a full day in the cage", () => {
    const now = 1_700_000_000_000;
    const base = createDefaultGameSnapshot();
    const purchased = purchaseAnimal(base, "otter", { idFactory: () => "animal-3", now });
    if (!purchased.ok) {
      throw new Error("Setup failed for test.");
    }

    const advanced = advanceGameTime(purchased.state, now + DAY_IN_MS);
    expect(advanced.ownedAnimals[0].age).toBe(1);
    expect(advanced.ownedAnimals[0].isDead).toBe(false);
  });

  it("animal dies when hunger reaches zero over time", () => {
    const now = 1_700_000_000_000;
    const base = createDefaultGameSnapshot();
    const purchased = purchaseAnimal(base, "guineaPig", { idFactory: () => "animal-4", now });
    if (!purchased.ok) {
      throw new Error("Setup failed for test.");
    }

    const daysToStarve = HUNGER_MAX / HUNGER_DECAY_PER_DAY;
    const advanced = advanceGameTime(
      purchased.state,
      now + Math.ceil(daysToStarve * DAY_IN_MS + 1)
    );

    expect(advanced.ownedAnimals[0].hunger).toBe(0);
    expect(advanced.ownedAnimals[0].isDead).toBe(true);
  });

  it("selling an animal refunds coins and removes placement", () => {
    const base = createDefaultGameSnapshot();
    const purchased = purchaseAnimal(base, "otter", { idFactory: () => "animal-5" });
    if (!purchased.ok) {
      throw new Error("Setup failed for test.");
    }

    const sold = sellAnimal(purchased.state, "animal-5");
    expect(sold.ok).toBe(true);
    if (!sold.ok) {
      return;
    }

    expect(sold.state.coins).toBe(purchased.state.coins + 33);
    expect(sold.state.ownedAnimals).toHaveLength(0);
    expect(sold.state.placements["animal-5"]).toBeUndefined();
  });
});
