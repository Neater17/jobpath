export function normalizeNarrativeText(value: string | null | undefined) {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (!text) {
    return "";
  }

  return text.replace(/\.{2,}$/, ".");
}
