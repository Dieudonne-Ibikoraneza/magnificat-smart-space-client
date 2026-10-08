"use client";

import { useTranslation } from "react-i18next";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { BaseboardOptions } from "@/lib/baseboard-options";
import type { FloorPlanCalculation } from "@/lib/api/types";

const formatNumber = (value: number) =>
  value.toLocaleString(undefined, { maximumFractionDigits: 2 });
const formatRWF = (value: number) =>
  `RWF ${Math.round(value).toLocaleString("en-US")}`;

export function BaseboardFields({
  value,
  onChange,
  dimensions,
  separateAllowance = false,
}: {
  value: BaseboardOptions;
  onChange: (value: BaseboardOptions) => void;
  dimensions?: { lengthM: string; widthM: string };
  separateAllowance?: boolean;
}) {
  const { t } = useTranslation();
  const manualPerimeter = !dimensions || value.manualPerimeter;
  return (
    <div className="mt-6 border-t border-slate-100 pt-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <label
            htmlFor="fp-baseboard"
            className="text-sm font-semibold text-ink"
          >
            {t("calculator.baseboard.include")}
          </label>
          <p className="mt-1 text-xs leading-5 text-muted">
            {t("calculator.baseboard.hint")}
          </p>
        </div>
        <Switch
          id="fp-baseboard"
          checked={value.enabled}
          onCheckedChange={(enabled) => onChange({ ...value, enabled })}
        />
      </div>
      {value.enabled && (
        <div className="mt-5 space-y-4">
          {dimensions !== undefined && (
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="fp-manual-perimeter" className="text-sm text-ink">
                {t("calculator.baseboard.manualPerimeter")}
              </label>
              <Switch
                id="fp-manual-perimeter"
                checked={value.manualPerimeter}
                onCheckedChange={(manualPerimeter) =>
                  onChange({ ...value, manualPerimeter })
                }
              />
            </div>
          )}
          {manualPerimeter ? (
            <Field>
              <FieldLabel htmlFor="fp-perimeter">
                {t("calculator.baseboard.perimeter")}
              </FieldLabel>
              <Input
                id="fp-perimeter"
                type="number"
                min="0"
                max="100000"
                step="0.01"
                inputMode="decimal"
                value={value.perimeterM}
                onChange={(event) =>
                  onChange({ ...value, perimeterM: event.target.value })
                }
                placeholder="22"
                aria-describedby="fp-perimeter-hint"
                className="h-12 text-base font-semibold"
              />
              <p id="fp-perimeter-hint" className="text-xs text-muted">
                {t("calculator.baseboard.perimeterHint")}
              </p>
            </Field>
          ) : (
            <p className="rounded-xl bg-secondary px-4 py-3 text-sm text-ink">
              {t("calculator.baseboard.autoPerimeter", {
                length: formatNumber(
                  2 *
                    ((Number(dimensions?.lengthM) || 0) +
                      (Number(dimensions?.widthM) || 0)),
                ),
              })}
            </p>
          )}
          <Field>
            <FieldLabel htmlFor="fp-openings">
              {t("calculator.baseboard.openings")}
            </FieldLabel>
            <Input
              id="fp-openings"
              type="number"
              min="0"
              max="100000"
              step="0.01"
              inputMode="decimal"
              value={value.openingsWidthM}
              onChange={(event) =>
                onChange({ ...value, openingsWidthM: event.target.value })
              }
              aria-describedby="fp-openings-hint"
              className="h-12 text-base font-semibold"
            />
            <p id="fp-openings-hint" className="text-xs text-muted">
              {t("calculator.baseboard.openingsHint")}
            </p>
          </Field>
          {separateAllowance && (
            <Field>
              <FieldLabel htmlFor="fp-baseboard-wastage">
                {t("quantityCalculator.baseboardWastage")}
              </FieldLabel>
              <Input
                id="fp-baseboard-wastage"
                type="number"
                min="0"
                max="50"
                step="1"
                inputMode="numeric"
                value={value.wastagePercent}
                onChange={(event) =>
                  onChange({ ...value, wastagePercent: event.target.value })
                }
                className="h-12 text-base font-semibold"
              />
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="fp-baseboard-height">
                {t("calculator.baseboard.height")}
              </FieldLabel>
              <Input
                id="fp-baseboard-height"
                type="number"
                min="0.01"
                max="200"
                step="0.1"
                inputMode="decimal"
                value={value.heightCm}
                onChange={(event) =>
                  onChange({ ...value, heightCm: event.target.value })
                }
                className="h-12 text-base font-semibold"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="fp-cut-width">
                {t("calculator.baseboard.cutWidth")}
              </FieldLabel>
              <Input
                id="fp-cut-width"
                type="number"
                min="0"
                max="10"
                step="0.1"
                inputMode="decimal"
                value={value.cutWidthMm}
                onChange={(event) =>
                  onChange({ ...value, cutWidthMm: event.target.value })
                }
                aria-describedby="fp-cut-width-hint"
                className="h-12 text-base font-semibold"
              />
            </Field>
          </div>
          <p id="fp-cut-width-hint" className="text-xs leading-5 text-muted">
            {t("calculator.baseboard.cuttingHint")}
          </p>
        </div>
      )}
    </div>
  );
}

export function BaseboardBreakdown({
  calculation: result,
}: {
  calculation: FloorPlanCalculation;
}) {
  const { t } = useTranslation();
  if (!result.baseboard) return null;
  return (
    <section className="my-5 rounded-xl border border-slate-100 bg-[#F9FAFB] p-4">
      <h3 className="mb-3 text-sm font-bold text-ink">
        {t("calculator.baseboard.title")}
      </h3>
      <dl className="space-y-3 text-sm">
        {[
          {
            label: t("calculator.baseboard.netLength"),
            value: `${formatNumber(result.baseboard.lengthM)} m`,
          },
          {
            label: t("calculator.baseboard.withWastage", {
              percent: result.baseboard.wastagePercent,
            }),
            value: `${formatNumber(result.baseboard.requiredLengthM)} m`,
          },
          {
            label: t("calculator.baseboard.cutYield"),
            value: t("calculator.baseboard.cutYieldValue", {
              count: result.baseboard.stripsPerTile,
              length: formatNumber(result.baseboard.stripLengthM * 100),
            }),
          },
          {
            label: t("calculator.baseboard.extraTiles"),
            value: result.baseboard.totalTiles.toLocaleString(),
          },
          {
            label: t("calculator.baseboard.floorCost"),
            value: formatRWF(result.floor.estimatedCost),
          },
          {
            label: t("calculator.baseboard.cost"),
            value: formatRWF(result.baseboard.estimatedCost),
          },
        ].map((row) => (
          <div
            key={row.label}
            className="flex items-start justify-between gap-3"
          >
            <dt className="text-muted">{row.label}</dt>
            <dd className="text-right font-data font-semibold text-ink">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs leading-5 text-muted">
        {t("calculator.baseboard.purchaseHint")}
      </p>
    </section>
  );
}
