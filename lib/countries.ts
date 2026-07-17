/** ISO 3166-1 alpha-2 helpers: flag emoji + display name. */

export function flagEmoji(iso2: string): string {
  const code = iso2.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🏳️";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

const display =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

export function countryName(iso2: string): string {
  try {
    return display?.of(iso2.toUpperCase()) ?? iso2;
  } catch {
    return iso2;
  }
}
