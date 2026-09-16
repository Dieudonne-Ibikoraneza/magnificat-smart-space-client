"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, RefreshCw } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ordersApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { OrderStatus } from "@/lib/api/types";

const statusVariant: Record<OrderStatus, NonNullable<BadgeProps["variant"]>> = {
  WAITLISTED: "warning",
  PENDING: "outline",
  PROCESSING: "secondary",
  READY_FOR_DISPATCH: "warning",
  SHIPPED: "primary",
  DELIVERED: "muted",
  CANCELLED: "destructive",
};

const statuses: OrderStatus[] = [
  "PENDING",
  "PROCESSING",
  "READY_FOR_DISPATCH",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

/** A waitlisted order only ever leaves that status automatically (once stock covers it) or by being cancelled outright — see `orders.service.ts#updateStatus`. */
const selectableStatuses = (current: OrderStatus): OrderStatus[] =>
  current === "WAITLISTED" ? ["WAITLISTED", "CANCELLED"] : statuses;

/** Plain, read-only status badge — no click behavior. Pair with `OrderStatusControl` for the actual "Update Status" action, kept as its own button elsewhere in the header. */
export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => {
  const { t } = useTranslation();
  return <Badge variant={statusVariant[status]}>{t(`staff.orderStatus.${status}`)}</Badge>;
};

/** The "Update Status" button + dialog — a separate control from `OrderStatusBadge`, which only ever displays the current status. */
export const OrderStatusControl = ({
  orderId,
  status,
  onUpdated,
}: {
  orderId: string;
  status: OrderStatus;
  /** Called after a successful status change so the parent can refetch the order. */
  onUpdated: () => void;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<OrderStatus>(status);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Cancelled and delivered are end states: a cancelled order can't change
  // at all (`orders.service.ts` rejects it), and a delivered one has reached
  // the end of fulfilment — there's nothing left for this control to move it
  // to, so it's hidden rather than left offering a pointless dialog.
  if (status === "CANCELLED" || status === "DELIVERED") return null;

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await ordersApi.updateStatus(orderId, nextStatus, note.trim() || undefined);
      setOpen(false);
      onUpdated();
      toast.success(t("staff.orderStatusControl.toastUpdatedTitle"), {
        description: t("staff.orderStatusControl.toastUpdatedBody", {
          status: t(`staff.orderStatus.${nextStatus}`),
        }),
      });
    } catch (cause) {
      toast.error(t("staff.orderStatusControl.toastFailedTitle"), {
        description: cause instanceof ApiError ? cause.message : t("staff.orderStatusControl.toastFailedBody"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setNextStatus(status);
          setNote("");
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            // `outline` turns solid gray the instant the dialog opens (base
            // button styling reacts to `aria-expanded`, meant for disclosure
            // triggers like a Select) — wrong read here, where the backdrop
            // already shows the dialog is open; this keeps it looking like a
            // plain, un-pressed button the whole time, matching Print Invoice.
            className="h-auto gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase transition-transform duration-200 aria-expanded:bg-white aria-expanded:text-ink active:scale-95"
          />
        }
      >
        <RefreshCw className="size-4" />
        {t("staff.orderStatusControl.trigger")}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-ink">
            <RefreshCw className="size-5" />
          </span>
          <DialogTitle className="pt-3">{t("staff.orderStatusControl.title")}</DialogTitle>
          <DialogDescription>{t("staff.orderStatusControl.orderRef", { id: orderId })}</DialogDescription>
        </DialogHeader>
        <div className="mt-5 space-y-4">
          <Field>
            <FieldLabel htmlFor="order-status">{t("staff.orderStatusControl.statusLabel")}</FieldLabel>
            <Select value={nextStatus} onValueChange={(value) => setNextStatus((value as OrderStatus) ?? nextStatus)}>
              <SelectTrigger id="order-status">
                <SelectValue>
                  {(value: string) => (
                    <span className="flex items-center gap-2">
                      <Badge variant={statusVariant[value as OrderStatus]}>{t(`staff.orderStatus.${value as OrderStatus}`)}</Badge>
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {selectableStatuses(status).map((item) => (
                  <SelectItem key={item} value={item}>
                    <Badge variant={statusVariant[item]}>{t(`staff.orderStatus.${item}`)}</Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="order-status-note">{t("staff.orderStatusControl.noteLabel")}</FieldLabel>
            <Textarea
              id="order-status-note"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t("staff.orderStatusControl.notePlaceholder")}
            />
          </Field>
          {nextStatus !== status && (
            <p className="flex items-center gap-2.5 rounded-lg bg-secondary/60 px-3 py-2.5 text-xs text-muted-foreground">
              <Badge variant={statusVariant[status]}>{t(`staff.orderStatus.${status}`)}</Badge>
              <ArrowRight className="size-3.5 shrink-0" />
              <Badge variant={statusVariant[nextStatus]}>{t(`staff.orderStatus.${nextStatus}`)}</Badge>
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting} className="h-10 px-5 text-sm font-bold">
            {t("staff.orderStatusControl.cancel")}
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={submitting} className="h-10 px-5 text-sm font-bold">
            {submitting ? t("staff.orderStatusControl.saving") : t("staff.orderStatusControl.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
