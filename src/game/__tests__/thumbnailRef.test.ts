import {
  isStorageThumbnailRef,
  normalizeThumbnailRef,
  thumbnailRefFromStoragePath,
  thumbnailStoragePathFromRef,
} from "@/game/model/thumbnailRef";

describe("thumbnailRef", () => {
  it("creates and parses storage refs", () => {
    const ref = thumbnailRefFromStoragePath("user-1/animals/a1.jpg");
    expect(ref).toBe("storage://animal-thumbnails/user-1/animals/a1.jpg");
    expect(isStorageThumbnailRef(ref ?? "")).toBe(true);
    expect(thumbnailStoragePathFromRef(ref ?? "")).toBe("user-1/animals/a1.jpg");
  });

  it("normalizes allowed thumbnail refs", () => {
    expect(normalizeThumbnailRef(" data:image/png;base64,abc ")).toBe("data:image/png;base64,abc");
    expect(normalizeThumbnailRef("storage://animal-thumbnails/u/a.jpg")).toBe(
      "storage://animal-thumbnails/u/a.jpg"
    );
    expect(normalizeThumbnailRef("https://example.com/a.jpg")).toBe("https://example.com/a.jpg");
    expect(normalizeThumbnailRef("not-a-ref")).toBeUndefined();
  });
});
