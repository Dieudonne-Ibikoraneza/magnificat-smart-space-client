"use client";

import { useState } from "react";
import { ClipboardCheck, Minus, Plus } from "lucide-react";
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
import { cn } from "@/lib/utils";

type AdjustmentDirection = "add" | "remove";

const reasons = [
  "Restock delivery",
  "Damaged / write-off",
  "Stock count correction",
  "Reserved for order",
] as const;

/** Adjusts on-hand stock, tracked in sqm (the unit the business sells in). */
export const AdjustStockDialog = ({
  productName,
  currentStockSqm,
  onAdjust,
}: {
  productName: string;
  currentStockSqm: number;
  onAdjust: (nextStockSqm: number) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<AdjustmentDirection>("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState<string>(reasons[0]);
  const [note, setNote] = useState("");

  const parsedAmount = Number(amount);
  const valid = amount.trim() !== "" && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const changeSqm = valid ? (direction === "add" ? parsedAmount : -parsedAmount) : 0;
  const nextStock = Math.max(0, Math.round((currentStockSqm + changeSqm) * 100) / 100);

  const handleSubmit = () => {
    if (!valid) return;
    onAdjust(nextStock);
    toast.success("Stock adjusted", {
      description: `${productName}: ${changeSqm >= 0 ? "+" : ""}${changeSqm} sqm (${reason}) · Now ${nextStock.toLocaleString()} sqm on hand.`,
    });
    setOpen(false);
    setAmount("");
    setNote("");
    setDirection("add");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setAmount("");
          setNote("");
          setDirection("add");
          setReason(reasons[0]);
        }
      }}
    >
      <DialogTrigger render={<Button type="button" className="h-13 w-full gap-2 rounded-lg text-sm font-bold" />}>
        <ClipboardCheck className="size-5" />
        Adjust Stock
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            {productName} · Currently {currentStockSqm.toLocaleString()} sqm on hand.
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
              <Plus className="size-4" /> Add
            </button>
            <button
              type="button"
              onClick={() => setDirection("remove")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-bold transition-colors",
                direction === "remove" ? "bg-primary text-ink" : "text-muted-foreground hover:bg-secondary",
              )}
            >
              <Minus className="size-4" /> Remove
            </button>
          </div>

          <Field>
            <FieldLabel htmlFor="adjust-amount">Amount (sqm)</FieldLabel>
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

          <Field>
            <FieldLabel htmlFor="adjust-reason">Reason</FieldLabel>
            <Select value={reason} onValueChange={(value) => setReason(value ?? reasons[0])}>
              <SelectTrigger id="adjust-reason">
                <SelectValue>{(value: string) => value}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {reasons.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="adjust-note">Note (optional)</FieldLabel>
            <Textarea
              id="adjust-note"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Delivery reference, count discrepancy, etc."
            />
          </Field>

          {valid && (
            <p className="rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
              New stock level: <strong className="text-ink">{nextStock.toLocaleString()} sqm</strong>
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-10 px-5 text-sm font-bold">
            Cancel
          </Button>
          <Button type="button" disabled={!valid} onClick={handleSubmit} className="h-10 px-5 text-sm font-bold disabled:opacity-60">
            Save adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
