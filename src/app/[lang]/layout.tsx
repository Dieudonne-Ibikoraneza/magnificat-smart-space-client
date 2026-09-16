import { notFound } from "next/navigation";

import { LOCALES, isLocale } from "@/lib/i18n/config";
import { LanguageGate } from "@/components/language-gate";
import { LocaleSync } from "@/components/locale-sync";

/**
 * Pre-renders `/en/…` and `/rw/…`. Any other first segment (`/foo/…`) that
 * slips past the proxy falls through to `notFound()` below rather than
 * rendering as a bogus locale.
 */
export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }));

/**
 * Layout for the locale-prefixed areas of the app (the storefront and
 * `auth`). The real `<html>` / `<body>` and the app-wide providers stay in
 * the root `app/layout.tsx`; this layer only pins the active language to
 * the URL segment and shows the first-visit language gate.
 */
const LangLayout = async ({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) => {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <>
      <LocaleSync locale={lang} />
      {children}
      <LanguageGate />
    </>
  );
};

export default LangLayout;
