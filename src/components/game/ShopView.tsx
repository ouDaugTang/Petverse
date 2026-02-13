"use client";

import { useState } from "react";

import { ANIMAL_CATALOG, FEED_CATALOG } from "@/game/catalog";
import { useGameStore } from "@/game/store/useGameStore";
import { ANIMAL_NAME_KEYS, FEED_NAME_KEY } from "@/i18n/gameText";
import { useI18n } from "@/i18n/provider";

export default function ShopView() {
  const { t } = useI18n();
  const coins = useGameStore((state) => state.coins);
  const buyAnimal = useGameStore((state) => state.buyAnimal);
  const buyFeed = useGameStore((state) => state.buyFeed);
  const [message, setMessage] = useState(t("shop.welcome"));

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-stone-300 bg-[#f8f4ea] p-4">
        <h2 className="text-2xl font-semibold text-stone-800">{t("shop.title")}</h2>
        <p className="mt-1 text-sm text-stone-600">{t("shop.subtitle")}</p>
        <p className="mt-2 text-sm font-semibold text-stone-700">
          {t("shop.currentCoins")}: {coins}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {ANIMAL_CATALOG.map((animal) => (
          <article key={animal.key} className="rounded-xl border border-stone-300 bg-[#f8f4ea] p-4">
            <h3 className="text-lg font-semibold text-stone-800">
              {t(ANIMAL_NAME_KEYS[animal.key])}
            </h3>
            <p className="mt-1 text-sm text-stone-600">
              {t("shop.price", { price: animal.price })}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              {t("shop.modelPath", { path: animal.modelPath })}
            </p>
            <button
              type="button"
              className="mt-3 rounded-md bg-stone-800 px-3 py-2 text-sm font-semibold text-stone-100 disabled:cursor-not-allowed disabled:bg-stone-400"
              disabled={coins < animal.price}
              onClick={() => {
                const result = buyAnimal(animal.key);
                setMessage(result.message);
              }}
            >
              {t("shop.buyAnimal")}
            </button>
          </article>
        ))}
      </div>

      <article className="rounded-xl border border-stone-300 bg-[#f8f4ea] p-4">
        <h3 className="text-lg font-semibold text-stone-800">{t(FEED_NAME_KEY)}</h3>
        <p className="mt-1 text-sm text-stone-600">
          {t("shop.price", { price: FEED_CATALOG.price })}
        </p>
        <p className="mt-1 text-sm text-stone-600">
          {t("shop.feedEffect", { hunger: FEED_CATALOG.hungerRestore })}
        </p>
        <button
          type="button"
          className="mt-3 rounded-md bg-stone-800 px-3 py-2 text-sm font-semibold text-stone-100 disabled:cursor-not-allowed disabled:bg-stone-400"
          disabled={coins < FEED_CATALOG.price}
          onClick={() => {
            const result = buyFeed(1);
            setMessage(result.message);
          }}
        >
          {t("shop.buyFeed")}
        </button>
      </article>

      <p className="rounded-lg border border-stone-300 bg-[#f8f4ea] px-4 py-3 text-sm text-stone-700">
        {message}
      </p>
    </section>
  );
}
