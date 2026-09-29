"use client";

import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { ApiOrder } from "@/lib/api/types";
import { billedAreaOf, requestedAreaOf } from "@/lib/order-area";
import { PrintDocument } from "@/components/print-document";

/** Uses the quantities and prices recorded on the order, including delivery fees. */
export const InvoiceDocument = ({
  order,
  t,
}: {
  order: ApiOrder;
  t: TFunction;
}) => {
  const money = (value: string | number) =>
    `${order.currency} ${Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

  return (
    <article className="invoice-document">
      <header className="invoice-header">
        <div>
          <p className="invoice-eyebrow">{t("invoice.title")}</p>
          <h1>Magnificat Smart Space</h1>
          <p>{t("dash.cart.quote.brandTagline")}</p>
        </div>
        <div className="invoice-reference">
          <strong>{order.orderNumber}</strong>
          <p>
            {t("sales.orderDetail.orderDate")}:{" "}
            {new Date(order.createdAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
          <p>
            {t("invoice.orderStatus")}: {t(`staff.orderStatus.${order.status}`)}
          </p>
          <p>
            {t("invoice.paymentStatus")}:{" "}
            {t(`staff.quotationPanel.quotationStatus.${order.quotationStatus}`)}
          </p>
        </div>
      </header>

      <section className="invoice-parties">
        <div>
          <h2>{t("sales.orderDetail.customer")}</h2>
          <p>
            <strong>
              {order.customer?.fullName ?? t("sales.orderDetail.unknown")}
            </strong>
          </p>
          {order.customer?.email && <p>{order.customer.email}</p>}
          {order.customer?.phone && <p>{order.customer.phone}</p>}
        </div>
        {order.delivery && (
          <div>
            <h2>{t("sales.orderDetail.deliveryAddress")}</h2>
            <p>{order.delivery.contactName}</p>
            <p>
              {order.delivery.address}, {order.delivery.city}
            </p>
            <p>{order.delivery.phone}</p>
          </div>
        )}
      </section>

      <table className="invoice-items">
        <colgroup>
          <col style={{ width: "42%" }} />
          <col style={{ width: "26%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "16%" }} />
        </colgroup>
        <thead>
          <tr>
            <th>{t("sales.orderDetail.colProduct")}</th>
            <th>{t("sales.orderDetail.colQuantity")}</th>
            <th className="invoice-amount">
              {t("sales.orderDetail.colUnitPrice")}
            </th>
            <th className="invoice-amount">
              {t("sales.orderDetail.colTotal")}
            </th>
          </tr>
        </thead>
        <tbody>
          {(order.items ?? []).map((item) => (
            <tr key={item.id}>
              <td>
                <strong>
                  {item.product?.name ?? t("sales.orderDetail.itemFallback")}
                </strong>
                {item.product?.sku && <small>{item.product.sku}</small>}
              </td>
              <td>
                {billedAreaOf(item).toLocaleString("en-US", {
                  maximumFractionDigits: 4,
                })}{" "}
                m²
                <small>
                  {t("sales.orderDetail.quantityLine", {
                    boxes: item.boxes,
                    extra:
                      item.additionalPieces > 0
                        ? t("sales.orderDetail.quantityExtra", {
                            count: item.additionalPieces,
                          })
                        : "",
                    pieces: item.totalPieces,
                  })}
                </small>
                {billedAreaOf(item) !== requestedAreaOf(item) && (
                  <small>
                    {t("common.orderArea.requested", {
                      value: requestedAreaOf(item).toLocaleString("en-US", {
                        maximumFractionDigits: 4,
                      }),
                    })}
                  </small>
                )}
              </td>
              <td className="invoice-amount">
                {money(item.unitPrice)}
                <small>/ m²</small>
              </td>
              <td className="invoice-amount">{money(item.totalPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="invoice-totals">
        <dl>
          <div>
            <dt>{t("invoice.subtotal")}</dt>
            <dd>{money(order.subtotal)}</dd>
          </div>
          <div>
            <dt>{t("invoice.transportFee")}</dt>
            <dd>
              {order.transportFee === null
                ? t("invoice.transportPending")
                : money(order.transportFee)}
            </dd>
          </div>
          <div className="invoice-grand-total">
            <dt>{t("sales.orderDetail.total")}</dt>
            <dd>{money(order.total)}</dd>
          </div>
        </dl>
        {order.transportFeeNote && <p>{order.transportFeeNote}</p>}
      </section>
    </article>
  );
};

export const OrderInvoice = ({ order }: { order: ApiOrder }) => {
  const { t } = useTranslation();
  return (
    <PrintDocument id="order-invoice-print">
      <InvoiceDocument order={order} t={t} />
    </PrintDocument>
  );
};
