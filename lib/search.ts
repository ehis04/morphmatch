/** Search should accept an athlete's name with or without its diacritics. */
export function normalizeSearch(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
