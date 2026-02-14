"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useEffect } from "react";
import { useRef } from "react";
import { useState } from "react";

import FolderTreeNav from "@/components/game/FolderTreeNav.client";
import { LanguageSwitcher } from "@/components/i18n";
import { signOutAction, useAuthSession } from "@/features/auth";
import { useGameStore } from "@/game/store";
import { useI18n } from "@/i18n";

type GameShellProps = {
  children: React.ReactNode;
};

export default function GameShell({ children }: GameShellProps) {
  const router = useRouter();
  const { t } = useI18n();
  const initialize = useGameStore((state) => state.initialize);
  const syncWorldTime = useGameStore((state) => state.syncWorldTime);
  const hydrated = useGameStore((state) => state.hydrated);
  const coins = useGameStore((state) => state.coins);
  const feed = useGameStore((state) => state.inventory.feed);
  const ownedAnimals = useGameStore((state) => state.ownedAnimals.length);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const didRunInitialInitializeRef = useRef(false);
  const handleSessionChange = useCallback(() => {
    if (!didRunInitialInitializeRef.current) {
      return;
    }

    void initialize();
  }, [initialize]);
  const { client, userEmail, authReady, isConfigured } = useAuthSession(handleSessionChange);

  useEffect(() => {
    didRunInitialInitializeRef.current = true;
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const timer = window.setInterval(() => {
      syncWorldTime();
    }, 60 * 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [hydrated, syncWorldTime]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const applySidebarMode = () => {
      setSidebarOpen(mediaQuery.matches);
    };

    applySidebarMode();
    mediaQuery.addEventListener("change", applySidebarMode);

    return () => {
      mediaQuery.removeEventListener("change", applySidebarMode);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#e9e3d5] text-stone-800">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-stone-300 bg-[#dfd7c5] p-5 transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <h1 className="mb-6 text-lg font-semibold tracking-wide">{t("shell.title")}</h1>
        <FolderTreeNav />
      </aside>

      <div
        className={`flex min-h-screen flex-col transition-[padding-left] duration-300 ${
          sidebarOpen ? "md:pl-72" : "md:pl-0"
        }`}
      >
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-300 bg-[#f6f2e8] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <button
              type="button"
              aria-label={sidebarOpen ? "Close menu" : "Open menu"}
              className="rounded-md border border-stone-400 bg-[#fdfbf5] px-2 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-200"
              onClick={() => setSidebarOpen((current) => !current)}
            >
              ☰
            </button>
            {hydrated ? t("shell.saveLoaded") : t("shell.loadingSave")}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 text-xs font-semibold text-stone-700 sm:text-sm">
            <LanguageSwitcher />
            <span>
              {t("shell.coins")}: {coins}
            </span>
            <span>
              {t("shell.feed")}: {feed}
            </span>
            <span>
              {t("shell.animals")}: {ownedAnimals}
            </span>
            {isConfigured ? (
              <>
                <span className="max-w-48 truncate text-xs font-medium text-stone-500">
                  {authReady ? (userEmail ?? t("shell.noSession")) : t("shell.checkingAuth")}
                </span>
                {client ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await signOutAction(client);
                      router.replace("/auth");
                      router.refresh();
                    }}
                    className="rounded-md border border-stone-400 px-2 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-200"
                  >
                    {t("common.action.logout")}
                  </button>
                ) : null}
              </>
            ) : (
              <span className="text-xs font-medium text-stone-500">{t("shell.localMode")}</span>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
