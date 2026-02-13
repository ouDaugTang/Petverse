import type { GameRepo } from "@/game/repo/gameRepo";
import { createLocalStorageGameRepo } from "@/game/repo/localStorageGameRepo";
import { createSupabaseGameRepo } from "@/game/repo/supabaseGameRepo";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export function createGameRepo(): GameRepo {
  const config = getSupabasePublicConfig();
  if (config) {
    return createSupabaseGameRepo({
      url: config.url,
      anonKey: config.anonKey,
    });
  }

  return createLocalStorageGameRepo();
}
