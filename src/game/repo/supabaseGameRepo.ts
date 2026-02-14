import { createBrowserClient } from "@supabase/ssr";

import { createDefaultGameSnapshot } from "@/game/defaultState";
import {
  ANIMAL_THUMBNAIL_BUCKET,
  isDataThumbnailRef,
  normalizeThumbnailRef,
  thumbnailRefFromStoragePath,
  thumbnailStoragePathFromRef,
} from "@/game/model/thumbnailRef";
import type { GameRepo, PersistedGameState } from "@/game/repo/gameRepo";
import { createLocalStorageGameRepo } from "@/game/repo/localStorageGameRepo";
import { parseGameSnapshot } from "@/game/types";
import type { GameSnapshot } from "@/game/types";

type SupabaseRepoOptions = {
  url: string;
  anonKey: string;
};

type GameStateRow = {
  player_id: string;
  state: GameSnapshot;
  updated_at: string;
};

type GameAccountRow = {
  user_id: string;
  coins: number;
  selected_animal_id: string | null;
  updated_at: string;
};

type AnimalInstanceRow = {
  id: string;
  species_key: string;
  variant_key: string;
  nickname: string | null;
  age_days: number;
  hunger: number;
  is_dead: boolean;
  thumbnail_path: string | null;
  extra: {
    ageProgressMs?: unknown;
    lastUpdatedAt?: unknown;
    thumbnailDataUrl?: unknown;
  } | null;
  updated_at: string;
};

type InventoryItemRow = {
  quantity: number;
};

type CageRow = {
  id: string;
};

type PlacementRow = {
  animal_id: string;
  x: number;
  z: number;
  rotation_y: number;
};

const TABLE_LEGACY_STATE = "game_states";
const TABLE_GAME_ACCOUNTS = "game_accounts";
const TABLE_ANIMAL_INSTANCES = "animal_instances";
const TABLE_INVENTORY_ITEMS = "inventory_items";
const TABLE_CAGES = "cages";
const TABLE_CAGE_ANIMAL_PLACEMENTS = "cage_animal_placements";

const DEFAULT_CAGE_NAME = "main";
const FEED_ITEM_TYPE = "feed";
const FEED_ITEM_KEY = "basicFeed";

const SUPABASE_LOCAL_FALLBACK_PREFIX = "petverse.game.snapshot.supabase";

type LoadedPersistedState = {
  state: PersistedGameState;
  updatedAt: number;
};

function formatSupabaseError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "unknown";
  }

  const candidate = error as {
    message?: unknown;
    details?: unknown;
    hint?: unknown;
    code?: unknown;
  };

  const parts = [
    typeof candidate.code === "string" ? `code=${candidate.code}` : "",
    typeof candidate.message === "string" ? `message=${candidate.message}` : "",
    typeof candidate.details === "string" ? `details=${candidate.details}` : "",
    typeof candidate.hint === "string" ? `hint=${candidate.hint}` : "",
  ].filter((value) => value.length > 0);

  return parts.length > 0 ? parts.join(" | ") : "unknown";
}

async function getCurrentUserId(supabase: ReturnType<typeof createBrowserClient>) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}

function getNumberFromUnknown(value: unknown, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return value;
}

function getLastUpdatedTimestamp(row: AnimalInstanceRow) {
  const parsed = Date.parse(row.updated_at);
  const fallback = Number.isNaN(parsed) ? Date.now() : parsed;
  return getNumberFromUnknown(row.extra?.lastUpdatedAt, fallback);
}

function getThumbnailRef(row: AnimalInstanceRow) {
  if (typeof row.thumbnail_path === "string" && row.thumbnail_path.trim().length > 0) {
    if (isDataThumbnailRef(row.thumbnail_path)) {
      return row.thumbnail_path;
    }

    return thumbnailRefFromStoragePath(row.thumbnail_path);
  }

  const extraThumbnail = row.extra?.thumbnailDataUrl;
  if (typeof extraThumbnail === "string") {
    return normalizeThumbnailRef(extraThumbnail);
  }

  return undefined;
}

async function loadLegacySnapshot(
  supabase: ReturnType<typeof createBrowserClient>,
  userId: string
): Promise<LoadedPersistedState | null> {
  const { data, error } = await supabase
    .from(TABLE_LEGACY_STATE)
    .select("player_id,state,updated_at")
    .eq("player_id", userId)
    .maybeSingle();
  const row = (data ?? null) as GameStateRow | null;

  if (error || !row?.state) {
    return null;
  }

  const snapshot = parseGameSnapshot(row.state);
  if (!snapshot) {
    return null;
  }

  return {
    state: {
      snapshot,
      selectedAnimalId: null,
    },
    updatedAt: Date.parse(row.updated_at) || 0,
  };
}

async function loadNormalizedState(
  supabase: ReturnType<typeof createBrowserClient>,
  userId: string
): Promise<LoadedPersistedState | null> {
  const defaultSnapshot = createDefaultGameSnapshot();

  const [{ data: account, error: accountError }, { data: animals, error: animalsError }] =
    await Promise.all([
      supabase
        .from(TABLE_GAME_ACCOUNTS)
        .select("user_id,coins,selected_animal_id,updated_at")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from(TABLE_ANIMAL_INSTANCES)
        .select("id,species_key,variant_key,nickname,age_days,hunger,is_dead,thumbnail_path,extra,updated_at")
        .eq("user_id", userId)
        .is("deleted_at", null),
    ]);
  const accountRow = (account ?? null) as GameAccountRow | null;
  const animalRows = ((animals ?? null) as AnimalInstanceRow[] | null) ?? [];

  if (accountError || animalsError) {
    throw new Error("failed-to-load-normalized-state");
  }

  const { data: feedItem, error: feedError } = await supabase
    .from(TABLE_INVENTORY_ITEMS)
    .select("quantity")
    .eq("user_id", userId)
    .eq("item_type", FEED_ITEM_TYPE)
    .eq("item_key", FEED_ITEM_KEY)
    .maybeSingle();
  const feedRow = (feedItem ?? null) as InventoryItemRow | null;

  if (feedError) {
    throw new Error("failed-to-load-feed");
  }

  const { data: cage, error: cageError } = await supabase
    .from(TABLE_CAGES)
    .select("id")
    .eq("user_id", userId)
    .eq("name", DEFAULT_CAGE_NAME)
    .maybeSingle();
  const cageRow = (cage ?? null) as CageRow | null;

  if (cageError) {
    throw new Error("failed-to-load-cage");
  }

  let placementRows: PlacementRow[] = [];
  if (cageRow?.id) {
    const { data, error } = await supabase
      .from(TABLE_CAGE_ANIMAL_PLACEMENTS)
      .select("animal_id,x,z,rotation_y")
      .eq("user_id", userId)
      .eq("cage_id", cageRow.id);
    const placementData = ((data ?? null) as PlacementRow[] | null) ?? [];

    if (error) {
      throw new Error("failed-to-load-placements");
    }
    placementRows = placementData;
  }

  const hasAnyData =
    Boolean(accountRow) || animalRows.length > 0 || Boolean(feedRow) || placementRows.length > 0;
  if (!hasAnyData) {
    return null;
  }

  const rawSnapshot = {
    coins: accountRow?.coins ?? defaultSnapshot.coins,
    inventory: {
      feed: feedRow?.quantity ?? defaultSnapshot.inventory.feed,
    },
    ownedAnimals: animalRows.map((animal) => ({
      id: animal.id,
      animalKey: animal.species_key,
      variantKey: animal.variant_key || "default",
      age: animal.age_days,
      hunger: animal.hunger,
      isDead: animal.is_dead,
      lastUpdatedAt: getLastUpdatedTimestamp(animal),
      ageProgressMs: getNumberFromUnknown(animal.extra?.ageProgressMs, 0),
      nickname: animal.nickname || undefined,
      thumbnailDataUrl: getThumbnailRef(animal),
    })),
    placements: Object.fromEntries(
      placementRows.map((placement) => [
        placement.animal_id,
        {
          x: placement.x,
          z: placement.z,
          rotation: placement.rotation_y,
        },
      ])
    ),
  };

  const snapshot = parseGameSnapshot(rawSnapshot);
  if (!snapshot) {
    return null;
  }

  const accountUpdatedAt = Date.parse(accountRow?.updated_at ?? "") || 0;
  const animalUpdatedAt = animalRows.reduce((maxValue, animal) => {
    const value = Date.parse(animal.updated_at);
    if (Number.isNaN(value)) {
      return maxValue;
    }
    return Math.max(maxValue, value);
  }, 0);

  return {
    state: {
      snapshot,
      selectedAnimalId: accountRow?.selected_animal_id ?? null,
    },
    updatedAt: Math.max(accountUpdatedAt, animalUpdatedAt),
  };
}

async function ensureDefaultCageId(
  supabase: ReturnType<typeof createBrowserClient>,
  userId: string
) {
  const { data: existingCage, error: selectError } = await supabase
    .from(TABLE_CAGES)
    .select("id")
    .eq("user_id", userId)
    .eq("name", DEFAULT_CAGE_NAME)
    .maybeSingle();
  const existingCageRow = (existingCage ?? null) as CageRow | null;

  if (selectError) {
    throw new Error("failed-to-select-default-cage");
  }

  if (existingCageRow?.id) {
    return existingCageRow.id;
  }

  const { data: insertedCage, error: insertError } = await supabase
    .from(TABLE_CAGES)
    .insert({
      user_id: userId,
      name: DEFAULT_CAGE_NAME,
    })
    .select("id")
    .single();
  const insertedCageRow = (insertedCage ?? null) as CageRow | null;

  if (insertError || !insertedCageRow?.id) {
    throw new Error("failed-to-create-default-cage");
  }

  return insertedCageRow.id;
}

async function saveNormalizedState(
  supabase: ReturnType<typeof createBrowserClient>,
  userId: string,
  state: PersistedGameState
) {
  const nowIso = new Date().toISOString();
  const cageId = await ensureDefaultCageId(supabase, userId);

  const animals = state.snapshot.ownedAnimals;
  if (animals.length > 0) {
    const { error: upsertAnimalsError } = await supabase.from(TABLE_ANIMAL_INSTANCES).upsert(
      animals.map((animal) => ({
        thumbnail_path:
          thumbnailStoragePathFromRef(animal.thumbnailDataUrl ?? "") ??
          (isDataThumbnailRef(animal.thumbnailDataUrl ?? "") ? animal.thumbnailDataUrl ?? null : null),
        id: animal.id,
        user_id: userId,
        species_key: animal.animalKey,
        variant_key: animal.variantKey,
        nickname: animal.nickname ?? null,
        age_days: animal.age,
        hunger: animal.hunger,
        is_dead: animal.isDead,
        extra: {
          ageProgressMs: animal.ageProgressMs,
          lastUpdatedAt: animal.lastUpdatedAt,
          thumbnailDataUrl: normalizeThumbnailRef(animal.thumbnailDataUrl ?? "") ?? null,
        },
        updated_at: nowIso,
        deleted_at: null,
      })),
      { onConflict: "id" }
    );

    if (upsertAnimalsError) {
      throw new Error("failed-to-upsert-animals");
    }
  }

  const { data: existingAnimals, error: existingAnimalsError } = await supabase
    .from(TABLE_ANIMAL_INSTANCES)
    .select("id,thumbnail_path")
    .eq("user_id", userId)
    .is("deleted_at", null);
  const existingAnimalRows =
    ((existingAnimals ?? null) as Array<{ id: string; thumbnail_path: string | null }> | null) ?? [];

  if (existingAnimalsError) {
    throw new Error("failed-to-read-existing-animals");
  }

  const nextAnimalIds = new Set(animals.map((animal) => animal.id));
  const deletedAnimals = existingAnimalRows.filter((row) => !nextAnimalIds.has(row.id));
  const deletedAnimalIds = deletedAnimals.map((row) => row.id);

  if (deletedAnimalIds.length > 0) {
    const { error: clearSelectedAnimalError } = await supabase
      .from(TABLE_GAME_ACCOUNTS)
      .update({
        selected_animal_id: null,
        updated_at: nowIso,
      })
      .eq("user_id", userId);

    if (clearSelectedAnimalError) {
      throw new Error(`failed-to-clear-selected-animal:${clearSelectedAnimalError.message}`);
    }

    const { error: deletePlacementRefsError } = await supabase
      .from(TABLE_CAGE_ANIMAL_PLACEMENTS)
      .delete()
      .eq("user_id", userId)
      .in("animal_id", deletedAnimalIds);

    if (deletePlacementRefsError) {
      throw new Error(`failed-to-delete-placement-refs:${deletePlacementRefsError.message}`);
    }

    const { error: deleteAnimalsError } = await supabase
      .from(TABLE_ANIMAL_INSTANCES)
      .delete()
      .eq("user_id", userId)
      .in("id", deletedAnimalIds);

    if (deleteAnimalsError) {
      throw new Error(`failed-to-delete-animals:${deleteAnimalsError.message}`);
    }

    const storageObjectPaths = deletedAnimals
      .map((row) => row.thumbnail_path?.trim() ?? "")
      .map((value) => {
        if (!value || isDataThumbnailRef(value)) {
          return null;
        }

        return thumbnailStoragePathFromRef(value) ?? value;
      })
      .filter((path): path is string => path !== null);

    if (storageObjectPaths.length > 0) {
      // Best-effort: sold animals should clear their thumbnail files as well.
      await supabase.storage.from(ANIMAL_THUMBNAIL_BUCKET).remove(storageObjectPaths);
    }
  }

  const selectedAnimalId =
    state.selectedAnimalId && nextAnimalIds.has(state.selectedAnimalId) ? state.selectedAnimalId : null;

  const accountPayload = {
    user_id: userId,
    coins: state.snapshot.coins,
    selected_animal_id: selectedAnimalId,
    updated_at: nowIso,
  };
  const { error: upsertAccountError } = await supabase
    .from(TABLE_GAME_ACCOUNTS)
    .upsert(accountPayload, { onConflict: "user_id" });

  if (upsertAccountError?.code === "23503" && selectedAnimalId) {
    const { error: retryUpsertAccountError } = await supabase.from(TABLE_GAME_ACCOUNTS).upsert(
      {
        ...accountPayload,
        selected_animal_id: null,
      },
      { onConflict: "user_id" }
    );

    if (retryUpsertAccountError) {
      throw new Error(
        `failed-to-upsert-account-retry:${formatSupabaseError(retryUpsertAccountError)}`
      );
    }
  } else if (upsertAccountError) {
    throw new Error(`failed-to-upsert-account:${formatSupabaseError(upsertAccountError)}`);
  }

  const { error: upsertFeedError } = await supabase.from(TABLE_INVENTORY_ITEMS).upsert(
    {
      user_id: userId,
      item_type: FEED_ITEM_TYPE,
      item_key: FEED_ITEM_KEY,
      quantity: state.snapshot.inventory.feed,
      updated_at: nowIso,
    },
    { onConflict: "user_id,item_type,item_key" }
  );

  if (upsertFeedError) {
    throw new Error(`failed-to-upsert-feed:${formatSupabaseError(upsertFeedError)}`);
  }

  const placementRecords = Object.entries(state.snapshot.placements)
    .filter(([animalId]) => nextAnimalIds.has(animalId))
    .map(([animalId, placement]) => ({
      cage_id: cageId,
      animal_id: animalId,
      user_id: userId,
      x: placement.x,
      z: placement.z,
      rotation_y: placement.rotation,
    }));

  if (placementRecords.length > 0) {
    const { error: upsertPlacementsError } = await supabase
      .from(TABLE_CAGE_ANIMAL_PLACEMENTS)
      .upsert(placementRecords, { onConflict: "cage_id,animal_id" });

    if (upsertPlacementsError?.code === "23503") {
      const { data: existingAnimalRowsForPlacement, error: existingAnimalsForPlacementError } =
        await supabase
          .from(TABLE_ANIMAL_INSTANCES)
          .select("id")
          .eq("user_id", userId)
          .is("deleted_at", null);

      if (existingAnimalsForPlacementError) {
        throw new Error(
          `failed-to-read-animals-for-placement-retry:${formatSupabaseError(existingAnimalsForPlacementError)}`
        );
      }

      const existingAnimalIdSet = new Set(
        (((existingAnimalRowsForPlacement ?? null) as Array<{ id: string }> | null) ?? []).map(
          (row) => row.id
        )
      );
      const retryPlacementRecords = placementRecords.filter((placement) =>
        existingAnimalIdSet.has(placement.animal_id)
      );

      if (retryPlacementRecords.length > 0) {
        const { error: retryUpsertPlacementsError } = await supabase
          .from(TABLE_CAGE_ANIMAL_PLACEMENTS)
          .upsert(retryPlacementRecords, { onConflict: "cage_id,animal_id" });

        if (retryUpsertPlacementsError) {
          throw new Error(
            `failed-to-upsert-placements-retry:${formatSupabaseError(retryUpsertPlacementsError)}`
          );
        }
      }
    } else if (upsertPlacementsError) {
      throw new Error(`failed-to-upsert-placements:${formatSupabaseError(upsertPlacementsError)}`);
    }
  }

  const { data: existingPlacements, error: existingPlacementsError } = await supabase
    .from(TABLE_CAGE_ANIMAL_PLACEMENTS)
    .select("animal_id")
    .eq("user_id", userId)
    .eq("cage_id", cageId);
  const existingPlacementRows =
    ((existingPlacements ?? null) as Array<{ animal_id: string }> | null) ?? [];

  if (existingPlacementsError) {
    throw new Error("failed-to-read-existing-placements");
  }

  const deletedPlacementAnimalIds = existingPlacementRows
    .map((row) => row.animal_id)
    .filter((animalId) => !nextAnimalIds.has(animalId));

  if (deletedPlacementAnimalIds.length > 0) {
    const { error: deletePlacementsError } = await supabase
      .from(TABLE_CAGE_ANIMAL_PLACEMENTS)
      .delete()
      .eq("user_id", userId)
      .eq("cage_id", cageId)
      .in("animal_id", deletedPlacementAnimalIds);

    if (deletePlacementsError) {
      throw new Error("failed-to-delete-placements");
    }
  }
}

async function saveLegacySnapshot(
  supabase: ReturnType<typeof createBrowserClient>,
  userId: string,
  snapshot: GameSnapshot
) {
  await supabase.from(TABLE_LEGACY_STATE).upsert(
    {
      player_id: userId,
      state: snapshot,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "player_id" }
  );
}

export function createSupabaseGameRepo(options: SupabaseRepoOptions): GameRepo {
  const supabase = createBrowserClient(options.url, options.anonKey);
  let queuedState: PersistedGameState | null = null;
  let saveFlushPromise: Promise<void> | null = null;

  async function saveStateInternal(state: PersistedGameState) {
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

      try {
        await saveNormalizedState(supabase, userId, state);
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[supabaseGameRepo] saveNormalizedState failed", error);
        }
      }

      await saveLegacySnapshot(supabase, userId, state.snapshot);
    } catch {
      // Supabase can be unavailable in restricted environments.
    }
  }

  function scheduleSaveFlush(): Promise<void> {
    if (!saveFlushPromise) {
      saveFlushPromise = (async () => {
        while (queuedState) {
          const stateToPersist = queuedState;
          queuedState = null;
          await saveStateInternal(stateToPersist);
        }
      })().finally(() => {
        saveFlushPromise = null;
        if (queuedState) {
          void scheduleSaveFlush();
        }
      });
    }

    return saveFlushPromise;
  }

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

        try {
          const normalizedState = await loadNormalizedState(supabase, userId);
          const legacyState = await loadLegacySnapshot(supabase, userId);

          const nextState =
            normalizedState && legacyState
              ? normalizedState.updatedAt >= legacyState.updatedAt
                ? normalizedState.state
                : legacyState.state
              : normalizedState?.state ?? legacyState?.state ?? null;

          if (nextState) {
            await userScopedFallbackRepo.saveState(nextState);
            return nextState;
          }
        } catch (error) {
          if (process.env.NODE_ENV !== "production") {
            console.error("[supabaseGameRepo] load normalized/legacy failed", error);
          }
        }

        return fallbackState;
      } catch {
        return null;
      }
    },
    async saveState(state: PersistedGameState) {
      queuedState = state;
      await scheduleSaveFlush();
    },
  };
}
