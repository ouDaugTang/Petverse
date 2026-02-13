import { createBrowserClient } from "@supabase/ssr";

import { parseGameSnapshot } from "@/game/types";
import type { GameSnapshot } from "@/game/types";
import type { GameRepo } from "@/game/repo/gameRepo";
import { createLocalStorageGameRepo } from "@/game/repo/localStorageGameRepo";

type SupabaseRepoOptions = {
  url: string;
  anonKey: string;
};

type SupabaseStateRow = {
  player_id: string;
  state: GameSnapshot;
};

const TABLE_NAME = "game_states";
const SUPABASE_LOCAL_FALLBACK_PREFIX = "petverse.game.snapshot.supabase";

async function getCurrentUserId(supabase: ReturnType<typeof createBrowserClient>) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}

export function createSupabaseGameRepo(options: SupabaseRepoOptions): GameRepo {
  const supabase = createBrowserClient(options.url, options.anonKey);

  return {
    async loadState() {
      if (typeof window === "undefined") {
        return null;
      }

      try {
        const userId = await getCurrentUserId(supabase);
        if (!userId) {
          const anonymousFallbackRepo = createLocalStorageGameRepo();
          return anonymousFallbackRepo.loadState();
        }

        const userScopedFallbackRepo = createLocalStorageGameRepo(
          `${SUPABASE_LOCAL_FALLBACK_PREFIX}.${userId}`
        );

        const fallbackState = await userScopedFallbackRepo.loadState();
        const { data, error } = await supabase
          .from(TABLE_NAME)
          .select("player_id,state")
          .eq("player_id", userId)
          .maybeSingle<SupabaseStateRow>();

        if (error) {
          return fallbackState;
        }

        if (!data?.state) {
          return null;
        }

        return parseGameSnapshot(data.state) ?? fallbackState;
      } catch {
        return null;
      }
    },
    async saveState(state: GameSnapshot) {
      if (typeof window === "undefined") {
        return;
      }

      try {
        const userId = await getCurrentUserId(supabase);
        if (!userId) {
          const anonymousFallbackRepo = createLocalStorageGameRepo();
          await anonymousFallbackRepo.saveState(state);
          return;
        }

        const userScopedFallbackRepo = createLocalStorageGameRepo(
          `${SUPABASE_LOCAL_FALLBACK_PREFIX}.${userId}`
        );
        await userScopedFallbackRepo.saveState(state);

        await supabase.from(TABLE_NAME).upsert({
          player_id: userId,
          state,
          updated_at: new Date().toISOString(),
        });
      } catch {
        // Supabase schema is optional for the MVP.
      }
    },
  };
}
