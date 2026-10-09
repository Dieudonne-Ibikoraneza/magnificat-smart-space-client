"use client";

import { useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  Download,
  LoaderCircle,
  Printer,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StockExportTilePicker } from "@/components/stock-export-tile-picker";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { StockExportTarget } from "@/lib/stock-export-filters";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { PrintDocument } from "@/components/print-document";
import { StockReportDocument } from "@/components/stock-report-document";
import { reportsApi, ApiError } from "@/lib/api";
import type { AnalyticsPeriod, StockMovementType } from "@/lib/api/types";
import { useApi } from "@/lib/api/use-api";
import {
  stockReportDocument,
  stockMovementDocument,
  stockDocumentCsv,
  type StockExportDocument,
} from "@/lib/stock-report-export";

type Scope = "report" | "movements";
type Mode = "print" | "csv";
const windows = ["WEEKLY", "MONTHLY", "YEARLY", "CUSTOM"] as const;
const types = ["ALL", "INBOUND", "OUTBOUND", "ADJUSTMENT"] as const;
const windowKeys = {
  WEEKLY: "last7",
  MONTHLY: "last30",
  YEARLY: "last12",
  CUSTOM: "customDates",
};
const typeKeys = {
  ALL: "filterAll",
  INBOUND: "filterInbound",
  OUTBOUND: "filterOutbound",
  ADJUSTMENT: "filterAdjustment",
};

/** Same controls for every report viewer; data is fetched through the existing report role guard. */
export function StockReportOutputActions({
  period,
  movementType,
}: {
  period: AnalyticsPeriod;
  movementType: StockMovementType | "ALL";
}) {
  const { t } = useTranslation();
  const id = useId();
  const mounted = useRef(false);
  const running = useRef(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [target, setTarget] = useState<StockExportTarget>({ kind: "all" });
  const [scope, setScope] = useState<Scope>("report");
  const [windowOverride, setWindowOverride] = useState<
    AnalyticsPeriod | "CUSTOM" | null
  >(null);
  const [typeOverride, setTypeOverride] = useState<
    StockMovementType | "ALL" | null
  >(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const selectedWindow = windowOverride ?? period;
  const selectedType = typeOverride ?? movementType;
  const datesValid =
    selectedWindow !== "CUSTOM" ||
    (!!startDate && !!endDate && startDate <= endDate);
  const reset = () => {
    setTarget({ kind: "all" });
    setScope("report");
    setWindowOverride(null);
    setTypeOverride(null);
    setStartDate("");
    setEndDate("");
  };
  const {
    data: options,
    loading: tilesLoading,
    error: tilesError,
    reload: reloadTiles,
  } = useApi(async () => {
    const [tiles, collections] = await Promise.all([
      reportsApi.stockExportTiles(),
      reportsApi.stockExportCollections(),
    ]);
    return { tiles, collections };
  });
  const [printReport, setPrintReport] = useState<StockExportDocument | null>(
    null,
  );

  useEffect(() => {
    mounted.current = true;
    const clearPrint = () => setPrintReport(null);
    window.addEventListener("afterprint", clearPrint);
    return () => {
      mounted.current = false;
      window.removeEventListener("afterprint", clearPrint);
    };
  }, []);

  const output = async (scope: Scope, mode: Mode) => {
    if (running.current || !datesValid) return;
    running.current = true;
    setBusy(`${scope}-${mode}`);
    // Capture the active filter once. The returned dates and labels describe
    // this request even if the viewer changes filters while it is preparing.
    const query = {
      period: selectedWindow === "CUSTOM" ? undefined : selectedWindow,
      startDate: selectedWindow === "CUSTOM" ? startDate : undefined,
      endDate: selectedWindow === "CUSTOM" ? endDate : undefined,
      type:
        scope === "movements" && selectedType !== "ALL"
          ? selectedType
          : undefined,
      productId: target.kind === "tile" ? target.id : undefined,
      collectionId: target.kind === "collection" ? target.id : undefined,
    };
    try {
      const report =
        scope === "report"
          ? stockReportDocument(await reportsApi.exportStockReport(query), t)
          : stockMovementDocument(
              await reportsApi.exportStockMovements(query),
              t,
            );
      if (!mounted.current) return;
      if (mode === "print") {
        flushSync(() => setPrintReport(report));
        if (document.getElementById(id)) window.print();
      } else {
        const blob = new Blob([stockDocumentCsv(report, t)], {
          type: "text/csv;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = report.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (cause) {
      if (mounted.current)
        toast.error(t("stock.reports.output.failed"), {
          description:
            cause instanceof ApiError
              ? cause.message
              : t("stock.reports.output.tryAgain"),
        });
    } finally {
      running.current = false;
      if (mounted.current) setBusy(null);
    }
  };

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-[#edf0eb] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-ink">
              <SlidersHorizontal className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink">
                {t("stock.reports.output.customize")}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                {t("stock.reports.output.builderHint")}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            disabled={busy !== null}
            onClick={reset}
            className="h-9 gap-2 px-3 text-xs font-semibold text-muted"
          >
            <RotateCcw className="size-3.5" />
            {t("stock.reports.output.reset")}
          </Button>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid items-start gap-4 md:grid-cols-4">
            <Field className="min-w-0 md:col-span-2">
              <FieldLabel
                htmlFor={`${id}-tile`}
                className="text-xs font-semibold text-muted"
              >
                {t("stock.reports.output.exportScope")}
              </FieldLabel>
              <StockExportTilePicker
                id={`${id}-tile`}
                tiles={options?.tiles ?? []}
                collections={options?.collections ?? []}
                value={target}
                onChange={setTarget}
                disabled={busy !== null || tilesLoading || !!tilesError}
              />
              {tilesError ? (
                <div
                  role="alert"
                  className="flex items-center gap-2 text-xs text-red-600"
                >
                  <span>{t("stock.reports.output.tilesFailed")}</span>
                  <button
                    type="button"
                    onClick={reloadTiles}
                    className="font-semibold underline"
                  >
                    {t("common.retry")}
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-muted">
                  {t(
                    `stock.reports.output.${tilesLoading ? "loadingTiles" : "searchHint"}`,
                  )}
                </p>
              )}
            </Field>
            <Field className={scope === "report" ? "md:col-span-2" : undefined}>
              <FieldLabel
                htmlFor={`${id}-period`}
                className="text-xs font-semibold text-muted"
              >
                {t("stock.reports.output.dateWindow")}
              </FieldLabel>
              <Select
                value={selectedWindow}
                onValueChange={(value) =>
                  setWindowOverride(value as AnalyticsPeriod | "CUSTOM")
                }
                disabled={busy !== null}
              >
                <SelectTrigger
                  id={`${id}-period`}
                  className="h-12 rounded-lg bg-white text-sm"
                >
                  <SelectValue>
                    {(value: typeof selectedWindow) =>
                      t(`stock.reports.output.${windowKeys[value]}`)
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {windows.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`stock.reports.output.${windowKeys[value]}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {scope === "movements" && (
              <Field>
                <FieldLabel
                  htmlFor={`${id}-type`}
                  className="text-xs font-semibold text-muted"
                >
                  {t("stock.reports.output.movementType")}
                </FieldLabel>
                <Select
                  value={selectedType}
                  onValueChange={(value) =>
                    setTypeOverride(value as typeof selectedType)
                  }
                  disabled={busy !== null}
                >
                  <SelectTrigger
                    id={`${id}-type`}
                    className="h-12 rounded-lg bg-white text-sm"
                  >
                    <SelectValue>
                      {(value: typeof selectedType) =>
                        t(`stock.reports.${typeKeys[value]}`)
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((value) => (
                      <SelectItem key={value} value={value}>
                        {t(`stock.reports.${typeKeys[value]}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>
          {selectedWindow === "CUSTOM" && (
            <div className="rounded-xl border border-border bg-secondary/30 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor={`${id}-from`}
                    className="text-xs font-semibold"
                  >
                    {t("stock.reports.output.startDate")}
                  </FieldLabel>
                  <Input
                    id={`${id}-from`}
                    type="date"
                    value={startDate}
                    max={endDate || undefined}
                    onChange={(event) => setStartDate(event.target.value)}
                    disabled={busy !== null}
                    className="h-11 bg-white text-sm"
                  />
                </Field>
                <Field>
                  <FieldLabel
                    htmlFor={`${id}-to`}
                    className="text-xs font-semibold"
                  >
                    {t("stock.reports.output.endDate")}
                  </FieldLabel>
                  <Input
                    id={`${id}-to`}
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(event) => setEndDate(event.target.value)}
                    disabled={busy !== null}
                    className="h-11 bg-white text-sm"
                  />
                </Field>
              </div>
              <p
                className={cn(
                  "mt-2 text-xs",
                  datesValid ? "text-muted" : "text-red-600",
                )}
                role={datesValid ? undefined : "status"}
              >
                {t(
                  `stock.reports.output.${datesValid ? "dateHint" : "dateError"}`,
                )}
              </p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 bg-secondary/20 px-5 py-4">
          <div>
            <div
              className="inline-flex gap-1 rounded-lg border border-border bg-white p-1"
              aria-label={t("stock.reports.output.contents")}
            >
              {(["report", "movements"] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="ghost"
                  aria-pressed={scope === value}
                  disabled={busy !== null}
                  onClick={() => setScope(value)}
                  className={cn(
                    "h-9 rounded-md px-3 text-xs font-semibold",
                    scope === value
                      ? "bg-ink text-white hover:bg-ink hover:text-white"
                      : "text-muted",
                  )}
                >
                  {t(
                    `stock.reports.output.${value === "report" ? "fullReport" : "movementJournal"}`,
                  )}
                </Button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted">
              {t("stock.reports.output.stockIncluded")}
            </p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            {(["print", "csv"] as const).map((mode) => {
              const preparing = busy === `${scope}-${mode}`;
              const Icon = preparing
                ? LoaderCircle
                : mode === "print"
                  ? Printer
                  : Download;
              return (
                <Button
                  key={mode}
                  type="button"
                  variant={mode === "csv" ? "default" : "outline"}
                  disabled={busy !== null || !datesValid}
                  onClick={() => void output(scope, mode)}
                  className="h-11 flex-1 gap-2 rounded-lg px-4 text-sm font-semibold sm:flex-none"
                >
                  <Icon
                    className={cn("size-4", preparing && "animate-spin")}
                    aria-hidden="true"
                  />
                  {t(
                    `stock.reports.output.${preparing ? "preparing" : mode === "print" ? "print" : "exportCsv"}`,
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      </section>
      {printReport && (
        <PrintDocument id={id}>
          <style media="print">{"@page { size: A4 landscape; }"}</style>
          <StockReportDocument
            report={printReport}
            emptyLabel={t("stock.reports.output.empty")}
          />
        </PrintDocument>
      )}
    </>
  );
}
