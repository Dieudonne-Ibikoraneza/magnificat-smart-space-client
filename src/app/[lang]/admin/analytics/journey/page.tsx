"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Activity,
  ArrowRight,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  Gem,
  Home,
  LayoutGrid,
  ListChecks,
  MessageSquare,
  Package,
  Percent,
  Ruler,
  ShoppingCart,
  Sparkles,
  Star,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdminPageHeader } from "@/app/[lang]/admin/layout";
import { AnalyticsPeriodSwitcher, periodToRange, type AnalyticsPeriodDays, type AnalyticsRange } from "@/components/analytics-period-switcher";
import { ApiEmptyState, ApiErrorState } from "@/components/api-state";
import { JOURNEY_STAGE_TITLE_KEYS } from "@/components/conversion-funnel";
import { ListPagination } from "@/components/list-pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, formatCompactCurrency } from "@/lib/utils";
import { analyticsApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import type { JourneyAnalytics, JourneyStage, JourneyStageAction } from "@/lib/api/types";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const initialsOf = (name: string) =>
  name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

const LEDGER_PAGE_SIZE = 8;

const ROOM_TYPE_KEYS: Record<string, string> = {
  LIVING_ROOM: "catalog.roomTypes.livingRoom",
  BEDROOM: "catalog.roomTypes.bedroom",
  BATHROOM: "catalog.roomTypes.bathroom",
  KITCHEN: "catalog.roomTypes.kitchen",
};

/**
 * Shape of a saved design's `detail` (see `journeyStageActions` server-side)
 * — the only action detail this page renders beyond its plain `summary`.
 */
type SavedDesignDetail = {
  roomType: string;
  roomName: string;
  designName: string;
  tileCount: number;
  sharedWithSales: boolean;
  tiles: { surface: string; productId: string; productName: string; image: string | null }[];
};

const isSavedDesignDetail = (detail: unknown): detail is SavedDesignDetail =>
  !!detail && typeof detail === "object" && "tiles" in detail && Array.isArray((detail as SavedDesignDetail).tiles);

const readString = (detail: unknown, key: string): string | null => {
  if (!detail || typeof detail !== "object") return null;
  const value = (detail as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
};

const readNumber = (detail: unknown, key: string): number | null => {
  if (!detail || typeof detail !== "object") return null;
  const value = (detail as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

/** `TILE_VIEWED`/`TILE_APPLIED` detail — which exact tile they viewed/applied. */
type TileEventDetail = { productId: string; productName: string; image: string | null };
const isTileEventDetail = (detail: unknown): detail is TileEventDetail =>
  !!detail && typeof detail === "object" && "productId" in detail && "productName" in detail && !("tiles" in detail);

/** `ROOM_CREATED` detail when the frontend-logged `roomId` resolved to a real `Room` — `roomType` is what distinguishes it from the raw, unresolved metadata fallback. */
type RoomCreatedDetail = { roomType: string; roomName: string };
const isRoomCreatedDetail = (detail: unknown): detail is RoomCreatedDetail =>
  !!detail && typeof detail === "object" && "roomType" in detail && "roomName" in detail;

/** `DIMENSIONS_ENTERED` has no backing table — whatever the frontend logged (`areaSqm`, `totalAreaSqm`, or `length`×`width`) is read the same defensive way the server's own metrics computation does. */
const areaSqmOf = (detail: unknown): number | null =>
  readNumber(detail, "areaSqm") ??
  readNumber(detail, "totalAreaSqm") ??
  (readNumber(detail, "length") !== null && readNumber(detail, "width") !== null
    ? (readNumber(detail, "length") as number) * (readNumber(detail, "width") as number)
    : null);

/**
 * Where a stage's row action goes — deliberately different per `action.type`
 * (doc: "if it is the other step, it should have different actions"), driven
 * entirely by what the server actually attached to `detail`. `null` means no
 * backing resource exists to link to (e.g. the two earliest stages, which
 * have no domain table behind them).
 */
const actionTargetOf = (action: JourneyStageAction): { href: string; labelKey: string } | null => {
  switch (action.type) {
    case "ROOM_DESIGN_SAVED":
      return { href: "", labelKey: "analytics.journey.viewDesign" }; // handled via dialog, not a link
    case "QUOTE_REQUESTED":
    case "QUOTE_NEGOTIATING": {
      const orderId = readString(action.detail, "orderId");
      return orderId ? { href: `/admin/orders/${orderId}`, labelKey: "analytics.journey.viewOrder" } : null;
    }
    case "ORDER_NEGOTIATION": {
      const orderId = readString(action.detail, "orderId") ?? action.id;
      return { href: `/admin/orders/${orderId}`, labelKey: "analytics.journey.viewOrder" };
    }
    case "ORDER_PLACED":
    case "ORDER_PURCHASED":
      return { href: `/admin/orders/${action.id}`, labelKey: "analytics.journey.viewOrder" };
    case "TILE_VIEWED":
    case "TILE_APPLIED": {
      const productId = readString(action.detail, "productId");
      return productId ? { href: `/admin/inventory/${productId}`, labelKey: "analytics.journey.viewTile" } : null;
    }
    default:
      return null;
  }
};

type MetricFormat = "number" | "percent" | "currency" | "sqm" | "roomType" | "text";

const METRIC_META: Record<string, { labelKey: string; icon: LucideIcon; format: MetricFormat }> = {
  totalCustomers: { labelKey: "analytics.journey.metrics.totalCustomers", icon: Users, format: "number" },
  signedInCustomers: { labelKey: "analytics.journey.metrics.signedInCustomers", icon: UserPlus, format: "number" },
  totalDesigns: { labelKey: "analytics.journey.metrics.totalDesigns", icon: Gem, format: "number" },
  shareRate: { labelKey: "analytics.journey.metrics.shareRate", icon: Percent, format: "percent" },
  avgTilesPerDesign: { labelKey: "analytics.journey.metrics.avgTilesPerDesign", icon: LayoutGrid, format: "number" },
  totalQuotes: { labelKey: "analytics.journey.metrics.totalQuotes", icon: ListChecks, format: "number" },
  pendingQuotes: { labelKey: "analytics.journey.metrics.pendingQuotes", icon: Clock, format: "number" },
  avgItemsPerQuote: { labelKey: "analytics.journey.metrics.avgItemsPerQuote", icon: ListChecks, format: "number" },
  totalNegotiations: { labelKey: "analytics.journey.metrics.totalNegotiations", icon: MessageSquare, format: "number" },
  quoteThreads: { labelKey: "analytics.journey.metrics.quoteThreads", icon: ListChecks, format: "number" },
  orderThreads: { labelKey: "analytics.journey.metrics.orderThreads", icon: Package, format: "number" },
  totalOrders: { labelKey: "analytics.journey.metrics.totalOrders", icon: ShoppingCart, format: "number" },
  totalPurchases: { labelKey: "analytics.journey.metrics.totalPurchases", icon: ShoppingCart, format: "number" },
  totalValue: { labelKey: "analytics.journey.metrics.totalValue", icon: Wallet, format: "currency" },
  avgValue: { labelKey: "analytics.journey.metrics.avgValue", icon: Wallet, format: "currency" },
  totalViews: { labelKey: "analytics.journey.metrics.totalViews", icon: Eye, format: "number" },
  totalApplications: { labelKey: "analytics.journey.metrics.totalApplications", icon: Sparkles, format: "number" },
  uniqueTiles: { labelKey: "analytics.journey.metrics.uniqueTiles", icon: LayoutGrid, format: "number" },
  topTile: { labelKey: "analytics.journey.metrics.topTile", icon: Star, format: "text" },
  totalRoomsStarted: { labelKey: "analytics.journey.metrics.totalRoomsStarted", icon: Home, format: "number" },
  uniqueRoomTypes: { labelKey: "analytics.journey.metrics.uniqueRoomTypes", icon: LayoutGrid, format: "number" },
  topRoomType: { labelKey: "analytics.journey.metrics.topRoomType", icon: Home, format: "roomType" },
  totalEntries: { labelKey: "analytics.journey.metrics.totalEntries", icon: Ruler, format: "number" },
  avgAreaSqm: { labelKey: "analytics.journey.metrics.avgAreaSqm", icon: Ruler, format: "sqm" },
  maxAreaSqm: { labelKey: "analytics.journey.metrics.maxAreaSqm", icon: Ruler, format: "sqm" },
};

const FunnelCardSkeleton = () => (
  <div className="h-48 w-[182px] shrink-0 rounded-2xl border border-border bg-card p-5">
    <Skeleton className="h-3 w-16" />
    <Skeleton className="mt-2 h-4 w-28" />
    <Skeleton className="mt-16 h-8 w-20" />
    <Skeleton className="mt-2 h-3 w-16" />
  </div>
);

const JourneyFunnel = ({
  stages,
  loading,
  selectedStep,
  onSelectStep,
}: {
  stages: JourneyAnalytics["stages"];
  loading: boolean;
  selectedStep: number;
  onSelectStep: (index: number) => void;
}) => {
  const { t } = useTranslation();

  return (
  <section>
    <h2 className="text-lg font-bold text-ink">{t("analytics.journey.funnelTitle")}</h2>
    <div className="scrollbar-hide mt-4 flex gap-6 overflow-x-auto px-2 pb-2">
      {loading && stages.length === 0
        ? Array.from({ length: 6 }).map((_, index) => <FunnelCardSkeleton key={index} />)
        : stages.map((step, index) => {
            const isFirst = index === 0;
            const isActive = selectedStep === index;
            const percentOfTotal = Math.round(step.shareOfEntry);
            const dropOff = Math.round(step.dropOffFromPrevious);

            return (
              <div key={step.stage} className="relative flex shrink-0">
                <button
                  type="button"
                  disabled={isFirst}
                  onClick={() => onSelectStep(index)}
                  className={cn(
                    "flex h-48 w-[182px] shrink-0 flex-col justify-between rounded-2xl border bg-card p-5 text-left transition-all duration-200",
                    isFirst
                      ? "cursor-not-allowed border-border"
                      : isActive
                        ? "cursor-pointer border-primary shadow-sm border-3 bg-primary/5"
                        : "cursor-pointer border-border hover:border-primary/60 hover:bg-primary/5 hover:shadow-sm",
                  )}
                >
                  <div>
                    <div className="flex items-center gap-1">
                      {isActive && (
                        <span className="size-2.5 rounded-full bg-primary" />
                      )}
                      <p className={cn("text-xs font-bold tracking-wide uppercase", isActive ? "text-ink" : "text-muted-foreground")}>
                        {t("analytics.journey.step", { n: index + 1 })}
                      </p>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-ink tracking-[0.14px]">{t(JOURNEY_STAGE_TITLE_KEYS[step.stage])}</p>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-ink">
                      {step.customers.toLocaleString()}
                    </p>
                    <div className="mt-1 flex items-center gap-2 justify-between">
                      <p className={cn("text-xs font-medium", isActive ? "text-ink/80" : "text-ink/60")}>
                        {t("analytics.journey.percentOfTotal", { value: percentOfTotal })}
                      </p>
                      {!isFirst && dropOff > 0 && (
                        <span className="rounded-sm bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                          -{dropOff}%
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                {index < stages.length - 1 && (
                  <span
                    className={cn(
                      "absolute top-1/2 right-0 z-10 inline-flex size-8 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border  bg-card text-muted-foreground shadow-sm",
                      isActive ? "border-primary" : "border-border",
                    )}
                  >
                    <ArrowRight className="size-4" />
                  </span>
                )}
              </div>
            );
          })}
    </div>
  </section>
  );
};

const TileThumb = ({ image }: { image: string | null }) => (
  <span className="relative size-7 shrink-0 overflow-hidden rounded-full bg-muted-background ring-2 ring-card">
    {image && <Image src={image} alt="" fill unoptimized className="object-cover" sizes="28px" />}
  </span>
);

/**
 * The Customer Ledger's "Activity" cell — real, stage-specific detail rather
 * than a generic label, driven entirely by what the server attached to
 * `action.detail` (doc: "the activity doesn't change... but telling exactly
 * what tiles that they viewed", "3d room created, they mention the designs
 * used... bathroom, kitchen", "dimensions entered, show what was entered").
 * Falls back to the plain `summary` for stages with nothing richer to show.
 */
const ActivityCell = ({ action, t }: { action: JourneyStageAction; t: (key: string, opts?: Record<string, unknown>) => string }) => {
  if (isSavedDesignDetail(action.detail)) {
    const design = action.detail;
    return (
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {design.tiles.slice(0, 3).map((tile, index) => (
            <TileThumb key={`${tile.productId}-${index}`} image={tile.image} />
          ))}
        </div>
        <span className="min-w-0">
          <span className="block truncate font-semibold">{t(ROOM_TYPE_KEYS[design.roomType] ?? design.roomType)}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {design.tiles.map((tile) => tile.productName).join(", ")}
          </span>
        </span>
      </div>
    );
  }

  if ((action.type === "TILE_VIEWED" || action.type === "TILE_APPLIED") && isTileEventDetail(action.detail)) {
    const tile = action.detail;
    return (
      <div className="flex items-center gap-2.5">
        <TileThumb image={tile.image} />
        <span className="truncate font-semibold">{tile.productName}</span>
      </div>
    );
  }

  if (action.type === "ROOM_CREATED" && isRoomCreatedDetail(action.detail)) {
    const room = action.detail;
    return (
      <span>
        <span className="block truncate font-semibold">{t(ROOM_TYPE_KEYS[room.roomType] ?? room.roomType)}</span>
        <span className="block truncate text-xs text-muted-foreground">{room.roomName}</span>
      </span>
    );
  }

  if (action.type === "DIMENSIONS_ENTERED") {
    const areaSqm = areaSqmOf(action.detail);
    if (areaSqm !== null) {
      return <span>{t("analytics.journey.dimensionsValue", { value: areaSqm.toLocaleString() })}</span>;
    }
  }

  return <>{action.summary ?? action.type.replace(/_/g, " ").toLowerCase()}</>;
};

/** The tile thumbnails + names a saved design used, and whether it was shared with sales — opened from the ledger's "View Design" action. */
const DesignDetailDialog = ({ action, onClose }: { action: JourneyStageAction | null; onClose: () => void }) => {
  const { t } = useTranslation();
  const detail = action && isSavedDesignDetail(action.detail) ? action.detail : null;

  return (
    <Dialog open={!!action} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {detail && (
          <>
            <DialogHeader>
              <DialogTitle>{detail.designName}</DialogTitle>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  {t("analytics.journey.designDialogRoomType")}
                </p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {t(ROOM_TYPE_KEYS[detail.roomType] ?? detail.roomType)} · {detail.roomName}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  {t("analytics.journey.designDialogTiles")}
                </p>
                <ul className="mt-2 space-y-2">
                  {detail.tiles.map((tile, index) => (
                    <li key={`${tile.productId}-${index}`} className="flex items-center gap-3">
                      <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted-background">
                        {tile.image && (
                          <Image src={tile.image} alt="" fill unoptimized className="object-cover" sizes="40px" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{tile.productName}</span>
                        <span className="block text-xs text-muted-foreground">{tile.surface}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                {detail.sharedWithSales
                  ? t("analytics.journey.designDialogShared")
                  : t("analytics.journey.designDialogNotShared")}
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

const formatMetricValue = (
  format: MetricFormat,
  value: number | string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string => {
  switch (format) {
    case "percent":
      return `${value}%`;
    case "currency":
      return formatCompactCurrency(Number(value));
    case "sqm":
      return `${Number(value).toLocaleString()} ${t("analytics.common.sqm")}`;
    case "roomType":
      return typeof value === "string" && ROOM_TYPE_KEYS[value] ? t(ROOM_TYPE_KEYS[value]) : String(value);
    case "text":
      return String(value);
    default:
      return typeof value === "number" ? value.toLocaleString() : String(value);
  }
};

const StepDrillDown = ({
  stage,
  period,
}: {
  stage: JourneyStage;
  period: AnalyticsRange;
}) => {
  const { t } = useTranslation();
  const { data: detail, loading, error, reload } = useApi(
    () => analyticsApi.journeyStageDetail(stage, period),
    [stage, period],
  );
  const [openDesign, setOpenDesign] = useState<JourneyStageAction | null>(null);
  const [page, setPage] = useState(1);

  const metrics = detail?.metrics ?? [];
  const usersBySession = new Map((detail?.users ?? []).map((user) => [user.sessionId, user]));
  const totalActions = detail?.actions.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalActions / LEDGER_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedActions = (detail?.actions ?? []).slice(
    (safePage - 1) * LEDGER_PAGE_SIZE,
    safePage * LEDGER_PAGE_SIZE,
  );

  return (
    <>
      <section>
        <h2 className="text-lg font-bold text-ink">{t("analytics.journey.drillDown", { stage: t(JOURNEY_STAGE_TITLE_KEYS[stage]) })}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading && !detail
            ? Array.from({ length: 4 }).map((_, index) => (
                <article key={index} className="rounded-2xl bg-card p-5 sm:p-6">
                  <Skeleton className="size-5" />
                  <Skeleton className="mt-4 h-3 w-24" />
                  <Skeleton className="mt-2 h-8 w-16" />
                </article>
              ))
            : metrics.map((metric) => {
                const meta = METRIC_META[metric.key];
                const Icon = meta?.icon ?? Activity;
                return (
                  <article key={metric.key} className="rounded-2xl bg-card p-5 sm:p-6">
                    <Icon className="size-5 stroke-2 text-ink" />
                    <p className="mt-4 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                      {meta ? t(meta.labelKey) : metric.key}
                    </p>
                    <p className="mt-1 text-2xl font-black text-ink">
                      {formatMetricValue(meta?.format ?? "number", metric.value, t)}
                    </p>
                  </article>
                );
              })}
        </div>
      </section>

      <section className="rounded-2xl bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-ink">{t("analytics.journey.customerLedger")}</h2>
          <button
            type="button"
            className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-ink hover:underline"
          >
            <Filter className="size-3.5" /> {t("analytics.journey.filter")}
          </button>
        </div>
        <div className="mt-5 overflow-x-auto">
          {error ? (
            <ApiErrorState message={error} onRetry={reload} />
          ) : !loading && detail && detail.actions.length === 0 ? (
            <ApiEmptyState message={t("analytics.journey.noActivity")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("analytics.journey.colCustomer")}</TableHead>
                  <TableHead>{t("analytics.journey.colActivity")}</TableHead>
                  <TableHead>{t("analytics.journey.colDate")}</TableHead>
                  <TableHead>{t("analytics.journey.colAction")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && !detail
                  ? Array.from({ length: 3 }).map((_, index) => (
                      <TableRow key={index}>
                        {Array.from({ length: 4 }).map((__, cell) => (
                          <TableCell key={cell}>
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : pagedActions.map((action) => {
                      const profile = action.userId
                        ? [...usersBySession.values()].find((user) => user.userId === action.userId)?.profile
                        : undefined;
                      const name = profile?.fullName ?? t("analytics.journey.anonymousSession");
                      const target = actionTargetOf(action);

                      return (
                        <TableRow key={action.id}>
                          <TableCell className="min-w-52">
                            <div className="flex items-center gap-3">
                              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-card">
                                {profile ? initialsOf(name) : "?"}
                              </span>
                              <span className="truncate text-sm font-semibold text-ink">{name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="min-w-64 text-sm text-ink">
                            <ActivityCell action={action} t={t} />
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-ink">{formatDate(action.createdAt)}</TableCell>
                          <TableCell>
                            {!target ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : action.type === "ROOM_DESIGN_SAVED" ? (
                              <button
                                type="button"
                                onClick={() => setOpenDesign(action)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold whitespace-nowrap text-ink hover:-translate-y-0.5 hover:shadow-md active:scale-95"
                              >
                                {t(target.labelKey)} <ExternalLink className="size-3.5" />
                              </button>
                            ) : (
                              <Link
                                href={target.href}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold whitespace-nowrap text-ink hover:-translate-y-0.5 hover:shadow-md active:scale-95"
                              >
                                {t(target.labelKey)} <ExternalLink className="size-3.5" />
                              </Link>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>
          )}
        </div>
        <ListPagination
          page={safePage}
          totalPages={totalPages}
          totalItems={totalActions}
          pageSize={LEDGER_PAGE_SIZE}
          onPageChange={setPage}
        />
      </section>

      <DesignDetailDialog action={openDesign} onClose={() => setOpenDesign(null)} />
    </>
  );
};

const AdminAnalyticsJourneyPageContent = () => {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const requestedStage = searchParams.get("stage");
  const [selectedStep, setSelectedStep] = useState(1);
  const [period, setPeriod] = useState<AnalyticsPeriodDays>(30);
  const range = periodToRange[period];

  const { data: journey, loading, error, reload } = useApi(() => analyticsApi.journey(range), [range]);
  const stages = journey?.stages ?? [];
  const activeIndex = Math.min(selectedStep, Math.max(stages.length - 1, 0));
  const activeStage = stages[activeIndex];

  // Lands on the step a caller linked to (e.g. the dashboard's own funnel
  // widget, "?stage=CREATED_ROOM") once the real stage order loads, instead
  // of always opening on step 2 — computed during render (React's documented
  // pattern for "adjusting state when an input changes") rather than an
  // effect, and applied only once so it never fights a step the visitor
  // picks by hand afterwards.
  const [appliedRequestedStage, setAppliedRequestedStage] = useState(false);
  if (!appliedRequestedStage && requestedStage && stages.length > 0) {
    setAppliedRequestedStage(true);
    const index = stages.findIndex((row) => row.stage === requestedStage);
    if (index > 0) setSelectedStep(index);
  }

  return (
    <>
      <AdminPageHeader
        title={t("analytics.journey.title")}
        subtitle={t("analytics.journey.subtitle")}
      >
        <AnalyticsPeriodSwitcher period={period} onChange={setPeriod} />
      </AdminPageHeader>
      <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
        {error ? (
          <ApiErrorState message={error} onRetry={reload} />
        ) : (
          <>
            <JourneyFunnel stages={stages} loading={loading} selectedStep={activeIndex} onSelectStep={setSelectedStep} />
            {activeStage && (
              <StepDrillDown key={activeStage.stage} stage={activeStage.stage} period={range} />
            )}
          </>
        )}
      </div>
    </>
  );
};

const AdminAnalyticsJourneyPage = () => (
  <Suspense fallback={null}>
    <AdminAnalyticsJourneyPageContent />
  </Suspense>
);

export default AdminAnalyticsJourneyPage;
