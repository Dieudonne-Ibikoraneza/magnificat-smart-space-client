"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

export const AnalyticsViewAllLink = ({
  href,
  section,
  onSelect,
}: {
  href: string;
  section: string;
  onSelect?: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <Link
      href={href}
      onNavigate={(event) => {
        if (!href.startsWith("#")) return;
        const target = document.getElementById(href.slice(1));
        if (!target) return;
        event.preventDefault();
        onSelect?.();
        requestAnimationFrame(() => {
          target.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "auto"
              : "smooth",
            block: "start",
          });
        });
      }}
      aria-label={`${t("analytics.common.viewAll")}: ${section}`}
      className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md px-2 py-1 text-xs font-semibold text-ink hover:bg-secondary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <ExternalLink className="size-3.5" aria-hidden="true" />
      {t("analytics.common.viewAll")}
    </Link>
  );
};
