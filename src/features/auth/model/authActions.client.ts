"use client";

import type { Session } from "@supabase/supabase-js";

import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase";

export type BrowserAuthClient = NonNullable<ReturnType<typeof getSupabaseBrowserClient>>;

export function isAuthConfiguredAction(): boolean {
  return isSupabaseConfigured();
}

export function getAuthClientAction(): BrowserAuthClient | null {
  return getSupabaseBrowserClient();
}

export async function signInWithPasswordAction(
  client: BrowserAuthClient,
  email: string,
  password: string
) {
  return client.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signUpWithPasswordAction(
  client: BrowserAuthClient,
  email: string,
  password: string
) {
  return client.auth.signUp({
    email,
    password,
  });
}

export async function signOutAction(client: BrowserAuthClient) {
  return client.auth.signOut();
}

export async function getCurrentSessionEmailAction(client: BrowserAuthClient): Promise<string | null> {
  const {
    data: { user },
  } = await client.auth.getUser();

  return user?.email ?? null;
}

export function subscribeAuthStateAction(
  client: BrowserAuthClient,
  onSession: (session: Session | null) => void
): () => void {
  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((_event, session) => {
    onSession(session);
  });

  return () => {
    subscription.unsubscribe();
  };
}
