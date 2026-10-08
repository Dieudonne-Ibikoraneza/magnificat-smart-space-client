"use client";

import { Calculator } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiErrorState, ApiLoading } from "@/components/api-state";
import {
  BaseboardFields,
  BaseboardBreakdown,
} from "@/components/baseboard-calculator-fields";
import { Input } from "@/components/ui/input";
import { calculatorApi, ApiError } from "@/lib/api";
import type { FloorPlanCalculation } from "@/lib/api/types";
import {
  DEFAULT_BASEBOARD_OPTIONS,
  baseboardInputErrorKey,
  baseboardRequest,
  type BaseboardOptions,
  type CalculatorPurchase,
} from "@/lib/baseboard-options";
import { calculateTileQuantity } from "@/lib/tile-calculator";
import type { Product } from "@/components/product-card";

const formatNumber = (value: number) =>
  value.toLocaleString(undefined, { maximumFractionDigits: 2 });

/** Shared by customer and staff product details. Reports the cart area only
 * when the estimate matches the current product, area and baseboard inputs. */
export const QuantityCalculator = ({
  product,
  value,
  onChange,
  onPurchaseChange,
}: {
  product: Product;
  value?: string;
  onChange?: (value: string) => void;
  onPurchaseChange?: (purchase: CalculatorPurchase) => void;
}) => {
  const { t } = useTranslation();
  const [internalArea, setInternalArea] = useState("26");
  const requiredArea = value ?? internalArea;
  const setRequiredArea = onChange ?? setInternalArea;
  const area = Number(requiredArea);
  const validArea = Number.isFinite(area) && area > 0;
  const [baseboardOptions, setBaseboardOptions] = useState(
    DEFAULT_BASEBOARD_OPTIONS,
  );
  const inputErrorKey = baseboardInputErrorKey(baseboardOptions, true);
  const inputError = inputErrorKey ? t(inputErrorKey) : null;
  const floorQuantity = useMemo(
    () => calculateTileQuantity(area, product),
    [area, product],
  );
  const request = useMemo(
    () => ({
      productId: product.id,
      totalAreaSqm: Number(requiredArea),
      // The detail-page area remains the customer's required tile area; the
      // baseboard allowance is separate, so the floor is not increased silently.
      wastagePercent: 0,
      baseboard: baseboardRequest(baseboardOptions, true, true),
    }),
    [product.id, requiredArea, baseboardOptions],
  );
  const requestKey = JSON.stringify(request);
  const [response, setResponse] = useState<{
    key: string;
    result: FloorPlanCalculation | null;
    error: string | null;
  } | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const current =
    response?.key === requestKey && !inputError && validArea ? response : null;
  const remoteResult = current?.result ?? null;
  const calculation = baseboardOptions.enabled
    ? remoteResult?.quantity
    : floorQuantity;
  const cartAreaSqm =
    !validArea || inputError
      ? null
      : baseboardOptions.enabled
        ? (remoteResult?.requiredAreaSqm ?? null)
        : area;

  useEffect(() => {
    onPurchaseChange?.({
      productId: product.id,
      inputArea: requiredArea,
      cartAreaSqm,
    });
  }, [onPurchaseChange, product.id, requiredArea, cartAreaSqm, baseboardOptions]);

  useEffect(() => {
    if (!baseboardOptions.enabled || !validArea || inputError) return;
    let active = true;
    const timer = window.setTimeout(() => {
      calculatorApi
        .floorPlan(request)
        .then((result) => {
          if (active) setResponse({ key: requestKey, result, error: null });
        })
        .catch((cause) => {
          if (active)
            setResponse({
              key: requestKey,
              result: null,
              error:
                cause instanceof ApiError
                  ? cause.message
                  : t("calculator.calcError"),
            });
        });
    }, 450);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    baseboardOptions.enabled,
    validArea,
    inputError,
    request,
    requestKey,
    retryToken,
    t,
  ]);

  const invalidatePurchase = () =>
    onPurchaseChange?.({
      productId: product.id,
      inputArea: requiredArea,
      cartAreaSqm: null,
    });
  const changeBaseboard = (options: BaseboardOptions) => {
    invalidatePurchase();
    setBaseboardOptions(options);
  };

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-7">
      <div className="mb-6 flex items-center gap-2">
        <Calculator className="size-5 text-ink" />
        <h2 className="text-lg font-bold text-ink">
          {t("quantityCalculator.title")}
        </h2>
      </div>
      <label className="text-xs font-medium uppercase tracking-wide text-muted">
        {t("quantityCalculator.requiredArea")}
        <Input
          type="number"
          min="0"
          step="0.01"
          value={requiredArea}
          onChange={(event) => {
            invalidatePurchase();
            setRequiredArea(event.target.value);
          }}
          inputMode="decimal"
          className="mt-2 h-12 text-base font-semibold"
        />
      </label>
      <p className="mt-3 text-xs text-muted">
        {t("quantityCalculator.spec", {
          size: product.size,
          tileArea: formatNumber(product.tileArea),
          boxCoverage: formatNumber(product.boxCoverage),
          pcs: product.piecesPerBox,
        })}
      </p>
      <BaseboardFields
        value={baseboardOptions}
        onChange={changeBaseboard}
        separateAllowance
      />
      {!validArea ? (
        <p
          role="status"
          className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"
        >
          {t("calculator.enterToSee", {
            what: t("calculator.enterToSee_totalArea"),
          })}
        </p>
      ) : inputError ? (
        <p
          role="status"
          className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"
        >
          {inputError}
        </p>
      ) : baseboardOptions.enabled && current?.error ? (
        <ApiErrorState
          message={current.error}
          onRetry={() => setRetryToken((token) => token + 1)}
          className="py-6"
        />
      ) : !calculation ? (
        <ApiLoading label={t("calculator.calculating")} className="py-6" />
      ) : (
        <>
          {baseboardOptions.enabled && remoteResult && (
            <BaseboardBreakdown calculation={remoteResult} />
          )}
          <dl className="mt-6 space-y-4 border-t border-slate-100 pt-6 text-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <dt className="text-base font-bold text-ink">
                {t(
                  baseboardOptions.enabled
                    ? "calculator.baseboard.combined"
                    : "quantityCalculator.totalQuantity",
                )}
              </dt>
              <dd className="text-xl font-bold text-ink">
                {t("quantityCalculator.totalQuantityValue", {
                  area: formatNumber(calculation.purchasedArea),
                })}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">
                {t("quantityCalculator.completeBoxes")}
              </dt>
              <dd className="font-bold text-ink">
                {calculation.completeBoxes}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">
                {t("quantityCalculator.remainingArea")}
              </dt>
              <dd className="font-bold text-ink">
                {formatNumber(calculation.remainingArea)} m²
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">
                {t("quantityCalculator.additionalPieces")}
              </dt>
              <dd className="font-bold text-ink">
                {calculation.remainingPieces}
              </dd>
            </div>
            <div className="flex justify-between gap-3 text-xs text-muted">
              <dt>{t("quantityCalculator.equivalent")}</dt>
              <dd className="text-right">
                {t("quantityCalculator.equivalentValue", {
                  boxes: calculation.completeBoxes,
                  pieces: calculation.remainingPieces,
                  total: calculation.totalPieces,
                })}
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-slate-100 pt-4">
              <dt className="font-semibold text-ink">
                {t("calculator.estimatedCost")}
              </dt>
              <dd className="font-bold text-ink">
                RWF{" "}
                {Math.round(
                  baseboardOptions.enabled && remoteResult
                    ? remoteResult.estimatedCost
                    : calculation.purchasedArea * product.price,
                ).toLocaleString("en-US")}
              </dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
};
