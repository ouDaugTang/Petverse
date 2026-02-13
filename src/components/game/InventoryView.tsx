"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { ANIMAL_BY_KEY, ANIMAL_CATALOG } from "@/game/catalog";
import { useGameStore } from "@/game/store/useGameStore";
import type { AnimalKey, OwnedAnimal } from "@/game/types";
import { ANIMAL_NAME_KEYS } from "@/i18n/gameText";
import { useI18n } from "@/i18n/provider";

const DEFAULT_THUMBNAIL = "/images/animals/guineaPig.svg";

function groupByAnimalKey(ownedAnimals: OwnedAnimal[]) {
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

function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unexpected file result."));
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

export default function InventoryView() {
  const { t } = useI18n();
  const coins = useGameStore((state) => state.coins);
  const feed = useGameStore((state) => state.inventory.feed);
  const ownedAnimals = useGameStore((state) => state.ownedAnimals);
  const selectedAnimalId = useGameStore((state) => state.selectedAnimalId);
  const placements = useGameStore((state) => state.placements);
  const sellAnimal = useGameStore((state) => state.sellAnimal);
  const selectAnimal = useGameStore((state) => state.selectAnimal);
  const renameAnimal = useGameStore((state) => state.renameAnimal);
  const setAnimalThumbnail = useGameStore((state) => state.setAnimalThumbnail);
  const [message, setMessage] = useState(t("inventory.selectToSell"));
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
  const [previewModal, setPreviewModal] = useState<{ src: string; name: string } | null>(null);
  const groupedAnimals = useMemo(() => groupByAnimalKey(ownedAnimals), [ownedAnimals]);

  useEffect(() => {
    if (!previewModal) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewModal(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [previewModal]);

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
        <p className="mt-1 text-xs text-stone-500">{t("inventory.thumbnailHint")}</p>
        {ownedAnimals.length === 0 ? (
          <p className="mt-2 text-sm text-stone-600">{t("inventory.none")}</p>
        ) : (
          <div className="mt-3 space-y-3">
            {groupedAnimals.map(({ animal: catalogAnimal, members }) => (
              <details
                key={catalogAnimal.key}
                open
                className="rounded-lg border border-stone-200 bg-[#fdfbf5]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="font-mono text-xs text-stone-500">[DIR]</span>
                    <Image
                      src={catalogAnimal.thumbnailPath ?? DEFAULT_THUMBNAIL}
                      alt={t(ANIMAL_NAME_KEYS[catalogAnimal.key])}
                      width={28}
                      height={28}
                      className="rounded border border-stone-300 bg-white"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-stone-800">
                        {t(ANIMAL_NAME_KEYS[catalogAnimal.key])}
                      </p>
                      <p className="text-xs text-stone-500">
                        {t("inventory.groupOwned", { count: members.length })}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-stone-500">{t("inventory.folderOpen")}</span>
                </summary>

                <div className="grid gap-3 px-3 pb-3 md:grid-cols-2">
                  {members.map((animal) => {
                    const placement = placements[animal.id];
                    const fallbackName = t(ANIMAL_NAME_KEYS[animal.animalKey]);
                    const displayName = animal.nickname?.trim() || fallbackName;
                    const previewSrc =
                      animal.thumbnailDataUrl ||
                      ANIMAL_BY_KEY[animal.animalKey]?.thumbnailPath ||
                      DEFAULT_THUMBNAIL;
                    const nameDraft = nameDrafts[animal.id] ?? animal.nickname ?? "";

                    return (
                      <article
                        key={animal.id}
                        className={`rounded-lg border p-3 ${
                          selectedAnimalId === animal.id
                            ? "border-stone-500 bg-[#f4efdf]"
                            : "border-stone-200 bg-white"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewModal({
                                src: previewSrc,
                                name: displayName,
                              });
                            }}
                            className="cursor-zoom-in rounded-md border border-stone-300 bg-stone-100"
                            aria-label={t("inventory.openThumbnail", { name: displayName })}
                          >
                            <Image
                              src={previewSrc}
                              alt={t("inventory.thumbnailAlt", { name: displayName })}
                              width={68}
                              height={68}
                              unoptimized={previewSrc.startsWith("data:")}
                              className="h-[68px] w-[68px] rounded-md object-cover"
                            />
                          </button>
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="truncate text-sm font-semibold text-stone-800">
                              {displayName}
                            </p>
                            <p className="text-xs text-stone-500">{fallbackName}</p>
                            <p className="text-xs text-stone-600">
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
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-md border border-stone-300 bg-stone-100 px-2.5 py-1.5 text-xs font-semibold text-stone-700"
                            onClick={() => {
                              selectAnimal(animal.id);
                              setMessage(t("inventory.selectedInCage"));
                            }}
                          >
                            {selectedAnimalId === animal.id
                              ? t("inventory.selected")
                              : t("inventory.select")}
                          </button>
                          <button
                            type="button"
                            className="rounded-md bg-rose-700 px-2.5 py-1.5 text-xs font-semibold text-rose-50"
                            onClick={() => {
                              const result = sellAnimal(animal.id);
                              setMessage(result.message);
                            }}
                          >
                            {t("inventory.sellAnimal")}
                          </button>
                        </div>

                        <form
                          className="mt-3 flex gap-2"
                          onSubmit={(event) => {
                            event.preventDefault();
                            const result = renameAnimal(animal.id, nameDraft);
                            setMessage(result.message);
                          }}
                        >
                          <input
                            value={nameDraft}
                            maxLength={32}
                            onChange={(event) => {
                              const nextValue = event.currentTarget.value;
                              setNameDrafts((current) => ({
                                ...current,
                                [animal.id]: nextValue,
                              }));
                            }}
                            placeholder={t("inventory.renamePlaceholder", { animal: fallbackName })}
                            className="min-w-0 flex-1 rounded-md border border-stone-300 bg-[#fffdf7] px-2 py-1.5 text-xs text-stone-700 outline-none ring-stone-400 focus:ring-1"
                          />
                          <button
                            type="submit"
                            className="rounded-md border border-stone-400 bg-stone-100 px-2.5 py-1.5 text-xs font-semibold text-stone-700"
                          >
                            {t("common.save")}
                          </button>
                        </form>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <label className="cursor-pointer rounded-md border border-stone-300 bg-stone-100 px-2.5 py-1.5 text-xs font-semibold text-stone-700">
                            {t("inventory.uploadThumbnail")}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) => {
                                const file = event.currentTarget.files?.[0] ?? null;
                                event.currentTarget.value = "";
                                if (!file) {
                                  return;
                                }

                                if (!file.type.startsWith("image/")) {
                                  setMessage(t("inventory.errorImageOnly"));
                                  return;
                                }

                                void readImageAsDataUrl(file)
                                  .then((dataUrl) => {
                                    const result = setAnimalThumbnail(animal.id, dataUrl);
                                    setMessage(result.message);
                                  })
                                  .catch(() => {
                                    setMessage(t("inventory.errorReadImage"));
                                  });
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            className="rounded-md border border-stone-300 bg-stone-100 px-2.5 py-1.5 text-xs font-semibold text-stone-700"
                            onClick={() => {
                              const result = setAnimalThumbnail(animal.id, "");
                              setMessage(result.message);
                            }}
                          >
                            {t("inventory.clearThumbnail")}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>

      <p className="rounded-lg border border-stone-300 bg-[#f8f4ea] px-4 py-3 text-sm text-stone-700">
        {message}
      </p>

      {previewModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreviewModal(null)}
          role="dialog"
          aria-modal="true"
          aria-label={t("inventory.thumbnailPreviewDialog")}
        >
          <div
            className="w-full max-w-xl rounded-xl border border-stone-300 bg-[#f8f4ea] p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="truncate text-sm font-semibold text-stone-800">{previewModal.name}</p>
              <button
                type="button"
                className="rounded-md border border-stone-300 bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-700"
                onClick={() => setPreviewModal(null)}
              >
                {t("common.close")}
              </button>
            </div>
            <div className="overflow-hidden rounded-lg border border-stone-300 bg-stone-100">
              <Image
                src={previewModal.src}
                alt={t("inventory.thumbnailPreviewAlt", { name: previewModal.name })}
                width={1024}
                height={1024}
                unoptimized={previewModal.src.startsWith("data:")}
                className="h-auto max-h-[70vh] w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
