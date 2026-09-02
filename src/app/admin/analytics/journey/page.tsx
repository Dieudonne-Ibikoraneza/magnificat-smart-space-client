"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ExternalLink,
  Filter,
  TrendingDown,
  UserPlus,
  Users,
} from "lucide-react";
import { AdminPageHeader } from "@/app/admin/layout";
import { AnalyticsPeriodSwitcher, periodToRange, type AnalyticsPeriodDays, type AnalyticsRange } from "@/components/analytics-period-switcher";
import { ApiEmptyState, ApiErrorState } from "@/components/api-state";
import { JOURNEY_STAGE_META } from "@/components/conversion-funnel";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { analyticsApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import type { JourneyAnalytics, JourneyStage } from "@/lib/api/types";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const initialsOf = (name: string) =>
  name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

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
}) => (
  <section>
    <h2 className="text-lg font-bold text-ink">Customer Journey Funnel</h2>
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
                        : "cursor-pointer border-border hover:border-primary/60 hover:-translate-y-0.5 hover:bg-primary/5",
                  )}
                >
                  <div>
                    <div className="flex items-center gap-1">
                      {isActive && (
                        <span className="size-2.5 rounded-full bg-primary" />
                      )}
                      <p className={cn("text-xs font-bold tracking-wide uppercase", isActive ? "text-ink" : "text-muted-foreground")}>
                        Step {index + 1}
                      </p>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-ink tracking-[0.14px]">{JOURNEY_STAGE_META[step.stage].title}</p>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-ink">
                      {step.customers.toLocaleString()}
                    </p>
                    <div className="mt-1 flex items-center gap-2 justify-between">
                      <p className={cn("text-xs font-medium", isActive ? "text-ink/80" : "text-ink/60")}>
                        {percentOfTotal}% of Total
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

const StepDrillDown = ({
  stage,
  dropOffRate,
  period,
}: {
  stage: JourneyStage;
  dropOffRate: number;
  period: AnalyticsRange;
}) => {
  const { data: detail, loading, error, reload } = useApi(
    () => analyticsApi.journeyStageDetail(stage, period),
    [stage, period],
  );

  const signedIn = detail?.users.filter((user) => user.profile).length ?? 0;

  const stats = [
    { label: "Sessions Reached", value: detail ? detail.userCount.toLocaleString() : "—", icon: Users },
    { label: "Signed-in Customers", value: detail ? signedIn.toLocaleString() : "—", icon: UserPlus },
    { label: "Total Actions Logged", value: detail ? detail.actions.length.toLocaleString() : "—", icon: Activity },
    { label: "Drop-off Rate", value: `${dropOffRate.toFixed(0)}%`, icon: TrendingDown },
  ];

  const usersBySession = new Map((detail?.users ?? []).map((user) => [user.sessionId, user]));

  return (
    <>
      <section>
        <h2 className="text-lg font-bold text-ink">{JOURNEY_STAGE_META[stage].title} Drill-down</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading && !detail
            ? Array.from({ length: 4 }).map((_, index) => (
                <article key={index} className="rounded-2xl bg-card p-5 sm:p-6">
                  <Skeleton className="size-5" />
                  <Skeleton className="mt-4 h-3 w-24" />
                  <Skeleton className="mt-2 h-8 w-16" />
                </article>
              ))
            : stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <article key={stat.label} className="rounded-2xl bg-card p-5 sm:p-6">
                    <Icon className="size-5 stroke-2 text-ink" />
                    <p className="mt-4 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-2xl font-black text-ink">{stat.value}</p>
                  </article>
                );
              })}
        </div>
      </section>

      <section className="rounded-2xl bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-ink">Customer Ledger</h2>
          <button
            type="button"
            className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-ink hover:underline"
          >
            <Filter className="size-3.5" /> Filter
          </button>
        </div>
        <div className="mt-5 overflow-x-auto">
          {error ? (
            <ApiErrorState message={error} onRetry={reload} />
          ) : !loading && detail && detail.actions.length === 0 ? (
            <ApiEmptyState message="No recorded activity for this step in the selected period." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
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
                  : (detail?.actions ?? []).map((action) => {
                      const profile = action.userId
                        ? [...usersBySession.values()].find((user) => user.userId === action.userId)?.profile
                        : undefined;
                      const name = profile?.fullName ?? "Anonymous session";
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
                            {action.summary ?? action.type.replace(/_/g, " ").toLowerCase()}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-ink">{formatDate(action.createdAt)}</TableCell>
                          <TableCell>
                            {profile ? (
                              <Link
                                href={`/admin/customers/${profile.id}`}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold whitespace-nowrap text-ink hover:-translate-y-0.5 hover:shadow-md active:scale-95"
                              >
                                View Profile <ExternalLink className="size-3.5" />
                              </Link>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>
          )}
        </div>
      </section>
    </>
  );
};

const AdminAnalyticsJourneyPage = () => {
  const [selectedStep, setSelectedStep] = useState(1);
  const [period, setPeriod] = useState<AnalyticsPeriodDays>(30);
  const range = periodToRange[period];

  const { data: journey, loading, error, reload } = useApi(() => analyticsApi.journey(range), [range]);
  const stages = journey?.stages ?? [];
  const activeIndex = Math.min(selectedStep, Math.max(stages.length - 1, 0));
  const activeStage = stages[activeIndex];

  return (
    <>
      <AdminPageHeader
        title="Journey Analytics"
        subtitle="Analyze customer flow and conversion through the journey funnel"
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
              <StepDrillDown stage={activeStage.stage} dropOffRate={activeStage.dropOffRate} period={range} />
            )}
          </>
        )}
      </div>
    </>
  );
};

export default AdminAnalyticsJourneyPage;
