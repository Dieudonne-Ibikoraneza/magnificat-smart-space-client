"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LOCALES, LOCALE_LABELS, isLocale, withLocale, type Locale } from "@/lib/i18n/config";
import { persistLocaleChoice, readLocaleChoice } from "@/lib/i18n/persist";

const NO_SUBSCRIBE = () => () => {};

/**
 * Shown once: the first time someone opens the app on this device with no
 * language chosen yet. Picking a language stores the choice (cookie +
 * localStorage) and moves to the same page under the new `/[lang]` prefix.
 * On every later visit the stored flag is found and this renders nothing.
 *
 * The "has a choice been made?" read goes through `useSyncExternalStore`
 * with a server snapshot of `true` (gate closed during SSR — no hydration
 * mismatch) and a client snapshot that reads localStorage.
 *
 * Mounted in `app/[lang]/layout.tsx`, so it only guards the already-migrated
 * areas for now.
 */
export const LanguageGate = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const pathname = usePathname() ?? "/";

  const hasChoice = useSyncExternalStore(
    NO_SUBSCRIBE,
    () => isLocale(readLocaleChoice()),
    () => true,
  );
  const [dismissed, setDismissed] = useState(false);
  const open = !hasChoice && !dismissed;

  const choose = (locale: Locale) => {
    persistLocaleChoice(locale);
    void i18n.changeLanguage(locale);
    setDismissed(true);
    const target = withLocale(pathname, locale);
    if (target !== pathname) router.replace(target);
  };

  return (
    <Dialog open={open} onOpenChange={() => undefined} disablePointerDismissal>
      <DialogContent showClose={false} className="max-w-sm text-center">
        <DialogHeader className="items-center pr-0 text-center">
          <DialogTitle>{t("languageGate.title")}</DialogTitle>
          <DialogDescription>{t("languageGate.description")}</DialogDescription>
        </DialogHeader>
        <div className="mt-5 flex flex-col gap-2.5">
          {LOCALES.map((locale) => (
            <Button
              key={locale}
              type="button"
              variant="outline"
              className="h-12 w-full justify-center text-base font-semibold"
              onClick={() => choose(locale)}
            >
              {LOCALE_LABELS[locale]}
            </Button>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">{t("languageGate.hint")}</p>
      </DialogContent>
    </Dialog>
  );
};
