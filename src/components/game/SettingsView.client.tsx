"use client";

import { useI18n } from "@/i18n";

export default function SettingsView() {
  const { t } = useI18n();

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-stone-300 bg-[#f8f4ea] p-4">
        <h2 className="text-2xl font-semibold text-stone-800">{t("settings.title")}</h2>
        <p className="mt-1 text-sm text-stone-600">{t("settings.placeholder")}</p>
      </div>
    </section>
  );
}
