export type BaseboardOptions = {
  enabled: boolean;
  manualPerimeter: boolean;
  perimeterM: string;
  openingsWidthM: string;
  heightCm: string;
  cutWidthMm: string;
  wastagePercent: string;
};

export const DEFAULT_BASEBOARD_OPTIONS: BaseboardOptions = {
  enabled: false,
  manualPerimeter: false,
  perimeterM: "",
  openingsWidthM: "0",
  heightCm: "10",
  cutWidthMm: "3",
  wastagePercent: "10",
};

export function baseboardInputErrorKey(
  options: BaseboardOptions,
  manualPerimeter: boolean,
) {
  if (!options.enabled) return null;
  if (manualPerimeter && !(Number(options.perimeterM) > 0))
    return "calculator.baseboard.enterPerimeter";
  if (!(Number(options.heightCm) > 0))
    return "calculator.baseboard.enterHeight";
  return null;
}

export function baseboardRequest(
  options: BaseboardOptions,
  manualPerimeter: boolean,
  separateAllowance = false,
) {
  if (!options.enabled) return undefined;
  return {
    heightCm: Number(options.heightCm),
    perimeterM: manualPerimeter ? Number(options.perimeterM) : undefined,
    openingsWidthM: Number(options.openingsWidthM) || 0,
    cutWidthMm: Number(options.cutWidthMm) || 0,
    ...(separateAllowance
      ? { wastagePercent: Number(options.wastagePercent) || 0 }
      : {}),
  };
}

export type CalculatorPurchase = {
  productId: string;
  inputArea: string;
  cartAreaSqm: number | null;
};

/** Only a calculation for the current product and area can be sent to cart. */
export function calculatorPurchaseArea(
  purchase: CalculatorPurchase | null,
  productId: string,
  inputArea: string,
) {
  const area = purchase?.cartAreaSqm;
  return purchase?.productId === productId &&
    purchase.inputArea === inputArea &&
    typeof area === "number" &&
    Number.isFinite(area) &&
    area > 0
    ? area
    : null;
}
