export const ANIMAL_THUMBNAIL_BUCKET = "animal-thumbnails";
const STORAGE_THUMBNAIL_PREFIX = `storage://${ANIMAL_THUMBNAIL_BUCKET}/`;

export function isDataThumbnailRef(value: string): boolean {
  return value.startsWith("data:image/");
}

export function isStorageThumbnailRef(value: string): boolean {
  return value.startsWith(STORAGE_THUMBNAIL_PREFIX);
}

export function thumbnailRefFromStoragePath(path: string): string | undefined {
  const normalized = path.trim();
  if (!normalized) {
    return undefined;
  }

  return `${STORAGE_THUMBNAIL_PREFIX}${normalized}`;
}

export function thumbnailStoragePathFromRef(ref: string): string | undefined {
  if (!isStorageThumbnailRef(ref)) {
    return undefined;
  }

  const path = ref.slice(STORAGE_THUMBNAIL_PREFIX.length).trim();
  return path.length > 0 ? path : undefined;
}

export function normalizeThumbnailRef(ref: string): string | undefined {
  const normalized = ref.trim();
  if (!normalized) {
    return undefined;
  }

  if (
    isDataThumbnailRef(normalized) ||
    isStorageThumbnailRef(normalized) ||
    normalized.startsWith("http://") ||
    normalized.startsWith("https://")
  ) {
    return normalized;
  }

  return undefined;
}
