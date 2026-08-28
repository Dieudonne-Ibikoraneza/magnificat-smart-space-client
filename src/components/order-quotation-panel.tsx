"use client";

import { useState } from "react";
import { CircleDollarSign, MapPin, ShieldCheck, Truck } from "lucide-react";
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
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import {
  quotationStatusLabels,
  type DeliveryDetails,
  type OrderQuotation,
} from "@/data/order-workflow";
import { cn } from "@/lib/utils";

const formatRWF = (value: number) => `RWF ${Math.round(value).toLocaleString("en-US")}`;

const quotationStatusTone: Record<OrderQuotation["status"], string> = {
  awaiting_review: "bg-amber-50 text-amber-700",
  quotation_sent: "bg-blue-50 text-blue-700",
  payment_submitted: "bg-violet-50 text-violet-700",
  payment_verified: "bg-green-50 text-green-700",
};

/**
 * Stock-manager-facing quotation workflow: review delivery details the customer
 * submitted, set a transport fee (0 allowed) to formalize + "send" the quotation,
 * then verify payment once the customer marks it as paid. `canManage` gates the
 * action controls — sales sees the same panel read-only, stock/admin can act on it.
 */
export const OrderQuotationPanel = ({
  orderId,
  subtotalValue,
  deliveryDetails,
  quotation: initialQuotation,
  canManage,
}: {
  orderId: string;
  subtotalValue: number;
  deliveryDetails?: DeliveryDetails;
  quotation: OrderQuotation;
  canManage: boolean;
}) => {
  const [quotation, setQuotation] = useState(initialQuotation);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transportFee, setTransportFee] = useState(quotation.transportFee?.toString() ?? "0");
  const [transportNote, setTransportNote] = useState(quotation.transportFeeNote ?? "");

  const feeValue = Number(transportFee);
  const feeValid = transportFee.trim() !== "" && Number.isFinite(feeValue) && feeValue >= 0;
  const grandTotal = subtotalValue + (quotation.transportFee ?? 0);

  const handleSendQuotation = () => {
    if (!feeValid) return;
    setQuotation((current) => ({
      ...current,
      status: "quotation_sent",
      transportFee: feeValue,
      transportFeeNote: transportNote.trim() || undefined,
      sentAt: "Just now",
    }));
    setDialogOpen(false);
    toast.success("Quotation sent to customer", {
      description: `Transport fee: ${formatRWF(feeValue)} · Total: ${formatRWF(subtotalValue + feeValue)}`,
    });
  };

  const handleVerifyPayment = () => {
    setQuotation((current) => ({ ...current, status: "payment_verified", verifiedAt: "Just now" }));
    toast.success("Payment verified", { description: `Order ${orderId} can now move to processing.` });
  };

  return (
    <section className="rounded-2xl bg-card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-ink">
            <CircleDollarSign className="size-5" />
          </span>
          <h2 className="text-lg font-bold text-ink sm:text-xl">Quotation</h2>
        </div>
        <span className={cn("shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase", quotationStatusTone[quotation.status])}>
          {quotationStatusLabels[quotation.status]}
        </span>
      </div>

      <div className="mt-5 rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
          <MapPin className="size-3.5" /> Delivery details
        </div>
        {deliveryDetails ? (
          <div className="mt-2 space-y-1 text-sm">
            <p className="font-semibold text-ink">{deliveryDetails.contactName} · {deliveryDetails.phone}</p>
            <p className="text-muted-foreground">{deliveryDetails.address}, {deliveryDetails.city}</p>
            {deliveryDetails.preferredDate && <p className="text-muted-foreground">Preferred: {deliveryDetails.preferredDate}</p>}
            {deliveryDetails.notes && <p className="text-muted-foreground">Note: {deliveryDetails.notes}</p>}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Awaiting delivery details from the customer.</p>
        )}
      </div>

      <dl className="mt-5 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Items subtotal</dt>
          <dd className="font-data font-semibold text-ink">{formatRWF(subtotalValue)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Transport fee</dt>
          <dd className="font-data font-semibold text-ink">
            {quotation.transportFee !== undefined ? formatRWF(quotation.transportFee) : "Not set yet"}
          </dd>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-2 text-base">
          <dt className="font-bold text-ink">Total</dt>
          <dd className="font-data font-bold text-ink">{formatRWF(grandTotal)}</dd>
        </div>
      </dl>

      {canManage ? (
        <div className="mt-5 space-y-2.5">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger
              render={
                <Button
                  type="button"
                  variant={quotation.status === "awaiting_review" ? "default" : "outline"}
                  className="h-11 w-full gap-2 text-sm font-bold"
                />
              }
            >
              <Truck className="size-4" />
              {quotation.status === "awaiting_review" ? "Add transport fee & send quotation" : "Edit transport fee"}
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Transport fee</DialogTitle>
                <DialogDescription>
                  Based on quantity and delivery distance discussed with the customer. Enter 0 for free transport.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-5 space-y-4">
                <Field>
                  <FieldLabel htmlFor="transport-fee">Transport fee (RWF)</FieldLabel>
                  <Input
                    id="transport-fee"
                    type="number"
                    min={0}
                    value={transportFee}
                    onChange={(event) => setTransportFee(event.target.value)}
                    placeholder="0"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="transport-note">Note (optional)</FieldLabel>
                  <Textarea
                    id="transport-note"
                    rows={2}
                    value={transportNote}
                    onChange={(event) => setTransportNote(event.target.value)}
                    placeholder="e.g. 2 truckloads, Kigali city delivery"
                  />
                </Field>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="h-10 px-5 text-sm font-bold">
                  Cancel
                </Button>
                <Button type="button" disabled={!feeValid} onClick={handleSendQuotation} className="h-10 px-5 text-sm font-bold disabled:opacity-60">
                  Send quotation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {quotation.status === "payment_submitted" && (
            <Button type="button" onClick={handleVerifyPayment} className="h-11 w-full gap-2 text-sm font-bold">
              <ShieldCheck className="size-4" /> Verify payment
            </Button>
          )}

          {quotation.status === "payment_verified" && (
            <p className="flex items-center justify-center gap-2 rounded-lg bg-green-50 py-2.5 text-sm font-semibold text-green-700">
              <ShieldCheck className="size-4" /> Payment verified
            </p>
          )}
        </div>
      ) : (
        <p className="mt-5 text-xs text-muted-foreground">
          The stock team manages the transport fee and payment verification for this order.
        </p>
      )}
    </section>
  );
};
