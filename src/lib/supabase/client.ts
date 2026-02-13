"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabasePublicConfig } from "@/lib/supabase/config";

let cachedClient: SupabaseClient | null | undefined;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const config = getSupabasePublicConfig();
  if (!config) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createBrowserClient(config.url, config.anonKey);
  return cachedClient;
}
