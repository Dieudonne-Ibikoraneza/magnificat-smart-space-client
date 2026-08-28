"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Clock, CreditCard, FileText, Landmark, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  paymentInstructions,
  quotationStatusLabels,
  type OrderQuotation,
} from "@/data/order-workflow";
import { cn } from "@/lib/utils";

const formatRWF = (value: number) => `RWF ${Math.round(value).toLocaleString("en-US")}`;

const statusTone: Record<OrderQuotation["status"], string> = {
  awaiting_review: "bg-amber-50 text-amber-700",
  quotation_sent: "bg-blue-50 text-blue-700",
  payment_submitted: "bg-violet-50 text-violet-700",
  payment_verified: "bg-green-50 text-green-700",
};

/** Customer-facing quotation + payment card shown on an account order detail page. */
export const CustomerQuotationCard = ({
  orderId,
  subtotalValue,
  quotation: initialQuotation,
}: {
  orderId: string;
  subtotalValue: number;
  quotation: OrderQuotation;
}) => {
  const [quotation, setQuotation] = useState(initialQuotation);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const markPaymentDone = () => {
    setQuotation((current) => ({ ...current, status: "payment_submitted", paymentSubmittedAt: "Just now" }));
    setConfirmOpen(false);
    toast.success("Payment marked as completed", { description: "Our team will verify it and confirm your order shortly." });
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
        <span className={cn("shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase", statusTone[quotation.status])}>
          {quotationStatusLabels[quotation.status]}
        </span>
      </div>

      {quotation.status === "awaiting_review" ? (
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
              <dd className="font-data font-semibold text-ink">{formatRWF(quotation.transportFee ?? 0)}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-base">
              <dt className="font-bold text-ink">Total due</dt>
              <dd className="font-data font-bold text-ink">{formatRWF(subtotalValue + (quotation.transportFee ?? 0))}</dd>
            </div>
          </dl>

          {quotation.status === "quotation_sent" && (
            <>
              <div className="mt-5 space-y-2.5 rounded-xl border border-slate-100 bg-[#F9FAFB] p-4">
                <p className="text-[11px] font-bold tracking-wider text-muted uppercase">Payment details</p>
                <div className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm"><Smartphone className="size-4 text-ink" /></span>
                  <div className="text-sm">
                    <p className="font-semibold text-ink">MoMo Pay</p>
                    <p className="font-data text-ink">{paymentInstructions.momoCode}</p>
                    <p className="text-xs text-muted">{paymentInstructions.momoName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm"><Landmark className="size-4 text-ink" /></span>
                  <div className="text-sm">
                    <p className="font-semibold text-ink">Bank transfer</p>
                    <p className="text-ink">{paymentInstructions.bankName} — <span className="font-data">{paymentInstructions.bankAccountNumber}</span></p>
                    <p className="text-xs text-muted">{paymentInstructions.bankAccountName} · SWIFT {paymentInstructions.bankSwift}</p>
                  </div>
                </div>
              </div>

              <Button
                nativeButton={false}
                render={<Link href={`/account/orders/${orderId}/pay`} />}
                className="mt-4 h-11 w-full gap-2 text-sm font-bold"
              >
                <CreditCard className="size-4" /> Pay online with MoMo or card
              </Button>

              <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogTrigger render={<Button type="button" variant="outline" className="mt-2.5 h-11 w-full gap-2 text-sm font-bold" />}>
                  <CheckCircle2 className="size-4" /> I&apos;ve already paid by MoMo code or transfer
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Confirm your payment</DialogTitle>
                    <DialogDescription>
                      Let us know you&apos;ve sent {formatRWF(subtotalValue + (quotation.transportFee ?? 0))} for order #{orderId}. Our team will verify it and confirm your order.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)} className="h-10 px-5 text-sm font-bold">
                      Not yet
                    </Button>
                    <Button type="button" onClick={markPaymentDone} className="h-10 px-5 text-sm font-bold">
                      Yes, I&apos;ve paid
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}

          {quotation.status === "payment_submitted" && (
            <p className="mt-5 flex items-center gap-2 rounded-lg bg-violet-50 px-4 py-3 text-sm font-medium text-violet-700">
              <Clock className="size-4 shrink-0" /> Payment submitted — pending verification by our team.
            </p>
          )}

          {quotation.status === "payment_verified" && (
            <p className="mt-5 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
              <CheckCircle2 className="size-4 shrink-0" /> Payment verified — your order is confirmed.
            </p>
          )}
        </>
      )}
    </section>
  );
};
