/** Accept decimal amounts only; Number alone also accepts Infinity, hex and exponent notation. */
const DECIMAL_AMOUNT = /^(?:\d+(?:\.\d*)?|\.\d+)$/;

/** Allow clearing and intermediate decimal edits, but block letters, signs and extra decimal points. */
export const isDecimalInput = (value: string): boolean => /^\d*(?:\.\d*)?$/.test(value);

export const isNonNegativeNumber = (value: string): boolean =>
  DECIMAL_AMOUNT.test(value.trim()) && Number.isFinite(Number(value));

export const isPositiveNumber = (value: string): boolean =>
  isNonNegativeNumber(value) && Number(value) > 0;

export const isValidName = (value: string): boolean =>
  value.trim().length >= 2 && value.trim().length <= 120;

export const isValidSku = (value: string): boolean =>
  /^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(value.trim()) &&
  value.trim().length >= 3 && value.trim().length <= 24;

export const isValidDescription = (value: string): boolean => value.trim().length >= 10;

/** Keep the catalog's rounded piece conversion, but never derive zero or non-finite pieces. */
export const calculatePiecesPerBox = (coverage: string, tileArea: number | null): number | null => {
  if (!isPositiveNumber(coverage) || tileArea === null || !Number.isFinite(tileArea) || tileArea <= 0) return null;
  const ratio = Number(coverage) / tileArea;
  const pieces = Math.round(ratio);
  return ratio >= 1 - 1e-6 && Number.isSafeInteger(pieces) && pieces > 0 ? pieces : null;
};

export type ProductField = "image" | "name" | "sku" | "collection" | "roomTypes" | "price" | "boxCoverage" | "quantity" | "costPrice" | "description";
export type ProductFieldError = { field: ProductField; messageKey: string };

export const validateNewProduct = (values: {
  imageSelected: boolean;
  name: string;
  sku: string;
  collectionSelected: boolean;
  roomTypeCount: number;
  price: string;
  boxCoverage: string;
  tileArea: number | null;
  quantity: string;
  costPrice: string;
  description: string;
}): ProductFieldError[] => {
  const errors: ProductFieldError[] = [];
  const add = (field: ProductField, key: string) => errors.push({ field, messageKey: `stock.newProduct.${key}` });
  if (!values.imageSelected) add("image", "imageRequired");
  if (!isValidName(values.name)) add("name", "nameError");
  if (!isValidSku(values.sku)) add("sku", "skuError");
  if (!values.collectionSelected) add("collection", "collectionRequired");
  if (values.roomTypeCount === 0) add("roomTypes", "roomTypesRequired");
  if (!isPositiveNumber(values.price)) add("price", "priceError");
  if (!isPositiveNumber(values.boxCoverage)) add("boxCoverage", "boxCoverageError");
  else if (values.collectionSelected && calculatePiecesPerBox(values.boxCoverage, values.tileArea) === null) add("boxCoverage", "boxCoveragePiecesError");
  if (!isNonNegativeNumber(values.quantity)) add("quantity", "initialStockError");
  if (isPositiveNumber(values.quantity) && !isPositiveNumber(values.costPrice)) add("costPrice", "costPriceRequired");
  else if (values.costPrice.trim() !== "" && !isPositiveNumber(values.costPrice)) add("costPrice", "costPriceError");
  if (!isValidDescription(values.description)) add("description", "descriptionError");
  return errors;
};
