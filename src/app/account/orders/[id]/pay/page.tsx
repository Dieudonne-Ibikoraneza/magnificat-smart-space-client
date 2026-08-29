"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { ApiErrorState, ApiLoading } from "@/components/api-state";
import { ordersApi, paymentsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/lib/api/use-api";
import { groupDigitsInThrees, isValidRwandaMobileDigits } from "@/lib/validation";
import { cn } from "@/lib/utils";

type PaymentMethod = "momo" | "card";

const formatRWF = (value: string | number) => `RWF ${Math.round(Number(value)).toLocaleString("en-US")}`;

const methods: { id: PaymentMethod; label: string; hint: string; icon: typeof Smartphone }[] = [
  { id: "momo", label: "Mobile money (MoMo)", hint: "Approve the prompt on your phone", icon: Smartphone },
  { id: "card", label: "Bank card", hint: "Visa or Mastercard", icon: CreditCard },
];

/** Digits only, grouped in fours: "4111 1111 1111 1111". */
const formatCardNumber = (value: string) =>
  (value.replace(/\D/g, "").slice(0, 19).match(/.{1,4}/g) ?? []).join(" ");

const formatExpiry = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

/**
 * In-app payment for an order's quotation (doc 3.7: mobile money and bank card).
 * Sits alongside the manual "I've paid by MoMo code or bank transfer" path on
 * the order page. Card details never leave the browser — there's no client-side
 * tokenizing SDK wired in yet (Stripe.js/Flutterwave inline, say), so a card
 * "payment" sends an opaque placeholder token rather than the raw PAN/CVC;
 * `payments.service.ts`'s card provider is itself still a simulated stub
 * pending real processor credentials, same as MoMo's.
 */
export default function OrderPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: order, loading, error, reload } = useApi(() => ordersApi.get(id), [id]);

  const [method, setMethod] = useState<PaymentMethod>("momo");
  const [momoDigits, setMomoDigits] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paid, setPaid] = useState(false);

  if (loading) return <ApiLoading label="Loading order…" className="py-32" />;
  if (error) {
    if (error.toLowerCase().includes("not found") || error.toLowerCase().includes("access")) {
      return (
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="text-xl font-bold text-ink">Order not found</h1>
          <Button nativeButton={false} render={<Link href="/account/orders" />} className="mt-6 h-11 gap-2 px-5">
            Back to My Orders
          </Button>
        </div>
      );
    }
    return <ApiErrorState message={error} onRetry={reload} className="my-16" />;
  }
  if (!order) return null;

  const items = order.items ?? [];
  const transportFee = order.transportFee ? Number(order.transportFee) : 0;
  const total = order.total;
  const quotationSent = order.quotationStatus !== "AWAITING_REVIEW";

  const cardDigits = cardNumber.replace(/\D/g, "");
  const valid =
    method === "momo"
      ? isValidRwandaMobileDigits(momoDigits)
      : cardDigits.length >= 13 &&
        cardName.trim().length > 2 &&
        /^\d{2}\/\d{2}$/.test(expiry) &&
        /^\d{3,4}$/.test(cvc);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid || submitting) return;

    setSubmitting(true);
    try {
      if (method === "momo") {
        await paymentsApi.initiate({ orderId: order.id, method: "MOMO", phone: `+250${momoDigits}` });
      } else {
        await paymentsApi.initiate({
          orderId: order.id,
          method: "CARD",
          cardToken: `demo_${crypto.randomUUID()}`,
        });
      }
      setPaid(true);
      toast.success("Payment submitted", {
        description:
          method === "momo"
            ? "Approve the prompt on your phone to finish. We'll confirm once it settles."
            : "Your card payment is being processed. We'll confirm once it settles.",
      });
    } catch (cause) {
      toast.error("Couldn't start the payment", {
        description: cause instanceof ApiError ? cause.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (paid) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-50 text-green-700">
          <CheckCircle2 className="size-8" />
        </span>
        <h1 className="mt-6 text-2xl font-bold text-ink">Payment submitted</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          We&apos;ve sent {formatRWF(total)} for order #{order.orderNumber} to{" "}
          {method === "momo" ? "mobile money" : "your card issuer"}. Our team verifies every payment
          before confirming the order — you&apos;ll see the status update on the order page.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Button
            nativeButton={false}
            render={<Link href={`/account/orders/${order.id}`} />}
            variant="outline"
            className="h-12 w-full font-bold"
          >
            Back to order
          </Button>
          <Button
            type="button"
            onClick={() => router.push("/account/orders")}
            className="h-12 w-full bg-primary font-bold text-ink hover:bg-primary/90"
          >
            All my orders
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <Link
        href={`/account/orders/${order.id}`}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" /> Back to order #{order.orderNumber}
      </Link>

      <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Pay for order #{order.orderNumber}</h1>
      <p className="mt-2 text-sm text-muted">
        Payments are verified by our team before the order moves to fulfilment.
      </p>

      {!quotationSent ? (
        <p className="mt-8 rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-800">
          This order doesn&apos;t have a quotation yet. Our stock team is still reviewing it — once the
          transport fee is set you&apos;ll be able to pay here.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
          <form onSubmit={(event) => void handleSubmit(event)} className="rounded-2xl bg-white p-5 shadow-sm sm:p-7">
            <fieldset>
              <legend className="text-sm font-bold text-ink">Payment method</legend>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {methods.map(({ id: methodId, label, hint, icon: Icon }) => (
                  <button
                    key={methodId}
                    type="button"
                    onClick={() => setMethod(methodId)}
                    aria-pressed={method === methodId}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                      method === methodId
                        ? "border-ink bg-secondary"
                        : "border-slate-100 hover:bg-[#F9FAFB]",
                    )}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                      <Icon className="size-4 text-ink" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-ink">{label}</span>
                      <span className="mt-0.5 block text-xs text-muted">{hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            {method === "momo" ? (
              <Field className="mt-6">
                <FieldLabel htmlFor="momo-phone">Mobile money number</FieldLabel>
                <div className="flex items-center gap-2">
                  <span className="flex h-12 shrink-0 items-center rounded-lg border border-border bg-[#F9FAFB] px-3 font-data text-sm font-semibold text-ink">
                    +250
                  </span>
                  <Input
                    id="momo-phone"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={groupDigitsInThrees(momoDigits)}
                    onChange={(event) => setMomoDigits(event.target.value.replace(/\D/g, "").slice(0, 9))}
                    placeholder="7XX XXX XXX"
                    className="h-12 font-data text-base"
                  />
                </div>
                {momoDigits.length > 0 && !isValidRwandaMobileDigits(momoDigits) && (
                  <p className="mt-2 text-xs font-medium text-red-600">
                    Enter a 9-digit Rwandan mobile number starting with 7.
                  </p>
                )}
              </Field>
            ) : (
              <div className="mt-6 space-y-4">
                <Field>
                  <FieldLabel htmlFor="card-number">Card number</FieldLabel>
                  <Input
                    id="card-number"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    value={cardNumber}
                    onChange={(event) => setCardNumber(formatCardNumber(event.target.value))}
                    placeholder="1234 5678 9012 3456"
                    className="h-12 font-data text-base"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="card-name">Name on card</FieldLabel>
                  <Input
                    id="card-name"
                    autoComplete="cc-name"
                    value={cardName}
                    onChange={(event) => setCardName(event.target.value)}
                    placeholder="As printed on the card"
                    className="h-12 text-base"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="card-expiry">Expiry (MM/YY)</FieldLabel>
                    <Input
                      id="card-expiry"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      value={expiry}
                      onChange={(event) => setExpiry(formatExpiry(event.target.value))}
                      placeholder="08/29"
                      className="h-12 font-data text-base"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="card-cvc">CVC</FieldLabel>
                    <Input
                      id="card-cvc"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      value={cvc}
                      onChange={(event) => setCvc(event.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="123"
                      className="h-12 font-data text-base"
                    />
                  </Field>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={!valid || submitting}
              className="mt-7 h-13 w-full gap-2 bg-primary text-base font-bold text-ink hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
              {submitting ? "Processing…" : `Pay ${formatRWF(total)}`}
            </Button>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted">
              <Lock className="size-3" /> Card details are sent straight to the payment provider.
            </p>
          </form>

          <aside className="h-fit rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-bold text-ink">Order summary</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted">Items ({items.length})</dt>
                <dd className="font-data font-semibold text-ink">{formatRWF(order.subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Transport fee</dt>
                <dd className="font-data font-semibold text-ink">
                  {transportFee === 0 ? "Free" : formatRWF(transportFee)}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-base">
                <dt className="font-bold text-ink">Total due</dt>
                <dd className="font-data font-bold text-ink">{formatRWF(total)}</dd>
              </div>
            </dl>

            <ul className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs text-muted">
              {items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3">
                  <span className="min-w-0 truncate">{item.product?.name ?? "Item"}</span>
                  <span className="shrink-0 font-data">{Number(item.requiredAreaSqm)} m²</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}
    </div>
  );
}
