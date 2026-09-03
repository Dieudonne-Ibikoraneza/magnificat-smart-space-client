"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { ordersApi } from "@/lib/api";
import type { ApiOrderItem } from "@/lib/api/types";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export const StockOrderEditDialog = ({
  orderId,
  items,
  notes,
  disabled = false,
  onUpdated,
}: {
  orderId: string;
  items: ApiOrderItem[];
  notes?: string | null;
  disabled?: boolean;
  onUpdated: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [areas, setAreas] = useState<Record<string, string>>({});
  const [orderNotes, setOrderNotes] = useState(notes ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const revisedItems = items.map((item) => ({ productId: item.productId, areaSqm: Number(areas[item.id]) }));
    if (revisedItems.some((item) => !Number.isFinite(item.areaSqm) || item.areaSqm <= 0)) {
      toast.error("Invalid quantity", { description: "Enter a quantity greater than zero for every item." });
      return;
    }

    setSaving(true);
    try {
      await ordersApi.updateItems(orderId, { items: revisedItems, notes: orderNotes.trim() || undefined });
      setOpen(false);
      onUpdated();
      toast.success("Order updated", { description: "The revised quantities will be used for the next quotation." });
    } catch (cause) {
      toast.error("Couldn't update order", { description: cause instanceof ApiError ? cause.message : "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setAreas(Object.fromEntries(items.map((item) => [item.id, String(item.requiredAreaSqm)])));
          setOrderNotes(notes ?? "");
        }
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger render={<Button type="button" variant="outline" disabled={disabled} className="h-auto gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase" />}>
        <Pencil className="size-4" /> Edit Order
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit order quantities</DialogTitle>
          <DialogDescription>Apply the quantities agreed with the customer. Any existing quotation will be reset and prepared again.</DialogDescription>
        </DialogHeader>
        <div className="mt-5 space-y-4">
          {items.map((item) => (
            <label key={item.id} className="block space-y-1.5">
              <span className="text-xs font-bold tracking-wide text-ink uppercase">{item.product?.name ?? "Item"}</span>
              <span className="flex items-center gap-2">
                <Input type="number" min="0.01" step="0.01" value={areas[item.id] ?? ""} onChange={(event) => setAreas((current) => ({ ...current, [item.id]: event.target.value }))} />
                <span className="shrink-0 text-sm text-muted-foreground">m²</span>
              </span>
            </label>
          ))}
          <label className="block space-y-1.5">
            <span className="text-xs font-bold tracking-wide text-ink uppercase">Order notes</span>
            <textarea value={orderNotes} onChange={(event) => setOrderNotes(event.target.value)} maxLength={2000} rows={3} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/40" placeholder="Add the agreed change or instruction…" />
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button type="button" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
