"use client";

import { useState } from "react";
import { Check, Pencil, Wallet } from "lucide-react";
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
import { productsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { roomTypeLabels } from "@/lib/api/mappers";
import type { ApiProduct, RoomType, SuitableFor } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const suitableForOptions: { value: SuitableFor; label: string }[] = [
  { value: "FLOOR", label: "Floor" },
  { value: "WALL", label: "Wall" },
  { value: "BOTH", label: "Floor & Wall" },
];

const roomTypeOptions = Object.keys(roomTypeLabels) as RoomType[];

/**
 * Edits the fields that don't need extra infrastructure to change safely:
 * name, price, description, suitable-for, and room types. SKU, collection,
 * box coverage/pieces-per-box, and the image are left out — the first three
 * would need a "does this still add up" check against existing orders/stock
 * math, and the image has no upload pipeline behind it yet (see the "new
 * product" pages, deliberately left on mock data for the same reason).
 */
export const EditProductDialog = ({
  product,
  onUpdated,
}: {
  product: ApiProduct;
  /** Called after a successful edit so the parent can refetch the product. */
  onUpdated: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(String(product.price));
  const [description, setDescription] = useState(product.description ?? "");
  const [suitableFor, setSuitableFor] = useState<SuitableFor>(product.suitableFor);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>(product.roomTypes);
  const [submitting, setSubmitting] = useState(false);

  const toggleRoomType = (option: RoomType) => {
    setRoomTypes((current) =>
      current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
    );
  };

  const parsedPrice = Number(price);
  const priceValid = price.trim() !== "" && Number.isFinite(parsedPrice) && parsedPrice > 0;
  const nameValid = name.trim().length >= 2;
  const valid = nameValid && priceValid && roomTypes.length > 0;

  const resetToProduct = () => {
    setName(product.name);
    setPrice(String(product.price));
    setDescription(product.description ?? "");
    setSuitableFor(product.suitableFor);
    setRoomTypes(product.roomTypes);
  };

  const handleSubmit = async () => {
    if (!valid) return;
    setSubmitting(true);
    try {
      await productsApi.update(product.id, {
        name: name.trim(),
        price: parsedPrice,
        description: description.trim() || undefined,
        suitableFor,
        roomTypes,
      });
      onUpdated();
      toast.success("Product updated", { description: `${name.trim()} was saved.` });
      setOpen(false);
    } catch (cause) {
      toast.error("Couldn't save changes", {
        description: cause instanceof ApiError ? cause.message : "Please try again.",
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
        if (next) resetToProduct();
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="h-12 gap-2 border border-[#E8E8E8] text-sm font-semibold"
          />
        }
      >
        <Pencil className="size-4 stroke-2.5" />
        Edit Details
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit product</DialogTitle>
          <DialogDescription>
            SKU, collection, packaging, and the photo aren&apos;t editable here.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 space-y-4">
          <Field>
            <FieldLabel htmlFor="edit-name">Product Name</FieldLabel>
            <Input id="edit-name" value={name} onChange={(event) => setName(event.target.value)} />
            {name.length > 0 && !nameValid && (
              <p className="text-xs font-medium text-red-600">Enter a name of at least 2 characters.</p>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="edit-price">Price (RWF / sqm)</FieldLabel>
            <div className="relative">
              <Wallet
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                strokeWidth={1.5}
              />
              <Input
                id="edit-price"
                type="number"
                min={0}
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="pl-11"
              />
            </div>
            {price.length > 0 && !priceValid && (
              <p className="text-xs font-medium text-red-600">Enter a price greater than 0.</p>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="edit-description">Description</FieldLabel>
            <Textarea
              id="edit-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Shown on the product's detail page."
            />
          </Field>

          <div>
            <FieldLabel className="text-sm font-medium text-ink">Suitable For</FieldLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              {suitableForOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSuitableFor(option.value)}
                  aria-pressed={suitableFor === option.value}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
                    suitableFor === option.value
                      ? "border-primary bg-primary text-ink"
                      : "border-border bg-transparent text-muted-foreground hover:bg-secondary",
                  )}
                >
                  {suitableFor === option.value && <Check className="size-3.5" />}
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel className="text-sm font-medium text-ink">Room Types</FieldLabel>
            <p className="mt-0.5 text-xs text-muted-foreground">At least one.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {roomTypeOptions.map((option) => {
                const checked = roomTypes.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleRoomType(option)}
                    aria-pressed={checked}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
                      checked
                        ? "border-primary bg-primary text-ink"
                        : "border-border bg-transparent text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    {checked && <Check className="size-3.5" />}
                    {roomTypeLabels[option]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting} className="h-10 px-5 text-sm font-bold">
            Cancel
          </Button>
          <Button type="button" disabled={!valid || submitting} onClick={() => void handleSubmit()} className="h-10 px-5 text-sm font-bold disabled:opacity-60">
            {submitting ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
