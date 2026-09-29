"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Check, CheckCircle2, ImagePlus, Loader2, Pencil, Wallet, X } from "lucide-react";
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
import { Field, FieldLabel, RequiredAsterisk } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { calculatePiecesPerBox, isPositiveNumber, isValidName, isValidSku, isValidDescription } from "@/lib/product-validation";
import { useSkuAvailability } from "@/lib/use-sku-availability";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiErrorState } from "@/components/api-state";
import { toast } from "@/components/ui/toast";
import { collectionsApi, productsApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { ApiError } from "@/lib/api/client";
import { useLocale } from "@/lib/i18n";
import type { ApiProduct, RoomType, SuitableFor, VisualizerTilePattern } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { TilePatternCornerField } from "@/components/tile-pattern-corner-field";
import type { VisualizerTileCorner } from "@/lib/api/types";

const SUITABLE_FOR_KEYS: { value: SuitableFor; labelKey: string }[] = [
  { value: "FLOOR", labelKey: "staff.editProduct.floor" },
  { value: "WALL", labelKey: "staff.editProduct.wall" },
  { value: "BOTH", labelKey: "staff.editProduct.floorAndWall" },
];

const VISUALIZER_PATTERN_KEYS: { value: VisualizerTilePattern; labelKey: string }[] = [
  { value: "STRAIGHT", labelKey: "staff.editProduct.visualizerStraight" },
  { value: "TWO_TURN", labelKey: "staff.editProduct.visualizerTwoTurn" },
  { value: "QUARTER_TURN", labelKey: "staff.editProduct.visualizerQuarterTurn" },
];

const ROOM_TYPE_KEYS: Record<RoomType, string> = {
  LIVING_ROOM: "catalog.roomTypes.livingRoom",
  BEDROOM: "catalog.roomTypes.bedroom",
  BATHROOM: "catalog.roomTypes.bathroom",
  KITCHEN: "catalog.roomTypes.kitchen",
};

const roomTypeOptions = Object.keys(ROOM_TYPE_KEYS) as RoomType[];

/**
 * Product editor. Pieces per box follow the collection's tile area and the
 * entered box coverage; stock is managed through the stock adjustment workflow.
 */
export const EditProductDialog = ({
  product,
  onUpdated,
  trigger,
}: {
  product: ApiProduct;
  /** Called after a successful edit so the parent can refetch the product. */
  onUpdated: () => void;
  /** Custom trigger element (e.g. an icon-only button for list rows) — falls back to the default labeled button when omitted. */
  trigger?: ReactElement;
}) => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  // Kinyarwanda admin UI edits the Kinyarwanda copy, not the English source
  // — falls back to the English text when no translation exists yet (rather
  // than showing a blank field), same as the customer-facing `localizedText`
  // does. Saving still sends it as `nameRw`/`descriptionRw` either way, so
  // the server knows to regenerate English from it (see `productsApi`).
  const isRw = locale === "rw";
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(isRw ? (product.nameRw ?? product.name) : product.name);
  const [sku, setSku] = useState(product.sku.trim().toUpperCase());
  const [collectionId, setCollectionId] = useState(product.collectionId);
  const [boxCoverageSqm, setBoxCoverageSqm] = useState(String(product.boxCoverageSqm));
  const [price, setPrice] = useState(String(product.price));
  const [description, setDescription] = useState(
    isRw ? (product.descriptionRw ?? product.description ?? "") : (product.description ?? ""),
  );
  const [suitableFor, setSuitableFor] = useState<SuitableFor>(product.suitableFor);
  const [visualizerPattern, setVisualizerPattern] = useState<VisualizerTilePattern>(
    product.visualizerPattern ?? "STRAIGHT",
  );
  const [visualizerPatternCorner, setVisualizerPatternCorner] = useState<VisualizerTileCorner>(product.visualizerPatternCorner ?? "TOP_RIGHT");
  const [roomTypes, setRoomTypes] = useState<RoomType[]>(product.roomTypes);
  const [image, setImage] = useState(product.image);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const skuFormatValid = isValidSku(sku);
  const skuCheck = useSkuAvailability(sku, skuFormatValid, product.id, open);
  const { data: collectionsData, loading: collectionsLoading, error: collectionsError, reload: reloadCollections } = useApi(
    async () => {
      if (!open) return undefined;
      const result = await collectionsApi.listAll();
      if (!result.items.some((item) => item.id === product.collectionId)) {
        result.items.push(await collectionsApi.get(product.collectionId));
      }
      return result;
    },
    [open, product.collectionId],
  );
  const collections = collectionsData?.items ?? [];
  const selectedCollection = collections.find((item) => item.id === collectionId);
  const tileArea = Number(selectedCollection?.tileAreaSqm ?? (collectionId === product.collectionId ? product.tileAreaSqm : 0));
  const collectionTitle = selectedCollection
    ? (isRw ? selectedCollection.titleRw ?? selectedCollection.title : selectedCollection.title)
    : product.collection
      ? (isRw ? product.collection.titleRw ?? product.collection.title : product.collection.title)
      : product.size;

  const toggleRoomType = (option: RoomType) => {
    setRoomTypes((current) =>
      current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
    );
  };

  const parsedPrice = Number(price);
  const priceValid = isPositiveNumber(price);
  const parsedCoverage = Number(boxCoverageSqm);
  const parsedPieces = calculatePiecesPerBox(boxCoverageSqm, tileArea);
  const packagingValid = parsedPieces !== null;
  const nameValid = isValidName(name);
  const imageValid = !!imageFile || image.trim().length > 0;
  const collectionValid = !!collectionId && (collectionId === product.collectionId || !!selectedCollection);
  const descriptionValid = description.trim() === "" || isValidDescription(description);
  const fieldErrors: { id: string; message: string }[] = [];
  const addError = (id: string, key: string) => fieldErrors.push({ id, message: t(key) });
  if (!nameValid) addError("edit-name", "stock.newProduct.nameError");
  if (!skuFormatValid) addError("edit-sku", "stock.newProduct.skuError");
  if (!collectionValid) addError("edit-product-collection", "stock.newProduct.collectionRequired");
  if (!imageValid) addError("edit-image", "stock.newProduct.imageRequired");
  if (!packagingValid) addError("edit-box-coverage", isPositiveNumber(boxCoverageSqm) ? "stock.newProduct.boxCoveragePiecesError" : "stock.newProduct.boxCoverageError");
  if (!priceValid) addError("edit-price", "stock.newProduct.priceError");
  if (!descriptionValid) addError("edit-description", "stock.newProduct.descriptionError");
  if (roomTypes.length === 0) addError("edit-room-types", "stock.newProduct.roomTypesRequired");
  const errorFor = (id: string) => fieldErrors.find((error) => error.id === id)?.message;
  const skuStatusKey = !skuFormatValid ? "skuError" : skuCheck.status === "available" ? "skuAvailable" : skuCheck.status === "taken" ? "skuTaken" : skuCheck.status === "error" ? "skuCheckError" : "skuChecking";
  const errors = [...fieldErrors];
  if (skuFormatValid && skuCheck.status !== "available") errors.push({ id: "edit-sku", message: t(`stock.newProduct.${skuStatusKey}`) });
  const focusField = (id: string) => {
    const target = formRef.current?.querySelector<HTMLElement>(`#${id}`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.focus({ preventScroll: true });
  };

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const resetToProduct = () => {
    setSubmitAttempted(false);
    setName(isRw ? (product.nameRw ?? product.name) : product.name);
    setSku(product.sku.trim().toUpperCase());
    setCollectionId(product.collectionId);
    setBoxCoverageSqm(String(product.boxCoverageSqm));
    setPrice(String(product.price));
    setDescription(isRw ? (product.descriptionRw ?? product.description ?? "") : (product.description ?? ""));
    setSuitableFor(product.suitableFor);
    setVisualizerPattern(product.visualizerPattern ?? "STRAIGHT");
    setVisualizerPatternCorner(product.visualizerPatternCorner ?? "TOP_RIGHT");
    setRoomTypes(product.roomTypes);
    setImage(product.image);
    setImageFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitAttempted(true);
    if (fieldErrors.length > 0 || parsedPieces === null) {
      focusField(fieldErrors[0]?.id ?? "edit-box-coverage");
      return;
    }
    setSubmitting(true);
    try {
      if (await skuCheck.check() !== "available") {
        requestAnimationFrame(() => focusField("edit-sku"));
        return;
      }
      const uploaded = imageFile ? await productsApi.uploadImage(imageFile) : null;
      await productsApi.update(product.id, {
        ...(isRw
          ? { nameRw: name.trim(), descriptionRw: description.trim() || undefined }
          : { name: name.trim(), description: description.trim() || undefined }),
        sku: sku.trim().toUpperCase(),
        collectionId,
        boxCoverageSqm: parsedCoverage,
        piecesPerBox: parsedPieces,
        price: parsedPrice,
        suitableFor,
        visualizerPattern,
        visualizerPatternCorner,
        roomTypes,
        image: uploaded?.path ?? image,
      });
      onUpdated();
      toast.success(t("staff.editProduct.toastUpdatedTitle"), {
        description: t("staff.editProduct.toastUpdatedBody", { name: name.trim() }),
      });
      setOpen(false);
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "products.skuInUse") {
        skuCheck.markTaken();
        requestAnimationFrame(() => focusField("edit-sku"));
      }
      toast.error(t("staff.editProduct.toastFailedTitle"), {
        description: cause instanceof ApiError ? cause.message : t("staff.editProduct.toastTryAgain"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (submitting) return;
        setOpen(next);
        if (next) resetToProduct();
      }}
    >
      <DialogTrigger
        render={
          trigger ?? (
            <Button
              type="button"
              variant="outline"
              className="h-12 gap-2 border border-[#E8E8E8] text-sm font-semibold"
            />
          )
        }
      >
        {!trigger && (
          <>
            <Pencil className="size-4 stroke-2.5" />
            {t("staff.editProduct.trigger")}
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("staff.editProduct.title")}</DialogTitle>
          <DialogDescription>
            {t("staff.editProduct.description")}
          </DialogDescription>
        </DialogHeader>

        {isRw && (
          <p className="mt-4 rounded-lg bg-amber/10 px-3 py-2 text-xs font-medium text-ink">
            {t("staff.editProduct.editingRwHint")}
          </p>
        )}

        <form ref={formRef} noValidate onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }}>
          <fieldset disabled={submitting} className="min-w-0">
            <div className="mt-5 space-y-4">
              <p className="text-xs text-muted-foreground">{t("staff.editProduct.requiredFieldsHint")}</p>
              {submitAttempted && errors.length > 0 && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
                  <p className="text-sm font-semibold">{t("stock.newProduct.checkFieldsTitle")}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                    {errors.map((error) => <li key={error.id}><button type="button" onClick={() => focusField(error.id)} className="text-left underline">{error.message}</button></li>)}
                  </ul>
                </div>
              )}
              <Field>
                <FieldLabel htmlFor="edit-name">{t("staff.editProduct.name")} <RequiredAsterisk show /></FieldLabel>
                <Input id="edit-name" required aria-invalid={!nameValid} aria-describedby={!nameValid ? "edit-name-error" : undefined} value={name} onChange={(event) => setName(event.target.value)} />
                {!nameValid && (
                  <p id="edit-name-error" className="text-xs font-medium text-red-600">{errorFor("edit-name")}</p>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="edit-sku">{t("staff.editProduct.sku")} <RequiredAsterisk show /></FieldLabel>
                <div className="relative">
                  <Input id="edit-sku" required value={sku} className="pr-10" aria-invalid={!skuFormatValid || skuCheck.status === "taken" || skuCheck.status === "error"} aria-describedby="edit-sku-help" onChange={(event) => setSku(event.target.value.toUpperCase())} />
                  {skuFormatValid && skuCheck.status === "checking" && <Loader2 aria-hidden="true" className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
                  {skuFormatValid && skuCheck.status === "available" && <CheckCircle2 aria-hidden="true" className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-green-600" />}
                </div>
                <p id="edit-sku-help" aria-live="polite" className={cn("text-xs", !skuFormatValid || skuCheck.status === "taken" || skuCheck.status === "error" ? "font-medium text-red-600" : skuCheck.status === "available" ? "text-green-600" : "text-muted-foreground")}>
                  {t(`stock.newProduct.${skuStatusKey}`)}
                </p>
                {skuCheck.status === "error" && <button type="button" onClick={skuCheck.retry} className="w-fit text-xs font-semibold underline">{t("stock.newProduct.retrySku")}</button>}
              </Field>

              <Field>
                <FieldLabel htmlFor="edit-product-collection">{t("stock.newProduct.collection")} <RequiredAsterisk show /></FieldLabel>
                <Select
                  value={collectionId}
                  onValueChange={(value) => setCollectionId(value ?? product.collectionId)}
                  disabled={collectionsLoading || !!collectionsError || submitting}
                >
                  <SelectTrigger id="edit-product-collection" aria-required="true" aria-invalid={!collectionValid} aria-describedby={!collectionValid ? "edit-collection-error" : undefined} className="text-sm">
                    <SelectValue>{collectionTitle}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {isRw ? item.titleRw ?? item.title : item.title} · {item.size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t("stock.newProduct.tileSizeForCollection")} {selectedCollection?.size ?? product.size}
                </p>
                {!collectionValid && <p id="edit-collection-error" className="text-xs font-medium text-red-600">{errorFor("edit-product-collection")}</p>}
                {collectionsError && <ApiErrorState message={collectionsError} onRetry={reloadCollections} />}
              </Field>

              <Field>
                <FieldLabel htmlFor="edit-product-image">{t("staff.editProduct.image")} <RequiredAsterisk show /></FieldLabel>
                <div id="edit-image" tabIndex={-1} aria-describedby={!imageValid ? "edit-image-error" : undefined} className="mt-1">
                  {previewUrl || image ? (
                    <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-muted-background">
                      <Image src={previewUrl ?? image} alt={t("staff.editProduct.previewAlt", { name: name || "Product" })} fill unoptimized className="object-cover" />
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon-sm"
                        onClick={() => { setImageFile(null); setImage(""); setPreviewUrl(null); }}
                        className="absolute top-3 right-3 rounded-full bg-white/95 text-ink shadow-sm"
                        aria-label={t("staff.editProduct.removeImageAria")}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => inputRef.current?.click()} className="flex aspect-4/3 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/40 text-center hover:bg-secondary/60">
                      <span className="flex size-11 items-center justify-center rounded-full bg-white text-ink shadow-sm"><ImagePlus className="size-5" /></span>
                      <span className="text-sm font-semibold text-ink">{t("staff.editProduct.chooseImage")}</span>
                      <span className="text-xs text-muted-foreground">{t("staff.editProduct.imageHint")}</span>
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
                      event.target.value = "";
                      if (!file) return;
                      setImageFile(file);
                      setPreviewUrl(file ? URL.createObjectURL(file) : null);
                    }}
                  />
                </div>
                {!imageValid && <p id="edit-image-error" className="text-xs font-medium text-red-600">{errorFor("edit-image")}</p>}
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="edit-box-coverage">{t("staff.editProduct.boxCoverage")} <RequiredAsterisk show /></FieldLabel>
                  <DecimalInput id="edit-box-coverage" required aria-invalid={!packagingValid} aria-describedby={!packagingValid ? "edit-coverage-error" : undefined} value={boxCoverageSqm} onChange={(event) => setBoxCoverageSqm(event.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-pieces-per-box">{t("staff.editProduct.piecesPerBox")}</FieldLabel>
                  <Input id="edit-pieces-per-box" value={parsedPieces ?? ""} placeholder={t("stock.newProduct.autoFilled")} readOnly aria-readonly="true" className="bg-secondary/40" />
                  <p className="text-xs text-muted-foreground">
                    {tileArea > 0
                      ? t("stock.newProduct.piecesHintWithArea", { area: tileArea })
                      : t("stock.newProduct.piecesHintNoCollection")}
                  </p>
                </Field>
              </div>
              {!packagingValid && <p id="edit-coverage-error" className="text-xs font-medium text-red-600">{errorFor("edit-box-coverage")}</p>}

              <Field>
                <FieldLabel htmlFor="edit-price">{t("staff.editProduct.price")} <RequiredAsterisk show /></FieldLabel>
                <div className="relative">
                  <Wallet
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                  <DecimalInput
                    id="edit-price"
                    required
                    aria-invalid={!priceValid}
                    aria-describedby={!priceValid ? "edit-price-error" : undefined}
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    className="pl-11"
                  />
                </div>
                {!priceValid && (
                  <p id="edit-price-error" className="text-xs font-medium text-red-600">{errorFor("edit-price")}</p>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="edit-description">{t("staff.editProduct.descriptionLabel")}</FieldLabel>
                <Textarea
                  id="edit-description"
                  aria-invalid={!descriptionValid}
                  aria-describedby={!descriptionValid ? "edit-description-error" : undefined}
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={t("staff.editProduct.descriptionPlaceholder")}
                />
                {!descriptionValid && <p id="edit-description-error" className="text-xs font-medium text-red-600">{errorFor("edit-description")}</p>}
              </Field>

              <div>
                <FieldLabel className="text-sm font-medium text-ink">{t("staff.editProduct.suitableFor")}</FieldLabel>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SUITABLE_FOR_KEYS.map((option) => (
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
                      {t(option.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <FieldLabel id="edit-room-types-label" className="text-sm font-medium text-ink">{t("staff.editProduct.roomTypes")} <RequiredAsterisk show /></FieldLabel>
                <p className="mt-0.5 text-xs text-muted-foreground">{t("staff.editProduct.roomTypesHint")}</p>
                <div id="edit-room-types" tabIndex={-1} role="group" aria-labelledby="edit-room-types-label" aria-describedby={roomTypes.length === 0 ? "edit-room-types-error" : undefined} className="mt-2 flex flex-wrap gap-2">
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
                        {t(ROOM_TYPE_KEYS[option])}
                      </button>
                    );
                  })}
                </div>
                {roomTypes.length === 0 && <p id="edit-room-types-error" className="mt-1 text-xs font-medium text-red-600">{errorFor("edit-room-types")}</p>}
              </div>

              <div>
                <FieldLabel className="text-sm font-medium text-ink">{t("staff.editProduct.visualizerPattern")}</FieldLabel>
                <p className="mt-0.5 text-xs text-muted-foreground">{t("staff.editProduct.visualizerPatternHint")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {VISUALIZER_PATTERN_KEYS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setVisualizerPattern(option.value)}
                      aria-pressed={visualizerPattern === option.value}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
                        visualizerPattern === option.value
                          ? "border-primary bg-primary text-ink"
                          : "border-border bg-transparent text-muted-foreground hover:bg-secondary",
                      )}
                    >
                      {visualizerPattern === option.value && <Check className="size-3.5" />}
                      {t(option.labelKey)}
                    </button>
                  ))}
                </div>
                {visualizerPattern === "QUARTER_TURN" && (
                  <TilePatternCornerField value={visualizerPatternCorner} onChange={setVisualizerPatternCorner} />
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting} className="h-10 px-5 text-sm font-bold">
                {t("staff.editProduct.cancel")}
              </Button>
              <Button type="submit" disabled={submitting} className="h-10 px-5 text-sm font-bold disabled:opacity-60">
                {submitting ? t("staff.editProduct.saving") : t("staff.editProduct.save")}
              </Button>
            </DialogFooter>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
};
