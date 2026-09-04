"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Check, ImagePlus, Pencil, Wallet, X } from "lucide-react";
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
 * Product editor. Packaging values remain editable because the API validates
 * them as part of the product record, while stock itself is intentionally
 * managed through the stock adjustment workflow.
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
  const [sku, setSku] = useState(product.sku);
  const [boxCoverageSqm, setBoxCoverageSqm] = useState(String(product.boxCoverageSqm));
  const [piecesPerBox, setPiecesPerBox] = useState(String(product.piecesPerBox));
  const [price, setPrice] = useState(String(product.price));
  const [description, setDescription] = useState(product.description ?? "");
  const [suitableFor, setSuitableFor] = useState<SuitableFor>(product.suitableFor);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>(product.roomTypes);
  const [image, setImage] = useState(product.image);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const toggleRoomType = (option: RoomType) => {
    setRoomTypes((current) =>
      current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
    );
  };

  const parsedPrice = Number(price);
  const priceValid = price.trim() !== "" && Number.isFinite(parsedPrice) && parsedPrice > 0;
  const parsedCoverage = Number(boxCoverageSqm);
  const parsedPieces = Number(piecesPerBox);
  const packagingValid = Number.isFinite(parsedCoverage) && parsedCoverage > 0 && Number.isInteger(parsedPieces) && parsedPieces > 0;
  const nameValid = name.trim().length >= 2;
  const imageValid = !!imageFile || image.trim().length > 0;
  const valid = nameValid && sku.trim().length > 0 && priceValid && packagingValid && imageValid && roomTypes.length > 0;

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const resetToProduct = () => {
    setName(product.name);
    setSku(product.sku);
    setBoxCoverageSqm(String(product.boxCoverageSqm));
    setPiecesPerBox(String(product.piecesPerBox));
    setPrice(String(product.price));
    setDescription(product.description ?? "");
    setSuitableFor(product.suitableFor);
    setRoomTypes(product.roomTypes);
    setImage(product.image);
    setImageFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async () => {
    if (!valid) return;
    setSubmitting(true);
    try {
      const uploaded = imageFile ? await productsApi.uploadImage(imageFile) : null;
      await productsApi.update(product.id, {
        name: name.trim(),
        sku: sku.trim(),
        boxCoverageSqm: parsedCoverage,
        piecesPerBox: parsedPieces,
        price: parsedPrice,
        description: description.trim() || undefined,
        suitableFor,
        roomTypes,
        image: uploaded?.path ?? image,
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
            Update the product details and replace its catalog image when needed.
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
            <FieldLabel htmlFor="edit-sku">SKU</FieldLabel>
            <Input id="edit-sku" value={sku} onChange={(event) => setSku(event.target.value)} />
            {sku.length === 0 && <p className="text-xs font-medium text-red-600">Enter a SKU.</p>}
          </Field>

          <Field>
            <FieldLabel>Product Image</FieldLabel>
            <div className="mt-1">
              {previewUrl || image ? (
                <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-muted-background">
                  <Image src={previewUrl ?? image} alt={`${name || "Product"} preview`} fill unoptimized className="object-cover" />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    onClick={() => { setImageFile(null); setImage(""); setPreviewUrl(null); }}
                    className="absolute top-3 right-3 rounded-full bg-white/95 text-ink shadow-sm"
                    aria-label="Remove product image"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <button type="button" onClick={() => inputRef.current?.click()} className="flex aspect-4/3 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/40 text-center hover:bg-secondary/60">
                  <span className="flex size-11 items-center justify-center rounded-full bg-white text-ink shadow-sm"><ImagePlus className="size-5" /></span>
                  <span className="text-sm font-semibold text-ink">Choose a product image</span>
                  <span className="text-xs text-muted-foreground">PNG, JPG or WEBP · up to 10MB</span>
                </button>
              )}
              <input
                ref={inputRef}
                id="edit-product-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  const file = event.target.files?.[0] ?? null;
                  setImageFile(file);
                  setPreviewUrl(file ? URL.createObjectURL(file) : null);
                }}
              />
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="edit-box-coverage">Box Coverage (m²)</FieldLabel>
              <Input id="edit-box-coverage" type="number" min={0} step="0.01" value={boxCoverageSqm} onChange={(event) => setBoxCoverageSqm(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-pieces-per-box">Pieces per Box</FieldLabel>
              <Input id="edit-pieces-per-box" type="number" min={1} step="1" value={piecesPerBox} onChange={(event) => setPiecesPerBox(event.target.value)} />
            </Field>
          </div>
          {!packagingValid && (boxCoverageSqm.length > 0 || piecesPerBox.length > 0) && <p className="text-xs font-medium text-red-600">Enter valid coverage and a whole number of pieces per box.</p>}

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
