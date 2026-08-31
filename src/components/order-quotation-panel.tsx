"use client";

import { useState } from "react";
import { CircleDollarSign, MapPin, Pencil, ShieldCheck, Truck } from "lucide-react";
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
import { DeliveryDetailsDialog } from "@/components/delivery-details-dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ordersApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { ApiOrderDelivery, QuotationStatus } from "@/lib/api/types";
import type { DeliveryDetails } from "@/data/order-workflow";
import { cn } from "@/lib/utils";

const formatRWF = (value: number) => `RWF ${Math.round(value).toLocaleString("en-US")}`;

const quotationStatusTone: Record<QuotationStatus, string> = {
  AWAITING_REVIEW: "bg-amber-50 text-amber-700",
  QUOTATION_SENT: "bg-blue-50 text-blue-700",
  PAYMENT_SUBMITTED: "bg-violet-50 text-violet-700",
  PAYMENT_VERIFIED: "bg-green-50 text-green-700",
};

const quotationStatusLabels: Record<QuotationStatus, string> = {
  AWAITING_REVIEW: "Awaiting Review",
  QUOTATION_SENT: "Quotation Sent",
  PAYMENT_SUBMITTED: "Payment Submitted",
  PAYMENT_VERIFIED: "Payment Verified",
};

/**
 * Stock-manager-facing quotation workflow: review delivery details the customer
 * submitted, set a transport fee (0 allowed) to formalize + send the quotation,
 * then verify payment once the customer marks it as paid. `canManage` gates the
 * action controls — sales sees the same panel read-only, stock/admin can act on it.
 */
const toDeliveryDetails = (delivery: ApiOrderDelivery): DeliveryDetails => ({
  contactName: delivery.contactName,
  phone: delivery.phone,
  address: delivery.address,
  city: delivery.city,
  preferredDate: delivery.preferredDate ?? undefined,
  notes: delivery.notes ?? undefined,
});

export const OrderQuotationPanel = ({
  orderId,
  subtotalValue,
  deliveryDetails,
  customerName,
  customerPhone,
  quotationStatus,
  transportFee,
  transportFeeNote,
  canManage,
  onUpdated,
}: {
  orderId: string;
  subtotalValue: number;
  deliveryDetails?: ApiOrderDelivery | null;
  /** Pre-fills a fresh delivery-details form when staff add it on the customer's behalf. */
  customerName?: string;
  customerPhone?: string | null;
  quotationStatus: QuotationStatus;
  transportFee: number | null;
  transportFeeNote?: string | null;
  canManage: boolean;
  /** Called after a successful action so the parent can refetch the order. */
  onUpdated: () => void;
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transportFeeInput, setTransportFeeInput] = useState(transportFee?.toString() ?? "0");
  const [transportNote, setTransportNote] = useState(transportFeeNote ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [savingDelivery, setSavingDelivery] = useState(false);

  const feeValue = Number(transportFeeInput);
  const feeValid = transportFeeInput.trim() !== "" && Number.isFinite(feeValue) && feeValue >= 0;
  const grandTotal = subtotalValue + (transportFee ?? 0);

  // The server enforces this same rule (`orders.service.ts`) — delivery
  // details are locked the moment a quotation goes out, since the transport
  // fee was costed against exactly this address.
  const deliveryEditable = quotationStatus === "AWAITING_REVIEW";

  const handleSaveDelivery = async (values: DeliveryDetails) => {
    setSavingDelivery(true);
    try {
      await ordersApi.saveDeliveryDetails(orderId, {
        contactName: values.contactName,
        phone: values.phone,
        address: values.address,
        city: values.city,
        preferredDate: values.preferredDate || undefined,
        notes: values.notes || undefined,
      });
      onUpdated();
    } catch (cause) {
      toast.error("Couldn't save delivery details", {
        description: cause instanceof ApiError ? cause.message : "Please try again.",
      });
    } finally {
      setSavingDelivery(false);
    }
  };

  const handleSendQuotation = async () => {
    if (!feeValid) return;
    setSubmitting(true);
    try {
      await ordersApi.sendQuotation(orderId, feeValue, transportNote.trim() || undefined);
      setDialogOpen(false);
      onUpdated();
      toast.success("Quotation sent to customer", {
        description: `Transport fee: ${formatRWF(feeValue)} · Total: ${formatRWF(subtotalValue + feeValue)}`,
      });
    } catch (cause) {
      toast.error("Couldn't send quotation", {
        description: cause instanceof ApiError ? cause.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyPayment = async () => {
    setSubmitting(true);
    try {
      await ordersApi.verifyPayment(orderId);
      onUpdated();
      toast.success("Payment verified", { description: `This order can now move to processing.` });
    } catch (cause) {
      toast.error("Couldn't verify payment", {
        description: cause instanceof ApiError ? cause.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
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
        <span className={cn("shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase", quotationStatusTone[quotationStatus])}>
          {quotationStatusLabels[quotationStatus]}
        </span>
      </div>

      <div className="mt-5 rounded-xl border border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            <MapPin className="size-3.5" /> Delivery details
          </div>
          {deliveryEditable ? (
            <DeliveryDetailsDialog
              initialValue={
                deliveryDetails
                  ? toDeliveryDetails(deliveryDetails)
                  : { contactName: customerName ?? "", phone: customerPhone ?? "", address: "", city: "", preferredDate: "", notes: "" }
              }
              onSubmit={(values) => void handleSaveDelivery(values)}
              successDescription="Saved to the order — ready for the quotation."
              trigger={
                <Button type="button" variant="outline" size="sm" disabled={savingDelivery} className="h-7 gap-1.5 text-[11px] font-bold">
                  <Pencil className="size-3.5" /> {deliveryDetails ? "Edit" : "Add"}
                </Button>
              }
            />
          ) : (
            !deliveryDetails && <span className="text-[11px] font-medium text-muted-foreground">Locked</span>
          )}
        </div>
        {deliveryDetails ? (
          <div className="mt-2 space-y-1 text-sm">
            <p className="font-semibold text-ink">{deliveryDetails.contactName} · {deliveryDetails.phone}</p>
            <p className="text-muted-foreground">{deliveryDetails.address}, {deliveryDetails.city}</p>
            {deliveryDetails.preferredDate && <p className="text-muted-foreground">Preferred: {deliveryDetails.preferredDate}</p>}
            {deliveryDetails.notes && <p className="text-muted-foreground">Note: {deliveryDetails.notes}</p>}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            {deliveryEditable ? "Not added yet — either the customer or your team can add it." : "No delivery details were added before the quotation was sent."}
          </p>
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
            {transportFee !== null ? formatRWF(transportFee) : "Not set yet"}
          </dd>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-2 text-base">
          <dt className="font-bold text-ink">Total</dt>
          <dd className="font-data font-bold text-ink">{formatRWF(grandTotal)}</dd>
        </div>
      </dl>

      {canManage ? (
        <div className="mt-5 space-y-2.5">
          {/* Once sent, the transport fee is final — no edit/delete path, on
              purpose: the customer's quotation (and whatever they've already
              paid against it) shouldn't shift under them after the fact. */}
          {quotationStatus === "AWAITING_REVIEW" && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger render={<Button type="button" className="h-11 w-full gap-2 text-sm font-bold" />}>
                <Truck className="size-4" />
                Add transport fee & send quotation
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Transport fee</DialogTitle>
                  <DialogDescription>
                    Based on quantity and delivery distance discussed with the customer. Enter 0 for free transport.
                    This can&apos;t be changed once the quotation is sent.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-5 space-y-4">
                  <Field>
                    <FieldLabel htmlFor="transport-fee">Transport fee (RWF)</FieldLabel>
                    <Input
                      id="transport-fee"
                      type="number"
                      min={0}
                      value={transportFeeInput}
                      onChange={(event) => setTransportFeeInput(event.target.value)}
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
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting} className="h-10 px-5 text-sm font-bold">
                    Cancel
                  </Button>
                  <Button type="button" disabled={!feeValid || submitting} onClick={() => void handleSendQuotation()} className="h-10 px-5 text-sm font-bold disabled:opacity-60">
                    {submitting ? "Sending…" : "Send quotation"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {quotationStatus === "QUOTATION_SENT" && (
            <p className="flex items-center justify-center gap-2 rounded-lg bg-blue-50 py-2.5 text-sm font-semibold text-blue-700">
              <Truck className="size-4" /> Quotation sent — waiting for payment
            </p>
          )}

          {quotationStatus === "PAYMENT_SUBMITTED" && (
            <Button type="button" onClick={() => void handleVerifyPayment()} disabled={submitting} className="h-11 w-full gap-2 text-sm font-bold">
              <ShieldCheck className="size-4" /> {submitting ? "Verifying…" : "Verify payment"}
            </Button>
          )}

          {quotationStatus === "PAYMENT_VERIFIED" && (
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
