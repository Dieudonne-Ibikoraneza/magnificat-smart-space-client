"use client";

import { Globe2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { isLocale, useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Language picker for the site header. The dropdown is the app's standard
 * `Select`, but the trigger is a plain borderless "🌐 EN" control — the
 * visitor opens it and chooses a language rather than it cycling on click.
 * Selecting a language routes to the same page under the new `/[lang]`
 * prefix and persists the choice (see `useLocale`).
 */
export const LanguageMenu = ({ className }: { className?: string }) => {
  const { t } = useTranslation();
  const { locale, locales, labels, setLocale } = useLocale();

  return (
    <Select
      value={locale}
      onValueChange={(value) => {
        if (isLocale(value)) setLocale(value);
      }}
    >
      <SelectTrigger
        aria-label={t("language.select")}
        className={cn(
          // Strip the input chrome: no border, no fixed height, no padding,
          // no focus ring, and hide the trailing chevron (last <svg>).
          "h-auto w-auto justify-start gap-1.5 border-0 bg-transparent p-0 text-sm font-medium text-muted transition-colors hover:text-ink focus-visible:ring-0 data-[size=default]:h-auto data-popup-open:text-ink [&>svg:last-child]:hidden",
          className,
        )}
      >
        <Globe2 className="size-4" />
        {locale.toUpperCase()}
      </SelectTrigger>
      <SelectContent align="end" className="min-w-40">
        {locales.map((code) => (
          <SelectItem key={code} value={code}>
            {labels[code]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
