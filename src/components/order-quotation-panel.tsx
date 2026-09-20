"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CircleDollarSign, MapPin, Pencil, ShieldCheck, ShieldX, Truck } from "lucide-react";
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
import { DeliveryDetailsDialog, type DeliverySubmitResult } from "@/components/delivery-details-dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ordersApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { ApiOrderDelivery, QuotationStatus } from "@/lib/api/types";
import type { DeliveryDetails } from "@/lib/domain-types";
import { cn } from "@/lib/utils";

const formatRWF = (value: number) => `RWF ${Math.round(value).toLocaleString("en-US")}`;

const quotationStatusTone: Record<QuotationStatus, string> = {
  AWAITING_REVIEW: "bg-amber-50 text-amber-700",
  QUOTATION_SENT: "bg-blue-50 text-blue-700",
  PAYMENT_SUBMITTED: "bg-violet-50 text-violet-700",
  PAYMENT_VERIFIED: "bg-green-50 text-green-700",
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
  orderCancelled,
  orderWaitlisted,
  transportFee,
  transportFeeNote,
  canManage,
  canEditDelivery = true,
  autoOpenDelivery,
  onUpdated,
}: {
  orderId: string;
  subtotalValue: number;
  deliveryDetails?: ApiOrderDelivery | null;
  /** Pre-fills a fresh delivery-details form when staff add it on the customer's behalf. */
  customerName?: string;
  customerPhone?: string | null;
  quotationStatus: QuotationStatus;
  /** Cancelled is terminal (enforced server-side too) — nothing here stays editable once it's true. */
  orderCancelled: boolean;
  /** A waitlisted order holds no stock yet — the server refuses to quote it (`orders.service.ts#sendQuotation`). */
  orderWaitlisted: boolean;
  transportFee: number | null;
  transportFeeNote?: string | null;
  canManage: boolean;
  /** Off for a pure view-only surface (e.g. analytics) — every other role can add/edit delivery details regardless of `canManage`. */
  canEditDelivery?: boolean;
  /** Opens the "Add delivery details" dialog immediately — right after a staff member creates this order, so they add it as one continuous flow instead of a separate click later. */
  autoOpenDelivery?: boolean;
  /** Called after a successful action so the parent can refetch the order. */
  onUpdated: () => void;
}) => {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transportFeeInput, setTransportFeeInput] = useState(transportFee?.toString() ?? "0");
  const [transportNote, setTransportNote] = useState(transportFeeNote ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [savingDelivery, setSavingDelivery] = useState(false);

  const feeValue = Number(transportFeeInput);
  const feeValid = transportFeeInput.trim() !== "" && Number.isFinite(feeValue) && feeValue >= 0;
  const grandTotal = subtotalValue + (transportFee ?? 0);

  // The server enforces both of these same rules (`orders.service.ts`):
  // delivery details lock the moment a quotation goes out (the transport fee
  // was costed against exactly this address), and everything locks once the
  // order is cancelled.
  // The server also refuses a quotation for a waitlisted order or one without
  // delivery details (the quotation locks them) — say so here instead of
  // letting the button fail.
  const quotationBlockedReason = orderWaitlisted
    ? t("staff.quotationPanel.quotationNeedsStock")
    : !deliveryDetails
      ? t("staff.quotationPanel.quotationNeedsDelivery")
      : null;

  const deliveryEditable = canEditDelivery && quotationStatus === "AWAITING_REVIEW" && !orderCancelled;

  const handleSaveDelivery = async (values: DeliveryDetails): Promise<DeliverySubmitResult> => {
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
      return "saved";
    } catch (cause) {
      toast.error(t("staff.quotationPanel.toastSaveDeliveryFailedTitle"), {
        description: cause instanceof ApiError ? cause.message : t("staff.quotationPanel.toastTryAgain"),
      });
      return "retry";
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
      toast.success(t("staff.quotationPanel.toastQuotationSentTitle"), {
        description: t("staff.quotationPanel.toastQuotationSentBody", {
          fee: formatRWF(feeValue),
          total: formatRWF(subtotalValue + feeValue),
        }),
      });
    } catch (cause) {
      toast.error(t("staff.quotationPanel.toastQuotationFailedTitle"), {
        description: cause instanceof ApiError ? cause.message : t("staff.quotationPanel.toastTryAgain"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleRejectPayment = async () => {
    const reason = rejectReason.trim();
    if (!reason) return;
    setSubmitting(true);
    try {
      await ordersApi.rejectPayment(orderId, reason);
      setRejectOpen(false);
      setRejectReason("");
      onUpdated();
      toast.success(t("staff.quotationPanel.toastRejectedTitle"), {
        description: t("staff.quotationPanel.toastRejectedBody"),
      });
    } catch (cause) {
      toast.error(t("staff.quotationPanel.toastRejectFailedTitle"), {
        description: cause instanceof ApiError ? cause.message : t("staff.quotationPanel.toastTryAgain"),
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
      toast.success(t("staff.quotationPanel.toastPaymentVerifiedTitle"), {
        description: t("staff.quotationPanel.toastPaymentVerifiedBody"),
      });
    } catch (cause) {
      toast.error(t("staff.quotationPanel.toastVerifyFailedTitle"), {
        description: cause instanceof ApiError ? cause.message : t("staff.quotationPanel.toastTryAgain"),
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
          <h2 className="text-lg font-bold text-ink sm:text-xl">{t("staff.quotationPanel.heading")}</h2>
        </div>
        <span className={cn("shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase", quotationStatusTone[quotationStatus])}>
          {t(`staff.quotationPanel.quotationStatus.${quotationStatus}`)}
        </span>
      </div>

      <div className="mt-5 rounded-xl border border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            <MapPin className="size-3.5" /> {t("staff.quotationPanel.deliveryDetails")}
          </div>
          {deliveryEditable ? (
            <DeliveryDetailsDialog
              initialValue={
                deliveryDetails
                  ? toDeliveryDetails(deliveryDetails)
                  : { contactName: customerName ?? "", phone: customerPhone ?? "", address: "", city: "", preferredDate: "", notes: "" }
              }
              onSubmit={handleSaveDelivery}
              successDescription={t("staff.quotationPanel.deliverySaved")}
              defaultOpen={autoOpenDelivery && !deliveryDetails}
              trigger={
                <Button type="button" variant="outline" size="sm" disabled={savingDelivery} className="h-7 gap-1.5 text-[11px] font-bold">
                  <Pencil className="size-3.5" /> {deliveryDetails ? t("staff.quotationPanel.edit") : t("staff.quotationPanel.add")}
                </Button>
              }
            />
          ) : (
            canEditDelivery && !deliveryDetails && <span className="text-[11px] font-medium text-muted-foreground">{t("staff.quotationPanel.locked")}</span>
          )}
        </div>
        {deliveryDetails ? (
          <div className="mt-2 space-y-1 text-sm">
            <p className="font-semibold text-ink">{deliveryDetails.contactName} · {deliveryDetails.phone}</p>
            <p className="text-muted-foreground">{deliveryDetails.address}, {deliveryDetails.city}</p>
            {deliveryDetails.preferredDate && <p className="text-muted-foreground">{t("staff.quotationPanel.preferred", { date: deliveryDetails.preferredDate })}</p>}
            {deliveryDetails.notes && <p className="text-muted-foreground">{t("staff.quotationPanel.note", { note: deliveryDetails.notes })}</p>}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            {orderCancelled
              ? t("staff.quotationPanel.deliveryCancelled")
              : !canEditDelivery
                ? t("staff.quotationPanel.deliveryNotAdded")
                : deliveryEditable
                  ? t("staff.quotationPanel.deliveryNotAddedEither")
                  : t("staff.quotationPanel.deliveryNoneBeforeQuotation")}
          </p>
        )}
      </div>

      <dl className="mt-5 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">{t("staff.quotationPanel.itemsSubtotal")}</dt>
          <dd className="font-data font-semibold text-ink">{formatRWF(subtotalValue)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">{t("staff.quotationPanel.transportFee")}</dt>
          <dd className="font-data font-semibold text-ink">
            {transportFee !== null ? formatRWF(transportFee) : t("staff.quotationPanel.transportFeeNotSet")}
          </dd>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-2 text-base">
          <dt className="font-bold text-ink">{t("staff.quotationPanel.total")}</dt>
          <dd className="font-data font-bold text-ink">{formatRWF(grandTotal)}</dd>
        </div>
      </dl>

      {orderCancelled ? (
        <p className="mt-5 rounded-lg bg-red-50 py-2.5 text-center text-sm font-medium text-red-700">
          {t("staff.quotationPanel.orderCancelledNote")}
        </p>
      ) : canManage ? (
        <div className="mt-5 space-y-2.5">
          {/* Once sent, the transport fee is final — no edit/delete path, on
              purpose: the customer's quotation (and whatever they've already
              paid against it) shouldn't shift under them after the fact. */}
          {quotationStatus === "AWAITING_REVIEW" && quotationBlockedReason && (
            <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-center text-xs font-medium text-amber-700">{quotationBlockedReason}</p>
          )}
          {quotationStatus === "AWAITING_REVIEW" && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger
                render={<Button type="button" disabled={quotationBlockedReason !== null} className="h-11 w-full gap-2 text-sm font-bold" />}
              >
                <Truck className="size-4" />
                {t("staff.quotationPanel.addFeeSendQuotation")}
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>{t("staff.quotationPanel.transportFeeTitle")}</DialogTitle>
                  <DialogDescription>
                    {t("staff.quotationPanel.transportFeeDescription")}
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-5 space-y-4">
                  <Field>
                    <FieldLabel htmlFor="transport-fee">{t("staff.quotationPanel.transportFeeLabel")}</FieldLabel>
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
                    <FieldLabel htmlFor="transport-note">{t("staff.quotationPanel.noteLabel")}</FieldLabel>
                    <Textarea
                      id="transport-note"
                      rows={2}
                      value={transportNote}
                      onChange={(event) => setTransportNote(event.target.value)}
                      placeholder={t("staff.quotationPanel.notePlaceholder")}
                    />
                  </Field>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting} className="h-10 px-5 text-sm font-bold">
                    {t("staff.quotationPanel.cancel")}
                  </Button>
                  <Button type="button" disabled={!feeValid || submitting} onClick={() => void handleSendQuotation()} className="h-10 px-5 text-sm font-bold disabled:opacity-60">
                    {submitting ? t("staff.quotationPanel.sending") : t("staff.quotationPanel.sendQuotation")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {quotationStatus === "QUOTATION_SENT" && (
            <p className="flex items-center justify-center gap-2 rounded-lg bg-blue-50 py-2.5 text-sm font-semibold text-blue-700">
              <Truck className="size-4" /> {t("staff.quotationPanel.quotationSentWaiting")}
            </p>
          )}

          {quotationStatus === "PAYMENT_SUBMITTED" && (
            <div className="space-y-2.5">
              <Button type="button" onClick={() => void handleVerifyPayment()} disabled={submitting} className="h-11 w-full gap-2 text-sm font-bold">
                <ShieldCheck className="size-4" /> {submitting ? t("staff.quotationPanel.verifying") : t("staff.quotationPanel.verifyPayment")}
              </Button>
              <Dialog
                open={rejectOpen}
                onOpenChange={(next) => {
                  // Not while the request is in flight — closing would hide its outcome.
                  if (submitting) return;
                  setRejectOpen(next);
                  if (!next) setRejectReason("");
                }}
              >
                <DialogTrigger
                  render={<Button type="button" variant="outline" disabled={submitting} className="h-11 w-full gap-2 text-sm font-bold text-red-600 hover:text-red-700" />}
                >
                  <ShieldX className="size-4" /> {t("staff.quotationPanel.rejectPayment")}
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>{t("staff.quotationPanel.rejectTitle")}</DialogTitle>
                    <DialogDescription>{t("staff.quotationPanel.rejectDescription")}</DialogDescription>
                  </DialogHeader>
                  <div className="mt-5">
                    <Field>
                      <FieldLabel htmlFor="reject-reason">{t("staff.quotationPanel.rejectReasonLabel")}</FieldLabel>
                      <Textarea
                        id="reject-reason"
                        rows={3}
                        maxLength={500}
                        value={rejectReason}
                        onChange={(event) => setRejectReason(event.target.value)}
                        placeholder={t("staff.quotationPanel.rejectReasonPlaceholder")}
                      />
                    </Field>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setRejectOpen(false)} disabled={submitting} className="h-10 px-5 text-sm font-bold">
                      {t("staff.quotationPanel.cancel")}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={submitting || rejectReason.trim() === ""}
                      onClick={() => void handleRejectPayment()}
                      className="h-10 px-5 text-sm font-bold"
                    >
                      {submitting ? t("staff.quotationPanel.rejecting") : t("staff.quotationPanel.rejectConfirm")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {quotationStatus === "PAYMENT_VERIFIED" && (
            <p className="flex items-center justify-center gap-2 rounded-lg bg-green-50 py-2.5 text-sm font-semibold text-green-700">
              <ShieldCheck className="size-4" /> {t("staff.quotationPanel.paymentVerified")}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-5 text-xs text-muted-foreground">
          {t("staff.quotationPanel.stockTeamManages")}
        </p>
      )}
    </section>
  );
};
