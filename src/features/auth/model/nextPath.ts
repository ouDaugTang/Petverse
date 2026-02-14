export function toSafeNextPath(path: string | null): string {
  if (!path || !path.startsWith("/")) {
    return "/cage";
  }

  if (path.startsWith("//")) {
    return "/cage";
  }

  return path;
}
