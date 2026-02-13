"use client";

import { useState } from "react";

import { useGameStore } from "@/game/store/useGameStore";
import { ANIMAL_NAME_KEYS } from "@/i18n/gameText";
import { useI18n } from "@/i18n/provider";

export default function InventoryView() {
  const { t } = useI18n();
  const coins = useGameStore((state) => state.coins);
  const feed = useGameStore((state) => state.inventory.feed);
  const ownedAnimals = useGameStore((state) => state.ownedAnimals);
  const placements = useGameStore((state) => state.placements);
  const sellAnimal = useGameStore((state) => state.sellAnimal);
  const [message, setMessage] = useState(t("inventory.selectToSell"));

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-stone-300 bg-[#f8f4ea] p-4">
        <h2 className="text-2xl font-semibold text-stone-800">{t("inventory.title")}</h2>
        <p className="mt-1 text-sm text-stone-600">{t("inventory.subtitle")}</p>
        <p className="mt-2 text-sm font-semibold text-stone-700">
          {t("inventory.currentCoins")}: {coins}
        </p>
      </div>

      <div className="rounded-xl border border-stone-300 bg-[#f8f4ea] p-4">
        <h3 className="text-lg font-semibold text-stone-800">{t("inventory.feedTitle")}</h3>
        <p className="mt-1 text-sm text-stone-700">{t("inventory.basicFeed", { count: feed })}</p>
      </div>

      <div className="rounded-xl border border-stone-300 bg-[#f8f4ea] p-4">
        <h3 className="text-lg font-semibold text-stone-800">
          {t("inventory.ownedAnimals", { count: ownedAnimals.length })}
        </h3>
        {ownedAnimals.length === 0 ? (
          <p className="mt-2 text-sm text-stone-600">{t("inventory.none")}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {ownedAnimals.map((animal) => {
              const placement = placements[animal.id];
              const animalName = t(ANIMAL_NAME_KEYS[animal.animalKey]);
              return (
                <li key={animal.id} className="rounded-lg border border-stone-200 bg-[#fdfbf5] p-3">
                  <p className="text-sm font-semibold text-stone-800">{animalName}</p>
                  <p className="text-sm text-stone-600">
                    {t("inventory.statusLine", {
                      age: animal.age,
                      hunger: Math.round(animal.hunger),
                      state: animal.isDead ? t("common.dead") : t("common.alive"),
                    })}
                  </p>
                  <p className="text-xs text-stone-500">
                    {t("inventory.placement", {
                      x: placement?.x ?? 0,
                      z: placement?.z ?? 0,
                      rotation: placement?.rotation ?? 0,
                    })}
                  </p>
                  <button
                    type="button"
                    className="mt-3 rounded-md bg-rose-700 px-3 py-2 text-sm font-semibold text-rose-50"
                    onClick={() => {
                      const result = sellAnimal(animal.id);
                      setMessage(result.message);
                    }}
                  >
                    {t("inventory.sellAnimal")}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="rounded-lg border border-stone-300 bg-[#f8f4ea] px-4 py-3 text-sm text-stone-700">
        {message}
      </p>
    </section>
  );
}
