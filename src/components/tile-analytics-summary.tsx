"use client";

import {
  Eye,
  GitCompareArrows,
  Heart,
  MousePointerClick,
  MousePointerSquareDashed,
  ShoppingBasket,
  Wallet,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { analyticsApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import type { Role } from "@/lib/api/types";
import { useCurrentUser } from "@/lib/current-user";
import { cn, formatCompactNumber } from "@/lib/utils";

/** Mirrors `AnalyticsController`'s tile-route roles. Roles omitted here get no markup and no request. */
const TILE_ANALYTICS_ROLES: ReadonlySet<Role> = new Set([
  "ADMIN",
  "STOCK_MANAGER",
  "DATA_ANALYST",
]);

export const canViewTileAnalytics = (role?: Role): boolean =>
  role !== undefined && TILE_ANALYTICS_ROLES.has(role);

type TileAnalyticsSummaryProps = {
  productId: string;
  /** Cards only need the two strongest at-a-glance signals. */
  variant?: "compact" | "full";
  className?: string;
};

const AuthorizedTileAnalyticsSummary = ({
  productId,
  variant = "full",
  className,
}: TileAnalyticsSummaryProps) => {
  const { t } = useTranslation();
  const { data: rates, loading, error, reload } = useApi(
    () => analyticsApi.tileRates(productId),
    [productId],
  );

  if (variant === "compact") {
    if (error) return null;
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-muted",
          className,
        )}
        aria-label={t("staffToolbar.product.analytics.summary")}
      >
        <span className="inline-flex items-center gap-1.5" title={t("staffToolbar.product.analytics.views")}>
          <Eye className="size-3.5" />
          {rates ? formatCompactNumber(rates.viewed) : "—"}
        </span>
        <span
          className="inline-flex items-center gap-1.5 text-red-600"
          title={t("staffToolbar.product.analytics.likes")}
        >
          <Heart className="size-3.5 fill-red-500 text-red-500" />
          {rates ? formatCompactNumber(rates.saved) : "—"}
        </span>
        <span
          className="inline-flex items-center gap-1.5"
          title={t("staffToolbar.product.analytics.selectionRate")}
        >
          <MousePointerClick className="size-3.5" />
          {rates ? `${rates.selectionRate.toFixed(1)}%` : "—"}
        </span>
        <span
          className="inline-flex items-center gap-1.5"
          title={t("staffToolbar.product.analytics.purchaseConversion")}
        >
          <Wallet className="size-3.5" />
          {rates ? `${rates.purchaseConversion.toFixed(1)}%` : "—"}
        </span>
      </div>
    );
  }

  const stats = [
    { key: "views", icon: Eye, label: t("staffToolbar.product.analytics.views"), value: rates ? formatCompactNumber(rates.viewed) : "—" },
    { key: "likes", icon: Heart, label: t("staffToolbar.product.analytics.likes"), value: rates ? formatCompactNumber(rates.saved) : "—", accent: "text-red-600", iconClassName: "fill-red-500 text-red-500" },
    { key: "applications", icon: MousePointerSquareDashed, label: t("staffToolbar.product.analytics.applications"), value: rates ? formatCompactNumber(rates.applied) : "—" },
    { key: "comparisons", icon: GitCompareArrows, label: t("staffToolbar.product.analytics.comparisons"), value: rates ? formatCompactNumber(rates.compared) : "—" },
    { key: "purchases", icon: ShoppingBasket, label: t("staffToolbar.product.analytics.purchases"), value: rates ? formatCompactNumber(rates.purchased) : "—" },
    { key: "selectionRate", icon: MousePointerClick, label: t("staffToolbar.product.analytics.selectionRate"), value: rates ? `${rates.selectionRate.toFixed(1)}%` : "—" },
    { key: "purchaseConversion", icon: Wallet, label: t("staffToolbar.product.analytics.purchaseConversion"), value: rates ? `${rates.purchaseConversion.toFixed(1)}%` : "—" },
  ];

  return (
    <section className={cn("rounded-2xl border border-slate-100 bg-card p-5 sm:p-6", className)}>
      <h2 className="text-sm font-bold uppercase tracking-wide text-ink">
        {t("staffToolbar.product.analytics.title")}
      </h2>
      {error && !rates ? (
        <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>{t("staffToolbar.product.analytics.loadError")}</p>
          <Button type="button" variant="outline" size="sm" onClick={reload}>
            {t("staffToolbar.product.analytics.retry")}
          </Button>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(({ key, icon: Icon, label, value, accent, iconClassName }) => (
            <div key={key} className="rounded-xl bg-muted-background/70 p-3">
              <Icon className={cn("size-4 text-ink", iconClassName)} />
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p>
              <p className={cn("mt-0.5 text-base font-black text-ink", accent)}>
                {loading && !rates ? "—" : value}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

/**
 * Fetches analytics only after the signed-in viewer's role has been checked.
 * The API enforces the same role list; this guard also avoids noisy 403s for
 * clients, sales staff, and anonymous storefront visitors.
 */
export const TileAnalyticsSummary = (props: TileAnalyticsSummaryProps) => {
  const { user } = useCurrentUser();
  if (!canViewTileAnalytics(user?.role)) return null;
  return <AuthorizedTileAnalyticsSummary {...props} />;
};
