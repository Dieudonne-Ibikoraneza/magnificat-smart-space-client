"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CircleCheck,
  CircleSlash,
  ImageIcon,
  LoaderCircle,
  PackageSearch,
  Search,
} from "lucide-react";
import { ApiErrorState, ApiLoading } from "@/components/api-state";
import { ListPagination } from "@/components/list-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { chatbotApi, ApiError, type ApiRecommendationTile } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";

const filters = ["all", "excluded", "eligible"] as const;
const PAGE_SIZE = 10;
const key = "admin.knowledgeBase.exclusions";

export function RecommendationExclusions() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");
  const [eligibility, setEligibility] = useState<(typeof filters)[number]>("all");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmingTile, setConfirmingTile] = useState<ApiRecommendationTile | null>(null);
  const term = useDebouncedValue(search.trim());
  const { data, loading, refreshing, error, reload } = useApi(
    () =>
      chatbotApi.recommendationTiles({
        search: term,
        eligibility,
        page,
        limit: PAGE_SIZE,
      }),
    [term, eligibility, page],
  );
  const isRw = i18n.language.startsWith("rw");
  const emptyKind = term
    ? "noResults"
    : eligibility === "excluded"
      ? "noExcluded"
      : eligibility === "eligible"
        ? "noAllowed"
        : "noTiles";

  const resetFilters = () => {
    setSearch("");
    setEligibility("all");
    setPage(1);
  };

  const status = (tile: ApiRecommendationTile) => (
    <div
      className="space-y-1.5"
      title={!tile.isActive ? t(`${key}.inactiveDescription`) : undefined}
    >
      <Badge
        variant={tile.recommendationExcluded ? "muted" : tile.isActive ? "primary" : "outline"}
        className="w-fit"
      >
        {t(
          `${key}.${tile.recommendationExcluded ? "excluded" : tile.isActive ? "eligible" : "inactive"}`,
        )}
      </Badge>
      {!tile.isActive && (
        <p className="max-w-32 text-[11px] leading-4 text-muted-foreground">
          {t(`${key}.inactiveHelp`)}
        </p>
      )}
    </div>
  );

  const toggle = async (tile: ApiRecommendationTile) => {
    setBusyId(tile.id);
    try {
      await chatbotApi.setRecommendationExclusion(tile.id, !tile.recommendationExcluded);
      toast.success(t(`${key}.${tile.recommendationExcluded ? "restored" : "excludedSaved"}`));
      if (eligibility !== "all" && data?.items.length === 1 && page > 1) setPage(page - 1);
      reload();
      return true;
    } catch (cause) {
      toast.error(t(`${key}.saveFailed`), {
        description:
          cause instanceof ApiError ? cause.message : t("admin.systemSettings.toastTryAgain"),
      });
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const productIdentity = (tile: ApiRecommendationTile, mobile = false) => (
    <Link
      href={`/admin/inventory/${tile.id}`}
      className="flex items-center gap-3 text-ink hover:underline"
    >
      {tile.image ? (
        <Image
          src={tile.image}
          alt=""
          width={mobile ? 48 : 64}
          height={mobile ? 48 : 64}
          unoptimized
          className={cn("shrink-0 rounded-sm object-cover", mobile ? "size-12" : "size-16")}
        />
      ) : (
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-sm bg-secondary",
            mobile ? "size-12" : "size-16",
          )}
        >
          <ImageIcon aria-hidden="true" className="size-5 text-muted-foreground" />
        </span>
      )}
      <span className="min-w-0">
        <span className="block font-medium uppercase">{(isRw && tile.nameRw) || tile.name}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{tile.sku}</span>
      </span>
    </Link>
  );

  const exclusionAction = (tile: ApiRecommendationTile) => (
    <span
      className="inline-flex"
      title={!tile.isActive ? t(`${key}.inactiveDescription`) : undefined}
    >
      <Button
        type="button"
        variant="outline"
        disabled={busyId !== null || refreshing || !tile.isActive}
        onClick={() => (tile.recommendationExcluded ? void toggle(tile) : setConfirmingTile(tile))}
        aria-label={t(`${key}.${tile.recommendationExcluded ? "restoreAria" : "excludeAria"}`, {
          name: (isRw && tile.nameRw) || tile.name,
        })}
        className={cn(
          "h-9 gap-2 px-3 text-xs font-bold focus-visible:ring-2 focus-visible:ring-offset-2",
          tile.recommendationExcluded
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800 focus-visible:ring-emerald-500"
            : "border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100 hover:text-red-800 focus-visible:ring-red-500",
        )}
      >
        {busyId === tile.id ? (
          <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
        ) : tile.recommendationExcluded ? (
          <CircleCheck aria-hidden="true" className="size-3.5" />
        ) : (
          <CircleSlash aria-hidden="true" className="size-3.5" />
        )}
        {t(
          `${key}.${busyId === tile.id ? "saving" : tile.recommendationExcluded ? "restore" : "exclude"}`,
        )}
      </Button>
    </span>
  );

  return (
    <section className="mt-6" aria-label={t(`${key}.title`)}>
      <p className="text-sm leading-6 text-muted-foreground">{t(`${key}.description`)}</p>
      <div className="my-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search
            aria-hidden="true"
            className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={t(`${key}.search`)}
            aria-label={t(`${key}.search`)}
            maxLength={200}
            className="h-10 bg-white pl-10 text-sm"
          />
        </div>
        <div className="flex w-fit shrink-0 gap-1 rounded-lg bg-muted-background p-1">
          {filters.map((filter) => (
            <Button
              key={filter}
              type="button"
              variant="ghost"
              aria-pressed={eligibility === filter}
              onClick={() => {
                setEligibility(filter);
                setPage(1);
              }}
              className={cn(
                "h-8 rounded-md px-3 text-xs font-semibold",
                eligibility === filter
                  ? "bg-white text-ink shadow-sm hover:bg-white"
                  : "text-muted-foreground",
              )}
            >
              {t(`${key}.${filter}`)}
            </Button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-card">
        {loading ? (
          <ApiLoading label={t(`${key}.loading`)} className="py-12" />
        ) : error ? (
          <ApiErrorState message={error} onRetry={reload} className="p-6" />
        ) : data?.items.length === 0 ? (
          <div
            className="flex flex-col items-center px-6 py-12 text-center"
            role="status"
            aria-live="polite"
          >
            <span
              className={cn(
                "mb-4 flex size-12 items-center justify-center rounded-2xl border",
                emptyKind === "noExcluded"
                  ? "border-emerald-100 bg-emerald-50 text-emerald-600"
                  : "border-border bg-muted-background/60 text-muted-foreground",
              )}
            >
              {emptyKind === "noExcluded" ? (
                <CircleCheck aria-hidden="true" className="size-6" />
              ) : (
                <PackageSearch aria-hidden="true" className="size-6" />
              )}
            </span>
            <h2 className="text-base font-semibold text-ink">{t(`${key}.${emptyKind}Title`)}</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              {t(`${key}.${emptyKind}Description`, { search: term })}
            </p>
            {emptyKind !== "noTiles" && (
              <Button
                type="button"
                variant="outline"
                onClick={resetFilters}
                className="mt-5 h-9 gap-2 rounded-lg px-4 text-xs font-semibold"
              >
                {emptyKind === "noResults" ? t(`${key}.clearFilters`) : t(`${key}.browseAll`)}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 px-5 py-5 sm:px-6">
              <h2 className="text-lg font-bold text-ink sm:text-2xl">{t(`${key}.tilesLabel`)}</h2>
              <Badge variant="secondary">
                {t(`${key}.tilesCount`, { count: data?.meta.total ?? 0 })}
              </Badge>
            </div>

            <div className="md:hidden" aria-busy={refreshing}>
              <ul className="divide-y divide-[#E8E8E8]">
                {data?.items.map((tile) => (
                  <li key={tile.id} className="px-5 py-4 font-data">
                    {productIdentity(tile, true)}
                    <div className="mt-2 text-xs text-muted-foreground">
                      <p>{(isRw && tile.collection.titleRw) || tile.collection.title}</p>
                      <p className="mt-1">
                        {t(`${key}.sizeLabel`)}: {tile.collection.size}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      {status(tile)}
                      {exclusionAction(tile)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="hidden md:block">
              <Table aria-label={t(`${key}.title`)} aria-busy={refreshing}>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">{t(`${key}.tileColumn`)}</TableHead>
                    <TableHead scope="col">{t(`${key}.collectionColumn`)}</TableHead>
                    <TableHead scope="col">{t(`${key}.statusColumn`)}</TableHead>
                    <TableHead scope="col" className="text-right">
                      {t(`${key}.actionColumn`)}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.items.map((tile) => (
                    <TableRow key={tile.id}>
                      <TableCell className="font-medium text-ink">
                        {productIdentity(tile)}
                      </TableCell>
                      <TableCell className="text-ink">
                        <span className="block">
                          {(isRw && tile.collection.titleRw) || tile.collection.title}
                        </span>
                        <span className="mt-1 block whitespace-nowrap text-xs text-muted-foreground">
                          {t(`${key}.sizeLabel`)}: {tile.collection.size}
                        </span>
                      </TableCell>
                      <TableCell>{status(tile)}</TableCell>
                      <TableCell className="text-right">{exclusionAction(tile)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {data && data.meta.totalPages > 1 && (
              <div className="px-5 pb-5 sm:px-6">
                <ListPagination
                  page={page}
                  totalPages={data.meta.totalPages}
                  totalItems={data.meta.total}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>
      <Dialog
        open={confirmingTile !== null}
        onOpenChange={(open) => {
          if (!open && busyId === null) setConfirmingTile(null);
        }}
      >
        <DialogContent className="max-w-sm" showClose={busyId === null}>
          <DialogHeader>
            <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-red-50 text-red-600">
              <CircleSlash aria-hidden="true" className="size-5" />
            </span>
            <DialogTitle>{t(`${key}.confirmExcludeTitle`)}</DialogTitle>
            <DialogDescription className="leading-6">
              {t(`${key}.confirmExcludeDescription`)}
            </DialogDescription>
          </DialogHeader>
          {confirmingTile && (
            <div className="mt-5 flex items-center gap-3 rounded-lg border border-border bg-muted-background/40 p-3">
              {confirmingTile.image && (
                <Image
                  src={confirmingTile.image}
                  alt=""
                  width={48}
                  height={48}
                  unoptimized
                  className="size-12 shrink-0 rounded-sm object-cover"
                />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {(isRw && confirmingTile.nameRw) || confirmingTile.name}
                </p>
                <p className="mt-1 font-data text-xs text-muted-foreground">{confirmingTile.sku}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busyId !== null}
              onClick={() => setConfirmingTile(null)}
              className="h-10 px-5 text-sm font-bold"
            >
              {t("dash.confirm.cancel")}
            </Button>
            <Button
              type="button"
              disabled={busyId !== null || refreshing || !confirmingTile}
              onClick={async () => {
                if (confirmingTile && (await toggle(confirmingTile))) setConfirmingTile(null);
              }}
              className="h-10 gap-2 bg-red-600 px-5 text-sm font-bold text-white hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              {busyId !== null && (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              )}
              {t(`${key}.${busyId !== null ? "saving" : "confirmExclude"}`)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
