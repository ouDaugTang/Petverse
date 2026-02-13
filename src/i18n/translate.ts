export function formatMessage(
  template: string,
  params?: Record<string, string | number | null | undefined>
): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = params[key];
    return value === null || value === undefined ? "" : String(value);
  });
}
