"use client";

import Image from "next/image";

import type { TranslateFn } from "@/i18n";

type InventoryPreviewModalProps = {
  preview: { src: string; name: string } | null;
  onClose: () => void;
  t: TranslateFn;
};

export default function InventoryPreviewModal({ preview, onClose, t }: InventoryPreviewModalProps) {
  if (!preview) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("inventory.thumbnailPreviewDialog")}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-stone-300 bg-[#f8f4ea] p-3 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="truncate text-sm font-semibold text-stone-800">{preview.name}</p>
          <button
            type="button"
            className="cursor-pointer rounded-md border border-stone-300 bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-700"
            onClick={onClose}
          >
            {t("common.close")}
          </button>
        </div>
        <div className="overflow-hidden rounded-lg border border-stone-300 bg-stone-100">
          <Image
            src={preview.src}
            alt={t("inventory.thumbnailPreviewAlt", { name: preview.name })}
            width={1024}
            height={1024}
            unoptimized={preview.src.startsWith("data:")}
            className="h-auto max-h-[70vh] w-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}
