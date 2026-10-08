"use client";

import { useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useTranslation } from "react-i18next";
import { Download, LoaderCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { PrintDocument } from "@/components/print-document";
import { StockReportDocument } from "@/components/stock-report-document";
import { reportsApi, ApiError } from "@/lib/api";
import type { AnalyticsPeriod, StockMovementType } from "@/lib/api/types";
import {
  stockReportDocument,
  stockMovementDocument,
  stockDocumentCsv,
  type StockExportDocument,
} from "@/lib/stock-report-export";

type Scope = "report" | "movements";
type Mode = "print" | "csv";
const actions: { scope: Scope; mode: Mode; label: string }[] = [
  { scope: "report", mode: "print", label: "printReport" },
  { scope: "report", mode: "csv", label: "exportReport" },
  { scope: "movements", mode: "print", label: "printMovements" },
  { scope: "movements", mode: "csv", label: "exportMovements" },
];

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
    if (running.current) return;
    running.current = true;
    setBusy(`${scope}-${mode}`);
    // Capture the active filter once. The returned dates and labels describe
    // this request even if the viewer changes filters while it is preparing.
    const query = {
      period,
      type: movementType === "ALL" ? undefined : movementType,
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
      <div className="rounded-xl border border-[#edf0eb] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {actions.map(({ scope, mode, label }) => {
            const action = `${scope}-${mode}`;
            const Icon =
              busy === action
                ? LoaderCircle
                : mode === "print"
                  ? Printer
                  : Download;
            return (
              <Button
                key={action}
                type="button"
                variant="outline"
                size="sm"
                disabled={busy !== null}
                onClick={() => void output(scope, mode)}
                className="h-10 gap-2 px-3 text-xs font-semibold"
              >
                <Icon
                  className={busy === action ? "size-4 animate-spin" : "size-4"}
                  aria-hidden="true"
                />
                {t(
                  `stock.reports.output.${busy === action ? "preparing" : label}`,
                )}
              </Button>
            );
          })}
        </div>
        <p className="mt-2 text-xs leading-5 text-muted">
          {t("stock.reports.output.completeMovements")}
        </p>
      </div>
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
