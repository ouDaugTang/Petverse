"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { InventoryAnimalCard, InventoryPreviewModal } from "@/components/game/inventory";
import { ANIMAL_BY_KEY, useGameStore } from "@/game";
import { groupOwnedAnimals, readImageAsDataUrl } from "@/features/inventory/model";
import { ANIMAL_NAME_KEYS, useI18n } from "@/i18n";

const DEFAULT_THUMBNAIL = "/images/animals/guineaPig.svg";

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
                    const fallbackName = t(ANIMAL_NAME_KEYS[animal.animalKey]);
                    const displayName = animal.nickname?.trim() || fallbackName;
                    const previewSrc =
                      animal.thumbnailDataUrl ||
                      ANIMAL_BY_KEY[animal.animalKey]?.thumbnailPath ||
                      DEFAULT_THUMBNAIL;
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

                          void readImageAsDataUrl(file)
                            .then((dataUrl) => {
                              const result = setAnimalThumbnail(animal.id, dataUrl);
                              setMessage(result.message);
                            })
                            .catch(() => {
                              setMessage(t("inventory.errorReadImage"));
                            });
                        }}
                        onClearThumbnail={() => {
                          const result = setAnimalThumbnail(animal.id, "");
                          setMessage(result.message);
                        }}
                      />
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
