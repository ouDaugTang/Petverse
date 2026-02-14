"use client";

import { Html } from "@react-three/drei";

import type { TranslateFn } from "@/i18n";

type AnimalNameTagProps = {
  selected: boolean;
  animalName: string;
  age: number;
  isDead: boolean;
  t: TranslateFn;
};

export default function AnimalNameTag({ selected, animalName, age, isDead, t }: AnimalNameTagProps) {
  return (
    <Html center transform sprite position={[0, 1.84, 0]} style={{ pointerEvents: "none" }}>
      <div
        className={`inline-flex min-w-[132px] items-center justify-center gap-1.5 rounded-md border border-stone-100/20 bg-stone-900/85 px-2.5 py-1 text-[11px] font-semibold leading-none text-stone-100 shadow-lg transition-all duration-200 ease-out ${
          selected ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
        }`}
      >
        <span className="max-w-[86px] truncate">{animalName}</span>
        <span className="rounded bg-stone-100/15 px-1.5 py-0.5">{t("cage.sceneAge", { age })}</span>
        {isDead ? <span className="rounded bg-rose-500/80 px-1.5 py-0.5">{t("common.dead")}</span> : null}
      </div>
    </Html>
  );
}
