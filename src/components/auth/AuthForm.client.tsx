"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LanguageSwitcher } from "@/components/i18n";
import {
  getAuthClientAction,
  isAuthConfiguredAction,
  signInWithPasswordAction,
  signUpWithPasswordAction,
  toSafeNextPath,
} from "@/features/auth";
import { useI18n } from "@/i18n";

type AuthMode = "login" | "signup";

export default function AuthForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(t("auth.initialMessage"));
  const [loading, setLoading] = useState(false);
  const [nextPath, setNextPath] = useState("/cage");
  const authClient = getAuthClientAction();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    setNextPath(toSafeNextPath(searchParams.get("next")));
  }, []);

  if (!isAuthConfiguredAction()) {
    return (
      <section className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-stone-300 bg-[#f8f4ea] shadow-[0_20px_50px_rgba(53,41,31,0.15)]">
        <div className="flex items-center justify-between border-b border-stone-300 bg-[#dfd7c5] px-6 py-4">
          <h1 className="text-xl font-semibold text-stone-800">{t("auth.terminalTitle")}</h1>
          <LanguageSwitcher />
        </div>
        <div className="space-y-3 px-6 py-5 text-sm text-amber-900">
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
            {t("auth.envMissing")}
          </p>
          <p>
            {t("auth.localModeHint")}{" "}
            <Link href="/cage" className="font-semibold underline">
              /cage
            </Link>
          </p>
        </div>
      </section>
    );
  }

  if (!authClient) {
    return (
      <section className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-stone-300 bg-[#f8f4ea] shadow-[0_20px_50px_rgba(53,41,31,0.15)]">
        <div className="flex items-center justify-between border-b border-stone-300 bg-[#dfd7c5] px-6 py-4">
          <h1 className="text-xl font-semibold text-stone-800">{t("auth.terminalTitle")}</h1>
          <LanguageSwitcher />
        </div>
        <div className="px-6 py-5 text-sm text-rose-900">
          <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2">
            {t("auth.clientUnavailable")}
          </p>
        </div>
      </section>
    );
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "login") {
        const { data, error } = await signInWithPasswordAction(authClient, email, password);

        if (error) {
          setMessage(error.message);
          return;
        }

        if (!data.session) {
          setMessage(t("auth.loginNoSession"));
          return;
        }

        setMessage(t("auth.loginSuccess"));
        router.replace(nextPath);
        router.refresh();
        return;
      }

      const { data, error } = await signUpWithPasswordAction(authClient, email, password);

      if (error) {
        setMessage(error.message);
        return;
      }

      if (data.session) {
        setMessage(t("auth.signupSuccess"));
        router.replace(nextPath);
        router.refresh();
        return;
      }

      setMessage(t("auth.signupCheckEmail"));
      setMode("login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="pointer-events-auto relative z-10 mx-auto grid max-w-5xl overflow-hidden rounded-2xl border border-stone-300 bg-[#f8f4ea] shadow-[0_25px_70px_rgba(50,39,25,0.18)] md:grid-cols-[250px_1fr]">
      <aside className="border-b border-stone-300 bg-[#dfd7c5] px-5 py-6 md:border-r md:border-b-0">
        <h1 className="text-lg font-semibold tracking-wide text-stone-800">{t("shell.title")}</h1>
        <p className="mt-2 text-xs text-stone-600">{t("auth.panelCaption")}</p>

        <nav className="mt-6 space-y-2 font-mono text-sm">
          <div className="rounded-md bg-stone-700 px-3 py-2 text-stone-100">
            {">"} {t("nav.auth")}
          </div>
          <div className="rounded-md bg-stone-100 px-3 py-2 text-stone-700">
            {">"} {t("nav.cage")}
          </div>
          <div className="rounded-md bg-stone-100 px-3 py-2 text-stone-700">
            {">"} {t("nav.shop")}
          </div>
          <div className="rounded-md bg-stone-100 px-3 py-2 text-stone-700">
            {">"} {t("nav.inventory")}
          </div>
        </nav>

        <div className="mt-6 rounded-md border border-stone-300 bg-[#f8f4ea] px-3 py-2 text-xs text-stone-600">
          {t("auth.redirectTarget")}:{" "}
          <span className="font-semibold text-stone-700">{nextPath}</span>
        </div>
      </aside>

      <div className="px-6 py-6 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-stone-800">{t("auth.accountAccess")}</h2>
            <p className="mt-1 text-sm text-stone-600">
              {mode === "login" ? t("auth.loginSubtitle") : t("auth.signupSubtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <div className="inline-flex rounded-lg border border-stone-300 bg-[#fdfbf5] p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`rounded-md px-3 py-1.5 ${
                  mode === "login" ? "bg-stone-800 text-stone-100" : "text-stone-600"
                }`}
              >
                {t("auth.loginTab")}
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`rounded-md px-3 py-1.5 ${
                  mode === "signup" ? "bg-stone-800 text-stone-100" : "text-stone-600"
                }`}
              >
                {t("auth.signupTab")}
              </button>
            </div>
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-semibold text-stone-700">
            {t("auth.email")}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none ring-stone-400 transition focus:ring-2"
              placeholder={t("auth.emailPlaceholder")}
            />
          </label>

          <label className="block text-sm font-semibold text-stone-700">
            {t("auth.password")}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none ring-stone-400 transition focus:ring-2"
              placeholder={t("auth.passwordPlaceholder")}
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-stone-800 px-4 py-2 text-sm font-semibold text-stone-100 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {loading
                ? t("common.status.working")
                : mode === "login"
                  ? t("auth.submitLogin")
                  : t("auth.submitSignup")}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setMode((current) => (current === "login" ? "signup" : "login"))}
              className="rounded-md border border-stone-400 px-4 py-2 text-sm font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mode === "login" ? t("auth.toggleNeedAccount") : t("auth.toggleHaveAccount")}
            </button>
          </div>
        </form>

        <p className="mt-4 rounded-md border border-stone-300 bg-[#fdfbf5] px-3 py-2 text-sm text-stone-700">
          {message}
        </p>
      </div>
    </section>
  );
}
