"use client";

import { useI18n } from "@/i18n/provider";

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();

  return (
    <div className="pointer-events-auto inline-flex rounded-md border border-stone-300 bg-[#fdfbf5] p-1 text-xs font-semibold">
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`rounded px-2 py-1 ${
          language === "en" ? "bg-stone-800 text-stone-100" : "text-stone-600"
        }`}
      >
        {t("common.lang.english")}
      </button>
      <button
        type="button"
        onClick={() => setLanguage("ko")}
        className={`rounded px-2 py-1 ${
          language === "ko" ? "bg-stone-800 text-stone-100" : "text-stone-600"
        }`}
      >
        {t("common.lang.korean")}
      </button>
    </div>
  );
}
