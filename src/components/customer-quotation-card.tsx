"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import PDFViewer from "@/components/pdf-viewer";
import { toast } from "@/components/ui/toast";
import { ordersApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { QuotationStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const formatRWF = (value: number) => `RWF ${Math.round(value).toLocaleString("en-US")}`;

const statusTone: Record<QuotationStatus, string> = {
  AWAITING_REVIEW: "bg-amber-50 text-amber-700",
  QUOTATION_SENT: "bg-blue-50 text-blue-700",
  PAYMENT_SUBMITTED: "bg-violet-50 text-violet-700",
  PAYMENT_VERIFIED: "bg-green-50 text-green-700",
};

const statusLabels: Record<QuotationStatus, string> = {
  AWAITING_REVIEW: "Awaiting Review",
  QUOTATION_SENT: "Quotation Sent",
  PAYMENT_SUBMITTED: "Payment Submitted",
  PAYMENT_VERIFIED: "Payment Verified",
};

/**
 * Customer-facing quotation + payment card shown on an account order detail page.
 * There's no payment gateway wired in behind this system — the quotation PDF
 * itself carries the stock team's MoMo code and bank account, the customer
 * pays there directly, then tells us they've paid from right inside the
 * quotation dialog.
 *
 * The PDF is rendered with the custom `PDFViewer` (pdf.js → canvas) rather
 * than handed to the browser's native viewer, in either an iframe or a new
 * tab: the native viewer renders unreliably (blank/broken) inside a dialog on
 * mobile, and always ships its own download control that can't be removed —
 * the custom viewer has no download action to begin with. Opening the
 * document here is also the server call that unlocks "Done, I've paid".
 */
export const CustomerQuotationCard = ({
  orderId,
  subtotalValue,
  quotationStatus,
  transportFee,
  onUpdated,
}: {
  orderId: string;
  subtotalValue: number;
  quotationStatus: QuotationStatus;
  transportFee: number | null;
  /** Called after opening the quotation or confirming payment, so the parent can refetch the order. */
  onUpdated: () => void;
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pdfUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!dialogOpen) return;
    let cancelled = false;
    ordersApi
      .viewQuotationPdf(orderId)
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        pdfUrlRef.current = url;
        setPdfUrl(url);
        // No onUpdated() here: the parent page's useApi hook flips to its
        // full loading state on every reload() (see account/orders/[id]/page.tsx),
        // which would unmount this dialog mid-view. The server already
        // recorded the view; the parent's quotationViewedAt catches up next
        // time it actually reloads (e.g. after "Done, I've paid" below).
      })
      .catch((cause) => {
        if (cancelled) return;
        setPdfError(cause instanceof ApiError ? cause.message : "Couldn't open the quotation.");
      })
      .finally(() => {
        if (!cancelled) setLoadingPdf(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dialogOpen, orderId]);

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (open) {
      setLoadingPdf(true);
      setPdfError(null);
      setPdfUrl(null);
    } else {
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = null;
      setPdfUrl(null);
      setPdfError(null);
    }
  };

  const markPaymentDone = async () => {
    setSubmitting(true);
    try {
      await ordersApi.markPaymentSubmitted(orderId);
      handleDialogOpenChange(false);
      onUpdated();
      toast.success("Payment marked as completed", {
        description: "Our team will verify it and confirm your order shortly.",
      });
    } catch (cause) {
      toast.error("Couldn't record your payment", {
        description: cause instanceof ApiError ? cause.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-secondary">
            <FileText className="size-5 text-ink" />
          </span>
          <h2 className="text-lg font-bold text-ink sm:text-xl">Quotation</h2>
        </div>
        <span className={cn("shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase", statusTone[quotationStatus])}>
          {statusLabels[quotationStatus]}
        </span>
      </div>

      {quotationStatus === "AWAITING_REVIEW" ? (
        <p className="mt-4 flex items-start gap-2 text-sm text-muted">
          <Clock className="mt-0.5 size-4 shrink-0" />
          Our stock team is reviewing your order. Once ready, we&apos;ll send you a full quotation here, including transport fees and payment details.
        </p>
      ) : (
        <>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted">Items subtotal</dt>
              <dd className="font-data font-semibold text-ink">{formatRWF(subtotalValue)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Transport fee</dt>
              <dd className="font-data font-semibold text-ink">{formatRWF(transportFee ?? 0)}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-base">
              <dt className="font-bold text-ink">Total due</dt>
              <dd className="font-data font-bold text-ink">{formatRWF(subtotalValue + (transportFee ?? 0))}</dd>
            </div>
          </dl>

          {quotationStatus === "QUOTATION_SENT" && (
            <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger render={<Button type="button" variant="outline" className="mt-5 h-11 w-full gap-2 text-sm font-bold" />}>
                <FileText className="size-4" /> View quotation & pay
              </DialogTrigger>
              <DialogContent className="flex h-[calc(100dvh-1.5rem)] max-w-3xl flex-col sm:h-[85vh]" showClose>
                <DialogHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pr-8">
                  <div className="min-w-0">
                    <DialogTitle>Quotation</DialogTitle>
                    <DialogDescription className="truncate">
                      Total due {formatRWF(subtotalValue + (transportFee ?? 0))} — MoMo and bank details are on the document below.
                    </DialogDescription>
                  </div>
                  <Button
                    type="button"
                    onClick={() => void markPaymentDone()}
                    disabled={loadingPdf || !!pdfError || submitting}
                    className="h-10 shrink-0 gap-1.5 px-4 text-xs font-bold whitespace-nowrap disabled:opacity-60"
                  >
                    <CheckCircle2 className="size-4" /> {submitting ? "Marking…" : "Done, I've paid"}
                  </Button>
                </DialogHeader>

                <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-100 bg-[#F9FAFB]">
                  {loadingPdf ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted">Loading quotation…</div>
                  ) : pdfError ? (
                    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-red-600">{pdfError}</div>
                  ) : pdfUrl ? (
                    <PDFViewer src={pdfUrl} fileName={`quotation-${orderId}.pdf`} className="rounded-lg" />
                  ) : null}
                </div>
              </DialogContent>
            </Dialog>
          )}

          {quotationStatus === "PAYMENT_SUBMITTED" && (
            <p className="mt-5 flex items-center gap-2 rounded-lg bg-violet-50 px-4 py-3 text-sm font-medium text-violet-700">
              <Clock className="size-4 shrink-0" /> Payment submitted — pending verification by our team.
            </p>
          )}

          {quotationStatus === "PAYMENT_VERIFIED" && (
            <p className="mt-5 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
              <CheckCircle2 className="size-4 shrink-0" /> Payment verified — your order is confirmed.
            </p>
          )}
        </>
      )}
    </section>
  );
};
