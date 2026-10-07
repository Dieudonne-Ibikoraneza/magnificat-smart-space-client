"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  Bold,
  Boxes,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  ImagePlus,
  Layers3,
  Loader2,
  Ruler,
  Save,
  Sparkles,
  Tag,
  Wallet,
  X,
} from "lucide-react";
import { DashboardDetailHeader } from "@/components/dashboard-page-headers";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, RequiredAsterisk } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { useSkuAvailability, type SkuAvailability } from "@/lib/use-sku-availability";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { collectionsApi, productsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/lib/api/use-api";
import type { RoomType, SuitableFor, VisualizerTilePattern } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import {
  calculatePiecesPerBox,
  isNonNegativeNumber,
  isPositiveNumber,
  isValidDescription,
  isValidName,
  isValidSku,
  validateNewProduct,
  type ProductField,
  type ProductFieldError,
} from "@/lib/product-validation";
import { TilePatternCornerField } from "@/components/tile-pattern-corner-field";
import type { VisualizerTileCorner } from "@/lib/api/types";

const ROOM_TYPE_KEYS: Record<RoomType, string> = {
  LIVING_ROOM: "catalog.roomTypes.livingRoom",
  BEDROOM: "catalog.roomTypes.bedroom",
  BATHROOM: "catalog.roomTypes.bathroom",
  KITCHEN: "catalog.roomTypes.kitchen",
};
const roomTypeOptions = Object.keys(ROOM_TYPE_KEYS) as RoomType[];
const SUITABLE_FOR_KEYS: { value: SuitableFor; labelKey: string }[] = [
  { value: "FLOOR", labelKey: "stock.newProduct.floor" },
  { value: "WALL", labelKey: "stock.newProduct.wall" },
  { value: "BOTH", labelKey: "stock.newProduct.floorAndWall" },
];
const VISUALIZER_PATTERN_KEYS: { value: VisualizerTilePattern; labelKey: string }[] = [
  { value: "STRAIGHT", labelKey: "stock.newProduct.visualizerStraight" },
  { value: "TWO_TURN", labelKey: "stock.newProduct.visualizerTwoTurn" },
  { value: "QUARTER_TURN", labelKey: "stock.newProduct.visualizerQuarterTurn" },
];

const FIELD_LABEL_KEYS: Record<ProductField, string> = {
  image: "productImage", name: "name", sku: "sku", collection: "collection",
  roomTypes: "roomTypes", price: "price", boxCoverage: "boxCoverage",
  quantity: "initialStock", costPrice: "costPrice", description: "description",
};

const LOW_STOCK_THRESHOLD = 10;

const stockPreview = (quantity: number) => {
  if (quantity <= 0) return { labelKey: "stock.newProduct.stockOut", className: "border-red-200 bg-red-50 text-red-700" };
  if (quantity <= LOW_STOCK_THRESHOLD) return { labelKey: "stock.newProduct.stockLow", className: "border-amber/30 bg-amber-50 text-amber-700" };
  return { labelKey: "stock.newProduct.stockIn", className: "border-green-200 bg-green-50 text-green-700" };
};

const SkuField = ({
  value,
  onChange,
  availability,
  showErrors,
  onRetry,
}: {
  value: string;
  onChange: (value: string) => void;
  availability: SkuAvailability;
  showErrors: boolean;
  onRetry: () => void;
}) => {
  const { t } = useTranslation();
  const [touched, setTouched] = useState(false);
  const formatValid = isValidSku(value);
  const showFormatError = (touched || showErrors) && !formatValid;
  const valid = formatValid && availability === "available";

  return (
    <Field className="gap-1.5">
      <FieldLabel htmlFor="product-sku" className="text-sm font-medium text-ink">
        {t("stock.newProduct.sku")} <RequiredAsterisk show />
      </FieldLabel>
      <div className="relative">
        <ClipboardCheck
          aria-hidden="true"
          className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
          strokeWidth={1.5}
        />
        <Input
          className="h-11 pl-11 pr-10 text-sm"
          id="product-sku"
          required
          aria-describedby="product-sku-help"
          placeholder={t("stock.newProduct.skuPlaceholder")}
          value={value}
          aria-invalid={showFormatError || (formatValid && (availability === "taken" || availability === "error"))}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          onBlur={() => setTouched(true)}
        />
        {formatValid && availability === "checking" && (
          <Loader2
            aria-hidden="true"
            className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
          />
        )}
        {valid && value.trim() !== "" && (
          <CheckCircle2
            aria-hidden="true"
            className="absolute right-3.5 top-1/2 size-4.5 -translate-y-1/2 text-green-600"
            strokeWidth={2}
          />
        )}
        {formatValid && availability === "taken" && (
          <X aria-hidden="true" className="absolute right-3.5 top-1/2 size-4.5 -translate-y-1/2 text-red-600" strokeWidth={2} />
        )}
      </div>
      {showFormatError ? (
        <p id="product-sku-help" aria-live="polite" className="text-xs font-medium text-red-600">{t("stock.newProduct.skuError")}</p>
      ) : formatValid && availability === "taken" ? (
        <p id="product-sku-help" aria-live="polite" className="text-xs font-medium text-red-600">{t("stock.newProduct.skuTaken")}</p>
      ) : formatValid && availability === "checking" ? (
        <p id="product-sku-help" aria-live="polite" className="text-xs text-muted-foreground">{t("stock.newProduct.skuChecking")}</p>
      ) : valid ? (
        <p id="product-sku-help" aria-live="polite" className="text-xs font-medium text-green-600">{t("stock.newProduct.skuAvailable")}</p>
      ) : formatValid && availability === "error" ? (
        <p id="product-sku-help" aria-live="polite" className="text-xs text-muted-foreground">{t("stock.newProduct.skuCheckError")}</p>
      ) : (
        <p id="product-sku-help" aria-live="polite" className="text-xs text-muted-foreground">{t("stock.newProduct.skuHint")}</p>
      )}
      {availability === "error" && <button type="button" onClick={onRetry} className="w-fit text-xs font-semibold text-primary underline">{t("stock.newProduct.retrySku")}</button>}
    </Field>
  );
};

type FieldProps = {
  id: string;
  showErrors: boolean;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  isValid: (value: string) => boolean;
  errorMessage: string;
  icon?: typeof Tag;
  type?: string;
  hint?: string;
  onBlurTransform?: (value: string) => string;
  required?: boolean;
};

const ValidatedInput = ({
  id,
  showErrors,
  label,
  placeholder,
  value,
  onChange,
  isValid,
  errorMessage,
  icon: Icon,
  type = "text",
  hint,
  onBlurTransform,
  required = true,
}: FieldProps) => {
  const FieldInput = type === "number" ? DecimalInput : Input;
  const [touched, setTouched] = useState(false);
  const valid = isValid(value);
  const showError = !valid && (touched || showErrors || value.length > 0);

  return (
    <Field className="gap-1.5">
      <FieldLabel htmlFor={id} className="text-sm font-medium text-ink">
        {label} {required && <RequiredAsterisk show />}
      </FieldLabel>
      <div className="relative">
        {Icon && (
          <Icon
            aria-hidden="true"
            className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
            strokeWidth={1.5}
          />
        )}
        <FieldInput
          className={cn("h-11 text-sm", Icon ? "pl-11" : "pl-3.5", "pr-10")}
          placeholder={placeholder}
          id={id}
          required={required}
          aria-describedby={showError || hint ? `${id}-help` : undefined}
          value={value}
          aria-invalid={showError}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => {
            setTouched(true);
            if (onBlurTransform) onChange(onBlurTransform(value));
          }}
        />
        {valid && value.trim() !== "" && (
          <CheckCircle2
            aria-hidden="true"
            className="absolute right-3.5 top-1/2 size-4.5 -translate-y-1/2 text-green-600"
            strokeWidth={2}
          />
        )}
      </div>
      {showError ? (
        <p id={`${id}-help`} className="text-xs font-medium text-red-600">{errorMessage}</p>
      ) : hint ? (
        <p id={`${id}-help`} className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </Field>
  );
};

const ImageDropzone = ({
  previewUrl,
  onSelect,
  onClear,
  showError,
  disabled,
}: {
  previewUrl: string | null;
  onSelect: (file: File) => void;
  onClear: () => void;
  showError: boolean;
  disabled: boolean;
}) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (disabled) return;
    if (!file || !file.type.startsWith("image/")) {
      toast.error(t("stock.newProduct.unsupportedFile"), { description: t("stock.newProduct.unsupportedFileBody") });
      return;
    }
    onSelect(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  return (
    <div>
      {previewUrl ? (
        <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-muted-background">
          <Image src={previewUrl} alt={t("stock.newProduct.productPreviewAlt")} fill unoptimized className="object-cover" />
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            onClick={onClear}
            aria-label={t("stock.newProduct.removeImageAria")}
            className="absolute top-3 right-3 rounded-full bg-white/95 text-ink shadow-sm hover:bg-white"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <div
          id="product-image"
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          aria-labelledby="product-image-label"
          aria-describedby={showError ? "product-image-error" : undefined}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex aspect-4/3 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-center transition-colors",
            showError ? "border-red-600 bg-red-50" : dragging ? "border-primary bg-primary/5" : "border-border bg-secondary/40 hover:bg-secondary/60",
          )}
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-white text-ink shadow-sm">
            <ImagePlus className="size-5" strokeWidth={1.8} />
          </span>
          <p className="text-sm font-semibold text-ink">{t("stock.newProduct.clickToUpload")}</p>
          <p className="text-xs text-muted-foreground">{t("stock.newProduct.imageHint")}</p>
        </div>
      )}
      {showError && <p id="product-image-error" className="mt-1.5 text-xs font-medium text-red-600">{t("stock.newProduct.imageRequired")}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        required
        aria-labelledby="product-image-label"
        aria-invalid={showError}
        aria-describedby={showError ? "product-image-error" : undefined}
        className="sr-only"
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          handleFile(event.target.files?.[0]);
          // Selecting the same image again after clearing it must fire change.
          event.target.value = "";
        }}
      />
    </div>
  );
};

/** Renders text where **double-asterisk** spans are shown bold. */
const renderBoldPreview = (value: string) =>
  value.split(/(\*\*[^*]+\*\*)/g).map((chunk, index) =>
    chunk.startsWith("**") && chunk.endsWith("**") && chunk.length > 4 ? (
      <strong key={index} className="font-bold text-ink">
        {chunk.slice(2, -2)}
      </strong>
    ) : (
      <span key={index}>{chunk}</span>
    ),
  );

const BoldTextarea = ({
  value,
  onChange,
  placeholder,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  invalid: boolean;
}) => {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const toggleBold = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    const selected = value.slice(selectionStart, selectionEnd);
    const before = value.slice(0, selectionStart);
    const after = value.slice(selectionEnd);

    const alreadyBold = before.endsWith("**") && after.startsWith("**");
    let next: string;
    let cursorStart: number;
    let cursorEnd: number;

    if (alreadyBold) {
      next = before.slice(0, -2) + selected + after.slice(2);
      cursorStart = selectionStart - 2;
      cursorEnd = selectionEnd - 2;
    } else if (selected.length > 0) {
      next = `${before}**${selected}**${after}`;
      cursorStart = selectionStart + 2;
      cursorEnd = selectionEnd + 2;
    } else {
      next = `${before}****${after}`;
      cursorStart = selectionStart + 2;
      cursorEnd = selectionStart + 2;
    }

    onChange(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  return (
    <div>
      <div className="flex items-center gap-1 rounded-t-md border border-b-0 border-input bg-secondary/40 px-2 py-1.5">
        <button
          type="button"
          onClick={toggleBold}
          aria-label={t("stock.newProduct.boldAria")}
          className="inline-flex size-7 items-center justify-center rounded text-ink hover:bg-secondary"
        >
          <Bold className="size-4" strokeWidth={2.25} />
        </button>
        <span className="ml-1 text-xs text-muted-foreground">{t("stock.newProduct.boldToolbarHint")}</span>
      </div>
      <Textarea
        id="product-description"
        aria-labelledby="product-description-label"
        aria-invalid={invalid}
        aria-describedby={invalid ? "product-description-error" : undefined}
        required
        ref={textareaRef}
        className="min-h-28 rounded-t-none text-sm"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
            event.preventDefault();
            toggleBold();
          }
        }}
      />
      {value.includes("**") && (
        <div className="mt-2 rounded-md border border-border bg-secondary/30 p-3 text-sm text-ink">
          {renderBoldPreview(value)}
        </div>
      )}
    </div>
  );
};

export const RegisterProductForm = ({ role }: { role: "admin" }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inventoryPath = `/${role}/inventory`;
  const formRef = useRef<HTMLFormElement>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const { data: collectionsData } = useApi(() => collectionsApi.listAll());
  const collections = (collectionsData?.items ?? []).filter((collection) => collection.isActive);
  const requestedCollectionId = searchParams.get("collectionId");

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [suitableFor, setSuitableFor] = useState<SuitableFor>("BOTH");
  const [visualizerPattern, setVisualizerPattern] = useState<VisualizerTilePattern>("STRAIGHT");
  const [visualizerPatternCorner, setVisualizerPatternCorner] = useState<VisualizerTileCorner>("TOP_RIGHT");
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [price, setPrice] = useState("");
  const [boxCoverage, setBoxCoverage] = useState("");
  const [quantity, setQuantity] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const effectiveCollectionId =
    collectionId ||
    (requestedCollectionId && collections.some((item) => item.id === requestedCollectionId)
      ? requestedCollectionId
      : "");

  const toggleRoomType = (option: RoomType) => {
    setRoomTypes((current) =>
      current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
    );
  };

  const handleImageSelect = (file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  const skuFormatValid = isValidSku(sku);
  const skuCheck = useSkuAvailability(sku, skuFormatValid);
  const skuAvailability = skuCheck.status;

  const selectedCollection = collections.find((item) => item.id === effectiveCollectionId) ?? null;
  const tileArea = selectedCollection ? Number(selectedCollection.tileAreaSqm) : null;
  const piecesPerBox = calculatePiecesPerBox(boxCoverage, tileArea);
  const quantityValue = isNonNegativeNumber(quantity) ? Number(quantity) : null;
  const status = quantityValue !== null ? stockPreview(quantityValue) : null;
  const costRequired = isPositiveNumber(quantity);
  const fieldErrors = validateNewProduct({
    imageSelected: imageFile !== null, name, sku, collectionSelected: selectedCollection !== null,
    roomTypeCount: roomTypes.length, price, boxCoverage, tileArea, quantity, costPrice, description,
  });
  const errors: ProductFieldError[] = [...fieldErrors];
  if (skuFormatValid && skuAvailability !== "available") errors.push({ field: "sku", messageKey: `stock.newProduct.${skuAvailability === "taken" ? "skuTaken" : skuAvailability === "error" ? "skuCheckError" : "skuChecking"}` });
  const errorFor = (field: ProductField) => fieldErrors.find((error) => error.field === field);
  const focusField = (field: ProductField) => {
    const target = formRef.current?.querySelector<HTMLElement>(`#product-${field}`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.focus({ preventScroll: true });
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitAttempted(true);
    if (fieldErrors.length > 0 || !imageFile || !selectedCollection || piecesPerBox === null) {
      focusField(fieldErrors[0]?.field ?? "boxCoverage");
      toast.error(t("stock.newProduct.checkFieldsTitle"), {
        description: t("stock.newProduct.checkFieldsBody"),
      });
      return;
    }

    setSubmitting(true);
    try {
      // Recheck before uploading; another user may have claimed the SKU since typing.
      if (await skuCheck.check() !== "available") {
        requestAnimationFrame(() => focusField("sku"));
        return;
      }
      const uploaded = await productsApi.uploadImage(imageFile);
      await productsApi.create({
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        collectionId: selectedCollection.id,
        boxCoverageSqm: Number(boxCoverage),
        piecesPerBox,
        price: Number(price),
        image: uploaded.path,
        description: description.trim(),
        suitableFor,
        visualizerPattern,
        visualizerPatternCorner,
        roomTypes,
        initialAreaSqm: quantityValue ?? undefined,
        initialCostPrice: costRequired ? Number(costPrice) : undefined,
      });
      toast.success(t("stock.newProduct.toastRegisteredTitle"), {
        description: t("stock.newProduct.toastRegisteredBody", { name: name.trim(), sku: sku.trim().toUpperCase() }),
      });
      router.push(inventoryPath);
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "products.skuInUse") {
        skuCheck.markTaken();
        requestAnimationFrame(() => focusField("sku"));
      }
      toast.error(t("stock.newProduct.toastFailedTitle"), {
        description: cause instanceof ApiError ? cause.message : t("stock.newProduct.toastTryAgain"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <DashboardDetailHeader
        breadcrumbs={[
          { label: t("stock.newProduct.crumbOverview"), href: `/${role}/overview` },
          { label: t("stock.newProduct.crumbInventory"), href: inventoryPath },
          { label: t("stock.newProduct.crumbRegister") },
        ]}
        title={t("stock.newProduct.title")}
        actions={
          <Button type="button" variant="outline" onClick={() => router.push(inventoryPath)} className="h-11 px-5 text-sm font-bold">
            {t("stock.newProduct.cancel")}
          </Button>
        }
      />

      <form
        ref={formRef}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <fieldset disabled={submitting} className="min-w-0 space-y-5 sm:space-y-6">
          <p className="text-sm text-muted-foreground">{t("stock.newProduct.requiredFieldsHint")}</p>
          {submitAttempted && errors.length > 0 && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              <p className="font-semibold">{t("stock.newProduct.checkFieldsTitle")}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {errors.map((error) => (
                  <li key={error.field}>
                    <button type="button" onClick={() => focusField(error.field)} className="text-left underline underline-offset-2">
                      {t(`stock.newProduct.${FIELD_LABEL_KEYS[error.field]}`)}: {t(error.messageKey)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid items-start gap-5 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_1.4fr]">
            <section className="rounded-2xl bg-card p-5 sm:p-6">
              <h2 id="product-image-label" className="text-lg font-bold text-ink">
                {t("stock.newProduct.productImage")} <RequiredAsterisk show />
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("stock.newProduct.productImageSub")}</p>
              <div className="mt-5">
                <ImageDropzone previewUrl={imagePreview} onSelect={handleImageSelect} onClear={clearImage} showError={submitAttempted && imageFile === null} disabled={submitting} />
              </div>
            </section>

            <section className="rounded-2xl bg-card p-5 sm:p-6">
              <h2 className="text-lg font-bold text-ink">{t("stock.newProduct.productDetails")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("stock.newProduct.productDetailsSub")}</p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <ValidatedInput
                  id="product-name"
                  showErrors={submitAttempted}
                  label={t("stock.newProduct.name")}
                  placeholder={t("stock.newProduct.namePlaceholder")}
                  value={name}
                  onChange={setName}
                  isValid={isValidName}
                  errorMessage={t("stock.newProduct.nameError")}
                  icon={Tag}
                />
                <SkuField value={sku} onChange={setSku} availability={skuAvailability} showErrors={submitAttempted} onRetry={skuCheck.retry} />
                <Field className="gap-1.5 sm:col-span-2">
                  <FieldLabel htmlFor="product-collection" className="text-sm font-medium text-ink">
                    {t("stock.newProduct.collection")} <RequiredAsterisk show />
                  </FieldLabel>
                  <Select value={effectiveCollectionId} onValueChange={(value) => setCollectionId(value ?? "")}>
                    <SelectTrigger id="product-collection" aria-required="true" aria-invalid={submitAttempted && !selectedCollection} aria-describedby={submitAttempted && !selectedCollection ? "product-collection-error" : undefined} className="h-11 text-sm">
                      <SelectValue>
                        {(value) => collections.find((item) => item.id === value)?.title ?? t("stock.newProduct.selectCollection")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {collections.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {submitAttempted && !selectedCollection && <p id="product-collection-error" className="text-xs font-medium text-red-600">{t("stock.newProduct.collectionRequired")}</p>}
                </Field>
              </div>

              {selectedCollection && (
                <div className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-secondary/40 p-4">
                  <Ruler className="size-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {t("stock.newProduct.tileSizeForCollection")} <span className="font-bold text-ink">{selectedCollection.size}</span>
                  </p>
                </div>
              )}

              <div className="mt-6 border-t border-border pt-5">
                <FieldLabel className="text-sm font-medium text-ink">{t("stock.newProduct.suitableFor")}</FieldLabel>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {SUITABLE_FOR_KEYS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSuitableFor(option.value)}
                      aria-pressed={suitableFor === option.value}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
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

              <div className="mt-5">
                <FieldLabel className="text-sm font-medium text-ink">{t("stock.newProduct.visualizerPattern")}</FieldLabel>
                <p className="mt-0.5 text-xs text-muted-foreground">{t("stock.newProduct.visualizerPatternHint")}</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {VISUALIZER_PATTERN_KEYS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setVisualizerPattern(option.value)}
                      aria-pressed={visualizerPattern === option.value}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
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

              <div className="mt-5">
                <FieldLabel className="text-sm font-medium text-ink">
                  <span id="product-roomTypes-label">{t("stock.newProduct.roomTypes")}</span> <RequiredAsterisk show />
                </FieldLabel>
                <p className="mt-0.5 text-xs text-muted-foreground">{t("stock.newProduct.roomTypesHint")}</p>
                <div id="product-roomTypes" role="group" tabIndex={-1} aria-labelledby="product-roomTypes-label" aria-describedby={submitAttempted && roomTypes.length === 0 ? "product-roomTypes-error" : undefined} className="mt-2.5 flex flex-wrap gap-2">
                  {roomTypeOptions.map((option) => {
                    const checked = roomTypes.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleRoomType(option)}
                        aria-pressed={checked}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
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
                {submitAttempted && roomTypes.length === 0 && <p id="product-roomTypes-error" className="mt-1.5 text-xs font-medium text-red-600">{t("stock.newProduct.roomTypesRequired")}</p>}
              </div>
            </section>
          </div>

          <div className="grid items-start gap-5 sm:gap-6 xl:grid-cols-[1.6fr_1fr]">
            <section className="rounded-2xl bg-card p-5 sm:p-6">
              <h2 className="text-lg font-bold text-ink">{t("stock.newProduct.priceBoxCoverage")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("stock.newProduct.priceBoxCoverageSub")}
              </p>
              <div className="mt-5 grid gap-5 sm:grid-cols-3">
                <ValidatedInput
                  id="product-price"
                  showErrors={submitAttempted}
                  label={t("stock.newProduct.price")}
                  placeholder={t("stock.newProduct.pricePlaceholder")}
                  type="number"
                  value={price}
                  onChange={setPrice}
                  isValid={isPositiveNumber}
                  errorMessage={t("stock.newProduct.priceError")}
                  icon={Wallet}
                />
                <ValidatedInput
                  id="product-boxCoverage"
                  showErrors={submitAttempted}
                  label={t("stock.newProduct.boxCoverage")}
                  placeholder={t("stock.newProduct.boxCoveragePlaceholder")}
                  type="number"
                  value={boxCoverage}
                  onChange={setBoxCoverage}
                  isValid={(value) => isPositiveNumber(value) && (!selectedCollection || calculatePiecesPerBox(value, tileArea) !== null)}
                  errorMessage={t(errorFor("boxCoverage")?.messageKey ?? "stock.newProduct.boxCoverageError")}
                  hint={!selectedCollection ? t("stock.newProduct.boxCoverageHint") : undefined}
                  icon={Layers3}
                />
                <Field className="gap-1.5">
                  <FieldLabel className="text-sm font-medium text-ink">{t("stock.newProduct.piecesPerBox")}</FieldLabel>
                  <div className="relative">
                    <Boxes
                      aria-hidden="true"
                      className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
                      strokeWidth={1.5}
                    />
                    <Input
                      className="h-11 bg-secondary/40 pl-11 text-sm font-bold"
                      value={piecesPerBox !== null ? t("stock.newProduct.piecesValue", { count: piecesPerBox }) : ""}
                      placeholder={t("stock.newProduct.autoFilled")}
                      readOnly
                      disabled
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tileArea
                      ? t("stock.newProduct.piecesHintWithArea", { area: tileArea })
                      : t("stock.newProduct.piecesHintNoCollection")}
                  </p>
                </Field>
              </div>
            </section>

            <section className="rounded-2xl bg-card p-5 sm:p-6">
              <h2 className="text-lg font-bold text-ink">{t("stock.newProduct.inventory")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("stock.newProduct.inventorySub")}</p>
              <div className="mt-5 grid gap-5">
                <ValidatedInput
                  id="product-quantity"
                  showErrors={submitAttempted}
                  label={t("stock.newProduct.initialStock")}
                  placeholder={t("stock.newProduct.initialStockPlaceholder")}
                  type="number"
                  value={quantity}
                  onChange={setQuantity}
                  isValid={isNonNegativeNumber}
                  errorMessage={t("stock.newProduct.initialStockError")}
                  icon={Sparkles}
                />
                <ValidatedInput
                  id="product-costPrice"
                  showErrors={submitAttempted}
                  label={t("stock.newProduct.costPrice")}
                  placeholder={t("stock.newProduct.costPricePlaceholder")}
                  type="number"
                  value={costPrice}
                  onChange={setCostPrice}
                  isValid={(value) => (!costRequired && value.trim() === "") || isPositiveNumber(value)}
                  errorMessage={t(costRequired ? "stock.newProduct.costPriceRequired" : "stock.newProduct.costPriceError")}
                  hint={t("stock.newProduct.costPriceHint")}
                  icon={Coins}
                  required={costRequired}
                />
                {status && (
                  <span
                    className={cn(
                      "inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold uppercase",
                      status.className,
                    )}
                  >
                    {t(status.labelKey)}
                  </span>
                )}
              </div>
            </section>
          </div>

          <section className="rounded-2xl bg-card p-5 sm:p-6">
            <h2 id="product-description-label" className="text-lg font-bold text-ink">
              {t("stock.newProduct.description")} <RequiredAsterisk show />
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("stock.newProduct.descriptionSub")}</p>
            <div className="mt-5">
              <BoldTextarea
                placeholder={t("stock.newProduct.descriptionPlaceholder")}
                value={description}
                onChange={setDescription}
                invalid={(submitAttempted || description.length > 0) && !isValidDescription(description)}
              />
              {(submitAttempted || description.length > 0) && !isValidDescription(description) && (
                <p id="product-description-error" className="mt-1.5 text-xs font-medium text-red-600">{t("stock.newProduct.descriptionError")}</p>
              )}
            </div>
          </section>

          <div className="flex flex-col-reverse items-stretch gap-3 pb-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => router.push(inventoryPath)} className="h-12 px-6 text-sm font-bold">
              {t("stock.newProduct.cancel")}
            </Button>
            <Button type="submit" disabled={submitting} className="h-12 gap-2 px-6 text-sm font-bold disabled:opacity-60">
              <Save className="size-4" />
              {submitting ? t("stock.newProduct.registering") : t("stock.newProduct.register")}
            </Button>
          </div>
        </fieldset>
      </form>
    </>
  );
};
