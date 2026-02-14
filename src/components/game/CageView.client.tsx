"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import CageSceneCanvas from "@/components/game/CageSceneCanvas.client";
import { ANIMAL_NAME_KEYS, FEED_NAME_KEY, useI18n } from "@/i18n";
import { useGameStore } from "@/game/store";

export default function CageView() {
  const { t } = useI18n();
  const feed = useGameStore((state) => state.inventory.feed);
  const ownedAnimals = useGameStore((state) => state.ownedAnimals);
  const selectedAnimalId = useGameStore((state) => state.selectedAnimalId);
  const feedSelectedAnimal = useGameStore((state) => state.feedSelectedAnimal);
  const [feedback, setFeedback] = useState<string>(t("cage.initialFeedback"));

  const selectedAnimal = useMemo(
    () => ownedAnimals.find((animal) => animal.id === selectedAnimalId),
    [ownedAnimals, selectedAnimalId]
  );

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-stone-300 bg-[#f8f4ea] p-4">
        <h2 className="text-2xl font-semibold text-stone-800">{t("cage.title")}</h2>
        <p className="mt-1 text-sm text-stone-600">
          {t("cage.description", {
            feed: t(FEED_NAME_KEY),
          })}
        </p>
      </div>

      <CageSceneCanvas />

      <div className="grid gap-4 rounded-xl border border-stone-300 bg-[#f8f4ea] p-4 md:grid-cols-[1fr_auto]">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-stone-700">
            {t("cage.selected")}:{" "}
            {selectedAnimal
              ? selectedAnimal.nickname?.trim() || t(ANIMAL_NAME_KEYS[selectedAnimal.animalKey])
              : t("common.none")}
          </div>
          <div className="text-sm text-stone-600">
            {selectedAnimal
              ? t("cage.statusLine", {
                  age: selectedAnimal.age,
                  hunger: Math.round(selectedAnimal.hunger),
                  state: selectedAnimal.isDead ? t("common.dead") : t("common.alive"),
                })
              : t("cage.pickAnimal")}
          </div>
          <div className="text-sm text-stone-600">
            {t("cage.feedInBag")}: {feed}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-semibold text-stone-100 disabled:cursor-not-allowed disabled:bg-stone-400"
            disabled={!selectedAnimal || selectedAnimal.isDead || feed <= 0}
            onClick={() => {
              const result = feedSelectedAnimal();
              setFeedback(result.message);
            }}
          >
            {t("cage.giveFeed")}
          </button>
          <button
            type="button"
            className="rounded-lg border border-stone-400 bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-700"
            onClick={() => {
              const canvas = document.querySelector<HTMLCanvasElement>("#cage-scene-canvas canvas");
              if (!canvas) {
                setFeedback(t("cage.screenshotCanvasMissing"));
                return;
              }

              try {
                const imageDataUrl = canvas.toDataURL("image/png");
                const fileName = `petverse-cage-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
                const link = document.createElement("a");
                link.href = imageDataUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                link.remove();
                setFeedback(t("cage.screenshotDownloaded"));
              } catch {
                setFeedback(t("cage.screenshotFailed"));
              }
            }}
          >
            {t("cage.downloadScreenshot")}
          </button>
        </div>
      </div>

      <p className="rounded-lg border border-stone-300 bg-[#f8f4ea] px-4 py-3 text-sm text-stone-700">
        {feedback}
      </p>

      {ownedAnimals.length === 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("cage.emptyPrefix")}{" "}
          <Link href="/shop" className="font-semibold underline">
            {t("cage.emptyLink")}
          </Link>{" "}
          {t("cage.emptySuffix")}
        </div>
      ) : null}
    </section>
  );
}
