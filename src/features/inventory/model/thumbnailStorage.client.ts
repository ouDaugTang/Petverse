"use client";

import {
  ANIMAL_THUMBNAIL_BUCKET,
  isDataThumbnailRef,
  thumbnailRefFromStoragePath,
  thumbnailStoragePathFromRef,
} from "@/game";
import { getSupabaseBrowserClient } from "@/lib/supabase";

const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60;
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

function inferFileExtension(file: File): string {
  if (file.type === "image/png") {
    return "png";
  }
  if (file.type === "image/webp") {
    return "webp";
  }
  if (file.type === "image/jpeg") {
    return "jpg";
  }

  const byName = file.name.split(".").pop()?.trim().toLowerCase();
  if (byName && /^[a-z0-9]+$/.test(byName)) {
    return byName;
  }

  return "jpg";
}

async function getCurrentUserId() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}

export async function uploadAnimalThumbnailToStorage(
  animalId: string,
  file: File
): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return null;
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return null;
  }

  const extension = inferFileExtension(file);
  const objectPath = `${userId}/animals/${animalId}.${extension}`;

  const { error } = await supabase.storage.from(ANIMAL_THUMBNAIL_BUCKET).upload(objectPath, file, {
    upsert: true,
    contentType: file.type || undefined,
    cacheControl: "3600",
  });

  if (error) {
    throw error;
  }

  const ref = thumbnailRefFromStoragePath(objectPath);
  if (ref) {
    signedUrlCache.delete(ref);
  }
  return ref ?? null;
}

export async function deleteAnimalThumbnailFromStorage(ref: string): Promise<void> {
  const objectPath = thumbnailStoragePathFromRef(ref);
  if (!objectPath) {
    return;
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return;
  }

  const userId = await getCurrentUserId();
  if (!userId || !objectPath.startsWith(`${userId}/`)) {
    return;
  }

  await supabase.storage.from(ANIMAL_THUMBNAIL_BUCKET).remove([objectPath]);
  signedUrlCache.delete(ref);
}

export async function resolveAnimalThumbnailSrc(ref: string): Promise<string | null> {
  if (!ref) {
    return null;
  }

  if (isDataThumbnailRef(ref) || ref.startsWith("http://") || ref.startsWith("https://")) {
    return ref;
  }

  const objectPath = thumbnailStoragePathFromRef(ref);
  if (!objectPath) {
    return null;
  }

  const cached = signedUrlCache.get(ref);
  if (cached && cached.expiresAt > Date.now() + 5_000) {
    return cached.url;
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(ANIMAL_THUMBNAIL_BUCKET)
    .createSignedUrl(objectPath, SIGNED_URL_EXPIRES_IN_SECONDS);

  if (error || !data?.signedUrl) {
    return null;
  }

  const expiresAt = Date.now() + SIGNED_URL_EXPIRES_IN_SECONDS * 1000;
  signedUrlCache.set(ref, {
    url: data.signedUrl,
    expiresAt,
  });

  return data.signedUrl;
}
