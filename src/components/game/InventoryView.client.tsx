"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { InventoryAnimalCard, InventoryPreviewModal } from "@/components/game/inventory";
import {
  ANIMAL_BY_KEY,
  getAnimalDefaultVariant,
  getAnimalVariant,
  isStorageThumbnailRef,
  type AnimalKey,
  useGameStore,
} from "@/game";
import {
  deleteAnimalThumbnailFromStorage,
  groupOwnedAnimals,
  readImageAsDataUrl,
  resolveAnimalThumbnailSrc,
  uploadAnimalThumbnailToStorage,
} from "@/features/inventory/model";
import {
  ANIMAL_NAME_KEYS,
  ANIMAL_VARIANT_NAME_KEYS,
  useI18n,
  type MessageKey,
  type TranslateFn,
} from "@/i18n";

const DEFAULT_THUMBNAIL = "/images/animals/guineaPig.svg";

function formatUnknownVariantKey(variantKey: string) {
  const normalized = variantKey
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ");

  if (!normalized) {
    return "Unknown";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function resolveVariantLabel(t: TranslateFn, animalKey: AnimalKey, variantKey: string) {
  const variantKeyMap = ANIMAL_VARIANT_NAME_KEYS[animalKey] as Partial<Record<string, MessageKey>>;
  const variantNameKey = variantKeyMap[variantKey];
  return variantNameKey ? t(variantNameKey) : formatUnknownVariantKey(variantKey);
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
  const [resolvedThumbnailByAnimalId, setResolvedThumbnailByAnimalId] = useState<
    Record<string, string>
  >({});
  const [previewModal, setPreviewModal] = useState<{ src: string; name: string } | null>(null);
  const groupedAnimals = useMemo(() => groupOwnedAnimals(ownedAnimals), [ownedAnimals]);

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

  useEffect(() => {
    let cancelled = false;

    const thumbnailRefs = ownedAnimals
      .map((animal) => ({
        animalId: animal.id,
        thumbnailRef: animal.thumbnailDataUrl,
      }))
      .filter((item) => Boolean(item.thumbnailRef));

    if (thumbnailRefs.length === 0) {
      setResolvedThumbnailByAnimalId({});
      return () => {
        cancelled = true;
      };
    }

    void Promise.all(
      thumbnailRefs.map(async ({ animalId, thumbnailRef }) => {
        const resolved = await resolveAnimalThumbnailSrc(thumbnailRef ?? "");
        return [animalId, resolved] as const;
      })
    ).then((entries) => {
      if (cancelled) {
        return;
      }

      const nextMap: Record<string, string> = {};
      for (const [animalId, resolved] of entries) {
        if (resolved) {
          nextMap[animalId] = resolved;
        }
      }

      setResolvedThumbnailByAnimalId(nextMap);
    });

    return () => {
      cancelled = true;
    };
  }, [ownedAnimals]);

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
            {groupedAnimals.map(({ animalKey, members, variants }) => (
              <details key={animalKey} open className="rounded-lg border border-stone-200 bg-[#fdfbf5]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="font-mono text-xs text-stone-500">[DIR]</span>
                    <Image
                      src={getAnimalDefaultVariant(animalKey).thumbnailPath ?? DEFAULT_THUMBNAIL}
                      alt={t(ANIMAL_NAME_KEYS[animalKey])}
                      width={28}
                      height={28}
                      className="rounded border border-stone-300 bg-white"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-stone-800">
                        {t(ANIMAL_NAME_KEYS[animalKey])}
                      </p>
                      <p className="text-xs text-stone-500">
                        {t("inventory.groupOwned", { count: members.length })}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-stone-500">{t("inventory.folderOpen")}</span>
                </summary>

                <div className="space-y-3 px-3 pb-3">
                  {variants.map(({ variantKey, members: variantMembers }) => {
                    const variantName = resolveVariantLabel(t, animalKey, variantKey);
                    const variantCatalog = ANIMAL_BY_KEY[animalKey].variants.find(
                      (variant) => variant.key === variantKey
                    );
                    const speciesThumbnail =
                      getAnimalDefaultVariant(animalKey).thumbnailPath ?? DEFAULT_THUMBNAIL;
                    const variantThumbnail = variantCatalog?.thumbnailPath ?? speciesThumbnail;

                    return (
                      <details
                        key={`${animalKey}-${variantKey}`}
                        open
                        className="rounded-md border border-stone-200 bg-white/70"
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="font-mono text-xs text-stone-500">[DIR]</span>
                            <Image
                              src={variantThumbnail}
                              alt={variantName}
                              width={24}
                              height={24}
                              className="rounded border border-stone-300 bg-white"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-stone-800">{variantName}</p>
                              <p className="text-xs text-stone-500">
                                {t("inventory.groupOwned", { count: variantMembers.length })}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-stone-500">{t("inventory.folderOpen")}</span>
                        </summary>

                        <div className="grid gap-3 px-3 pb-3 md:grid-cols-2">
                          {variantMembers.map((animal) => {
                            const speciesName = t(ANIMAL_NAME_KEYS[animal.animalKey]);
                            const resolvedVariantName = resolveVariantLabel(
                              t,
                              animal.animalKey,
                              animal.variantKey
                            );
                            const fallbackName = `${speciesName} - ${resolvedVariantName}`;
                            const displayName = animal.nickname?.trim() || fallbackName;
                            const animalVariant = getAnimalVariant(animal.animalKey, animal.variantKey);
                            const directThumbnailSrc =
                              animal.thumbnailDataUrl && !isStorageThumbnailRef(animal.thumbnailDataUrl)
                                ? animal.thumbnailDataUrl
                                : undefined;
                            const previewSrc =
                              resolvedThumbnailByAnimalId[animal.id] ||
                              directThumbnailSrc ||
                              animalVariant.thumbnailPath ||
                              variantThumbnail;
                            const nameDraft = nameDrafts[animal.id] ?? animal.nickname ?? "";

                            return (
                              <InventoryAnimalCard
                                key={animal.id}
                                animal={animal}
                                selected={selectedAnimalId === animal.id}
                                fallbackName={fallbackName}
                                displayName={displayName}
                                previewSrc={previewSrc}
                                nameDraft={nameDraft}
                                placement={placements[animal.id]}
                                t={t}
                                onOpenPreview={(src, name) => {
                                  setPreviewModal({ src, name });
                                }}
                                onSelect={() => {
                                  selectAnimal(animal.id);
                                  setMessage(t("inventory.selectedInCage"));
                                }}
                                onSell={() => {
                                  const result = sellAnimal(animal.id);
                                  setMessage(result.message);
                                }}
                                onRename={() => {
                                  const result = renameAnimal(animal.id, nameDraft);
                                  setMessage(result.message);
                                }}
                                onNameDraftChange={(nextValue) => {
                                  setNameDrafts((current) => ({
                                    ...current,
                                    [animal.id]: nextValue,
                                  }));
                                }}
                                onUpload={(file) => {
                                  if (!file.type.startsWith("image/")) {
                                    setMessage(t("inventory.errorImageOnly"));
                                    return;
                                  }

                                  void (async () => {
                                    try {
                                      const storageRef = await uploadAnimalThumbnailToStorage(
                                        animal.id,
                                        file
                                      );
                                      if (storageRef) {
                                        const result = setAnimalThumbnail(animal.id, storageRef);
                                        setMessage(result.message);
                                        return;
                                      }

                                      const dataUrl = await readImageAsDataUrl(file);
                                      const result = setAnimalThumbnail(animal.id, dataUrl);
                                      setMessage(result.message);
                                    } catch {
                                      setMessage(t("inventory.errorReadImage"));
                                    }
                                  })();
                                }}
                                onClearThumbnail={() => {
                                  void (async () => {
                                    try {
                                      if (
                                        animal.thumbnailDataUrl &&
                                        isStorageThumbnailRef(animal.thumbnailDataUrl)
                                      ) {
                                        await deleteAnimalThumbnailFromStorage(
                                          animal.thumbnailDataUrl
                                        );
                                      }
                                    } finally {
                                      const result = setAnimalThumbnail(animal.id, "");
                                      setMessage(result.message);
                                    }
                                  })();
                                }}
                              />
                            );
                          })}
                        </div>
                      </details>
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

      <InventoryPreviewModal preview={previewModal} onClose={() => setPreviewModal(null)} t={t} />
    </section>
  );
}
