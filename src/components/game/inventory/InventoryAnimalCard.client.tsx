"use client";

import Image from "next/image";

import type { CagePlacement, OwnedAnimal } from "@/game";
import type { TranslateFn } from "@/i18n";

type InventoryAnimalCardProps = {
  animal: OwnedAnimal;
  selected: boolean;
  fallbackName: string;
  displayName: string;
  previewSrc: string;
  nameDraft: string;
  placement?: CagePlacement;
  t: TranslateFn;
  onOpenPreview: (src: string, name: string) => void;
  onSelect: () => void;
  onSell: () => void;
  onRename: () => void;
  onNameDraftChange: (value: string) => void;
  onUpload: (file: File) => void;
  onClearThumbnail: () => void;
};

export default function InventoryAnimalCard({
  animal,
  selected,
  fallbackName,
  displayName,
  previewSrc,
  nameDraft,
  placement,
  t,
  onOpenPreview,
  onSelect,
  onSell,
  onRename,
  onNameDraftChange,
  onUpload,
  onClearThumbnail,
}: InventoryAnimalCardProps) {
  return (
    <article
      className={`rounded-lg border p-3 ${
        selected ? "border-stone-500 bg-[#f4efdf]" : "border-stone-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onOpenPreview(previewSrc, displayName)}
          className="cursor-zoom-in rounded-md border border-stone-300 bg-stone-100"
          aria-label={t("inventory.openThumbnail", { name: displayName })}
        >
          <Image
            src={previewSrc}
            alt={t("inventory.thumbnailAlt", { name: displayName })}
            width={68}
            height={68}
            unoptimized
            className="h-[68px] w-[68px] rounded-md object-cover"
          />
        </button>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-sm font-semibold text-stone-800">{displayName}</p>
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
          className="cursor-pointer rounded-md border border-stone-300 bg-stone-100 px-2.5 py-1.5 text-xs font-semibold text-stone-700"
          onClick={onSelect}
        >
          {selected ? t("inventory.selected") : t("inventory.select")}
        </button>
        <button
          type="button"
          className="cursor-pointer rounded-md bg-rose-700 px-2.5 py-1.5 text-xs font-semibold text-rose-50"
          onClick={onSell}
        >
          {t("inventory.sellAnimal")}
        </button>
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onRename();
        }}
      >
        <input
          value={nameDraft}
          maxLength={32}
          onChange={(event) => {
            onNameDraftChange(event.currentTarget.value);
          }}
          placeholder={t("inventory.renamePlaceholder", { animal: fallbackName })}
          className="min-w-0 flex-1 rounded-md border border-stone-300 bg-[#fffdf7] px-2 py-1.5 text-xs text-stone-700 outline-none ring-stone-400 focus:ring-1"
        />
        <button
          type="submit"
          className="cursor-pointer rounded-md border border-stone-400 bg-stone-100 px-2.5 py-1.5 text-xs font-semibold text-stone-700"
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

              onUpload(file);
            }}
          />
        </label>
        <button
          type="button"
          className="cursor-pointer rounded-md border border-stone-300 bg-stone-100 px-2.5 py-1.5 text-xs font-semibold text-stone-700"
          onClick={onClearThumbnail}
        >
          {t("inventory.clearThumbnail")}
        </button>
      </div>
    </article>
  );
}
