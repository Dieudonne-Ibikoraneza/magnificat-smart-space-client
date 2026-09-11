import { NextResponse, type NextRequest } from "next/server";

import {
  LOCALE_COOKIE,
  isLocale,
  localeFromAcceptLanguage,
  type Locale,
} from "@/lib/i18n/config";

/**
 * Locale routing for the migrated areas of the app.
 *
 * Every route now lives under `app/[lang]/`, so every URL carries an `/en`
 * or `/rw` prefix. This proxy is what *adds* that prefix: an unprefixed
 * request to one of these paths is redirected to the visitor's language.
 * Requests already carrying a valid prefix pass straight through (and
 * refresh the `mss.lang` cookie so unprefixed `<Link href="/…">` elsewhere
 * resolve to the same language) — every internal link in the app stays a
 * bare, unprefixed path (`href="/admin/overview"`) rather than a
 * locale-aware `<Link>` wrapper; this proxy redirect is what turns that into
 * `/en/admin/overview` on click.
 */
const MIGRATED = [
  "/",
  "/auth",
  "/products",
  "/collections",
  "/visualizer",
  "/calculator",
  "/chatbot",
  "/compare",
  "/account",
  "/admin",
  "/sales",
  "/stock",
  "/analytics",
] as const;

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const isMigratedPath = (pathname: string): boolean =>
  MIGRATED.some((base) =>
    base === "/" ? pathname === "/" : pathname === base || pathname.startsWith(`${base}/`),
  );

const preferredLocale = (request: NextRequest): Locale => {
  const fromCookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  // No stored choice yet (first visit) — best guess; the language gate
  // (`components/language-gate.tsx`) then asks the visitor to confirm.
  return localeFromAcceptLanguage(request.headers.get("accept-language"));
};

const setLocaleCookie = (response: NextResponse, locale: Locale): void => {
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });
};

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const firstSegment = pathname.split("/")[1];

  if (isLocale(firstSegment)) {
    const response = NextResponse.next();
    if (request.cookies.get(LOCALE_COOKIE)?.value !== firstSegment) {
      setLocaleCookie(response, firstSegment);
    }
    return response;
  }

  if (isMigratedPath(pathname)) {
    const locale = preferredLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
    const response = NextResponse.redirect(url);
    setLocaleCookie(response, locale);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  // Skip API routes, Next internals, and anything with a file extension
  // (assets in `public/`). Everything else runs through the proxy.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
