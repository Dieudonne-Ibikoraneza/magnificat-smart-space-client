"use client";

import { useTranslation } from "react-i18next";

import { isLocale, useLocale } from "@/lib/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Drop-in language picker. Reads/writes the locale through `useLocale`, so
 * a change persists (cookie) and re-syncs server components. Place it in a
 * header, footer, or account settings.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { locale, locales, labels, setLocale } = useLocale();

  return (
    <Select
      value={locale}
      onValueChange={(value) => {
        if (isLocale(value)) setLocale(value);
      }}
    >
      <SelectTrigger size="sm" className={className} aria-label={t("language.label")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {locales.map((code) => (
          <SelectItem key={code} value={code}>
            {labels[code]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
