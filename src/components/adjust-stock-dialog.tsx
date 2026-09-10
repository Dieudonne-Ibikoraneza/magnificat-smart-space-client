"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ClipboardCheck, Coins, Minus, Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { productsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { StockMovementType } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type AdjustmentDirection = "add" | "remove";

/** Canonical reason values stored on the stock adjustment record; the map keys drive display only. */
const REASON_KEYS = {
  "Restock delivery": "staff.adjustStock.reasons.restock",
  "Damaged / write-off": "staff.adjustStock.reasons.damage",
  "Stock count correction": "staff.adjustStock.reasons.correction",
  "Reserved for order": "staff.adjustStock.reasons.reserved",
} as const;

const reasons = Object.keys(REASON_KEYS) as (keyof typeof REASON_KEYS)[];

/** Adjusts on-hand stock, tracked in sqm (the unit the business sells in). */
export const AdjustStockDialog = ({
  productId,
  productName,
  currentStockSqm,
  onAdjusted,
  renderTrigger,
  triggerContent,
}: {
  productId: string;
  productName: string;
  currentStockSqm: number;
  /** Called after a successful adjustment so the parent can refetch the product. */
  onAdjusted: () => void;
  /** Custom trigger element (e.g. a compact button) — defaults to a full-width primary button. */
  renderTrigger?: ReactElement;
  /** Custom trigger content — defaults to a "Adjust Stock" icon + label. */
  triggerContent?: ReactNode;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<AdjustmentDirection>("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState<string>(reasons[0]);
  const [note, setNote] = useState("");
  // Only meaningful for stock coming in — feeds the moving weighted-average
  // cost used for inventory valuation; a removal has no cost to record.
  const [costPrice, setCostPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const parsedAmount = Number(amount);
  const amountValid = amount.trim() !== "" && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const parsedCostPrice = Number(costPrice);
  const costPriceValid = costPrice.trim() === "" || (Number.isFinite(parsedCostPrice) && parsedCostPrice > 0);
  const valid = amountValid && (direction === "remove" || costPriceValid);
  const changeSqm = amountValid ? (direction === "add" ? parsedAmount : -parsedAmount) : 0;
  const nextStock = Math.max(0, Math.round((currentStockSqm + changeSqm) * 100) / 100);

  const handleSubmit = async () => {
    if (!valid) return;
    setSubmitting(true);
    try {
      const movementType: StockMovementType = direction === "add" ? "INBOUND" : "OUTBOUND";
      await productsApi.adjustStock(productId, {
        changeAreaSqm: changeSqm,
        type: movementType,
        reason,
        reference: note.trim() || undefined,
        costPrice: direction === "add" && costPrice.trim() !== "" ? parsedCostPrice : undefined,
      });
      onAdjusted();
      const costNote =
        direction === "add" && costPrice.trim() !== ""
          ? t("staff.adjustStock.toastCostNote", { value: parsedCostPrice.toLocaleString() })
          : "";
      toast.success(t("staff.adjustStock.toastAdjustedTitle"), {
        description: t("staff.adjustStock.toastAdjustedBody", {
          name: productName,
          change: `${changeSqm >= 0 ? "+" : ""}${changeSqm}`,
          costNote,
          reason: t(REASON_KEYS[reason as keyof typeof REASON_KEYS] ?? reason),
          qty: nextStock.toLocaleString(),
        }),
      });
      setOpen(false);
      setAmount("");
      setCostPrice("");
      setNote("");
      setDirection("add");
    } catch (cause) {
      toast.error(t("staff.adjustStock.toastFailedTitle"), {
        description: cause instanceof ApiError ? cause.message : t("staff.adjustStock.toastTryAgain"),
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
          setAmount("");
          setCostPrice("");
          setNote("");
          setDirection("add");
          setReason(reasons[0]);
        }
      }}
    >
      <DialogTrigger render={renderTrigger ?? <Button type="button" className="h-13 w-full gap-2 rounded-lg text-sm font-bold" />}>
        {triggerContent ?? (
          <>
            <ClipboardCheck className="size-5" />
            {t("staff.adjustStock.trigger")}
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("staff.adjustStock.title")}</DialogTitle>
          <DialogDescription>
            {t("staff.adjustStock.description", { name: productName, qty: currentStockSqm.toLocaleString() })}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 space-y-4">
          <div className="flex rounded-lg border border-border p-1">
            <button
              type="button"
              onClick={() => setDirection("add")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-bold transition-colors",
                direction === "add" ? "bg-primary text-ink" : "text-muted-foreground hover:bg-secondary",
              )}
            >
              <Plus className="size-4" /> {t("staff.adjustStock.add")}
            </button>
            <button
              type="button"
              onClick={() => {
                setDirection("remove");
                setCostPrice("");
              }}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-bold transition-colors",
                direction === "remove" ? "bg-primary text-ink" : "text-muted-foreground hover:bg-secondary",
              )}
            >
              <Minus className="size-4" /> {t("staff.adjustStock.remove")}
            </button>
          </div>

          <Field>
            <FieldLabel htmlFor="adjust-amount">{t("staff.adjustStock.amountLabel")}</FieldLabel>
            <Input
              id="adjust-amount"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0"
            />
          </Field>

          {direction === "add" && (
            <Field>
              <FieldLabel htmlFor="adjust-cost-price">{t("staff.adjustStock.costPriceLabel")}</FieldLabel>
              <div className="relative">
                <Coins
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                  strokeWidth={1.5}
                />
                <Input
                  id="adjust-cost-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={costPrice}
                  onChange={(event) => setCostPrice(event.target.value)}
                  placeholder="15000"
                  className="pl-11"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("staff.adjustStock.costPriceHint")}
              </p>
            </Field>
          )}

          <Field>
            <FieldLabel htmlFor="adjust-reason">{t("staff.adjustStock.reasonLabel")}</FieldLabel>
            <Select value={reason} onValueChange={(value) => setReason(value ?? reasons[0])}>
              <SelectTrigger id="adjust-reason">
                <SelectValue>{(value: string) => t(REASON_KEYS[value as keyof typeof REASON_KEYS] ?? value)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {reasons.map((item) => (
                  <SelectItem key={item} value={item}>
                    {t(REASON_KEYS[item])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="adjust-note">{t("staff.adjustStock.noteLabel")}</FieldLabel>
            <Textarea
              id="adjust-note"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t("staff.adjustStock.notePlaceholder")}
            />
          </Field>

          {valid && (
            <p className="rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
              {t("staff.adjustStock.newLevel", { qty: nextStock.toLocaleString() })}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting} className="h-10 px-5 text-sm font-bold">
            {t("staff.adjustStock.cancel")}
          </Button>
          <Button type="button" disabled={!valid || submitting} onClick={() => void handleSubmit()} className="h-10 px-5 text-sm font-bold disabled:opacity-60">
            {submitting ? t("staff.adjustStock.saving") : t("staff.adjustStock.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
