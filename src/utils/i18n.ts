// Locale URL prefixes — the content-directory codes under src/content/pages/<lang>/.
// Must match LANGUAGE_MAP in the translation scripts and the langCodes in mainNav.json.
export const LOCALE_CODES = [
  "ar",
  "bg",
  "zh-hans",
  "zh-hant",
  "fr",
  "de",
  "el",
  "hu",
  "id",
  "it",
  "ja",
  "ko",
  "ms",
  "fa",
  "pl",
  "pt-br",
  "pt-pt",
  "es",
  "es-419",
  "th",
  "tr",
  "vi",
];

/** The locale prefix of the current path, or null when on the default (English) site. */
export function getCurrentLocale(pathname: string): string | null {
  const first = pathname.split("/").filter(Boolean)[0];
  return first && LOCALE_CODES.includes(first) ? first : null;
}

/**
 * Prefix an internal link with the current locale so navigation stays in-language.
 * Leaves external links, protocol-relative URLs, anchors, mailto/tel, and
 * already-localized paths untouched. On the default (English) site, returns href as-is.
 */
export function localizePath(
  href: string | undefined | null,
  pathname: string
): string | undefined | null {
  const locale = getCurrentLocale(pathname);
  if (!locale || typeof href !== "string") return href;
  if (!href.startsWith("/") || href.startsWith("//")) return href; // external / protocol-relative
  const first = href.split("/").filter(Boolean)[0];
  if (first && LOCALE_CODES.includes(first)) return href; // already localized
  return `/${locale}${href}`;
}
