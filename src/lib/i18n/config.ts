/**
 * The two languages the app ships in. Everything else in `lib/i18n` — the
 * provider, the `<html lang>` on the server, the `/en` and `/rw` URL
 * prefixes handled in `src/proxy.ts`, the first-visit language gate — is
 * derived from this list.
 */
export const LOCALES = ["en", "rw"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/**
 * Where the chosen locale is remembered. The cookie is what `src/proxy.ts`
 * reads to decide which prefix to send an unprefixed request to, and what
 * the server reads while rendering; the localStorage copy is the flag the
 * first-visit language gate checks (see `components/language-gate.tsx`).
 * Same `mss.` prefix as every other key in the app — see `lib/session-id.ts`.
 */
export const LOCALE_COOKIE = "mss.lang";
export const LOCALE_STORAGE_KEY = "mss.lang";

/** Each language named in itself — the usual convention for a language picker. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  rw: "Ikinyarwanda",
};

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (LOCALES as readonly string[]).includes(value);

export const resolveLocale = (value: unknown): Locale => (isLocale(value) ? value : DEFAULT_LOCALE);

/**
 * Best-effort pick from an `Accept-Language` header, used only as a last
 * resort when there is neither a cookie nor a first-visit choice yet.
 * Matches on the base language tag (`en-US` -> `en`).
 */
export const localeFromAcceptLanguage = (header: string | null | undefined): Locale => {
  if (!header) return DEFAULT_LOCALE;
  for (const part of header.split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase();
    const base = tag?.split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
};

// --- URL helpers -----------------------------------------------------------
// The migrated routes live under `/[lang]/…`. These keep the segment and the
// rest of the path in sync without every caller re-parsing `pathname`.

/** The locale a pathname is already prefixed with, or `null` if it has none. */
export const localeFromPathname = (pathname: string): Locale | null => {
  const first = pathname.split("/")[1];
  return isLocale(first) ? first : null;
};

/** `/en/auth` -> `/auth`, `/rw` -> `/`, `/auth` -> `/auth` (unchanged). */
export const stripLocale = (pathname: string): string => {
  const locale = localeFromPathname(pathname);
  if (!locale) return pathname;
  const rest = pathname.slice(locale.length + 1);
  return rest === "" ? "/" : rest;
};

/** `( "/auth", "rw" )` -> `/rw/auth`; `( "/", "en" )` -> `/en`. */
export const withLocale = (pathname: string, locale: Locale): string => {
  const rest = stripLocale(pathname);
  return rest === "/" ? `/${locale}` : `/${locale}${rest}`;
};
