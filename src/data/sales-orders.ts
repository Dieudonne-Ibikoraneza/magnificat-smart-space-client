import { getSalesCustomer, salesCustomers } from "@/data/sales-customers";
import { products } from "@/data/catalog";
import { calculateTileQuantity } from "@/lib/tile-calculator";

export type SalesOrderStatus = "Processing" | "Shipped" | "Delivered";
export type SalesOrderCreatorType = "customer" | "staff";

export type SalesOrderItem = {
  productId: string;
  product: string;
  image: string;
  quantity: string;
  boxes: number;
  additionalPieces: number;
  pieces: number;
  unitPrice: string;
  total: string;
};

export type SalesOrderTimelineStep = {
  label: string;
  timestamp?: string;
  note?: string;
  state: "done" | "current" | "pending";
};

export type SalesOrder = {
  id: string;
  customerSlug: string;
  customerName: string;
  date: string;
  amount: string;
  amountShort: string;
  status: SalesOrderStatus;
  createdByType: SalesOrderCreatorType;
  createdByName: string;
  updatedAgo: string;
  expectedDelivery: string;
  totalVolume: string;
  items: SalesOrderItem[];
  timeline: SalesOrderTimelineStep[];
};

const createTimeline = (status: SalesOrderStatus, date: string, createdByName: string): SalesOrderTimelineStep[] => [
  { label: "Order Placed", timestamp: date + " • 09:41 AM", note: "Created by " + createdByName + ".", state: "done" },
  { label: "Processing", timestamp: date + " • 11:30 AM", note: "Warehouse team is currently picking and packing items.", state: status === "Processing" ? "current" : "done" },
  { label: "Ready for Dispatch", timestamp: status === "Processing" ? undefined : date + " • 04:15 PM", note: status === "Processing" ? "Pending" : "Loaded and manifested for delivery.", state: status === "Processing" ? "pending" : status === "Shipped" ? "current" : "done" },
  { label: "Delivered", timestamp: status === "Delivered" ? date + " • 05:02 PM" : undefined, note: status === "Delivered" ? "Signed for on site." : "Pending", state: status === "Delivered" ? "current" : "pending" },
];

const orderTemplates = [
  {
    date: "Oct 24, 2026",
    amount: "RWF 12,400,000",
    amountShort: "RWF 12.4M",
    status: "Processing" as const,
    createdByType: "customer" as const,
    createdByName: "the customer",
    updatedAgo: "2 hours ago",
    expectedDelivery: "5 days",
    items: [
      { productId: "1", product: "Calacatta Gold Polished", quantity: "450 sqm", boxes: 258, pieces: 1806, unitPrice: "RWF 45,000", total: "RWF 20,250,000" },
      { productId: "2", product: "Nero Marquina Premium", quantity: "300 sqm", boxes: 172, pieces: 1200, unitPrice: "RWF 35,000", total: "RWF 10,500,000" },
    ],
  },
  {
    date: "Oct 22, 2026",
    amount: "RWF 8,250,000",
    amountShort: "RWF 8.25M",
    status: "Shipped" as const,
    createdByType: "staff" as const,
    createdByName: "a sales person",
    updatedAgo: "1 day ago",
    expectedDelivery: "3 days",
    items: [
      { productId: "3", product: "Statuario Venato Slab", quantity: "220 sqm", boxes: 147, pieces: 2200, unitPrice: "RWF 52,000", total: "RWF 11,440,000" },
      { productId: "4", product: "Oak Herringbone Parquet", quantity: "180 sqm", boxes: 120, pieces: 1800, unitPrice: "RWF 31,000", total: "RWF 5,580,000" },
    ],
  },
  {
    date: "Oct 20, 2026",
    amount: "RWF 45,000,020",
    amountShort: "RWF 45.0M",
    status: "Delivered" as const,
    createdByType: "staff" as const,
    createdByName: "the stock manager",
    updatedAgo: "4 days ago",
    expectedDelivery: "Delivered",
    items: [
      { productId: "5", product: "Terrazzo Ivory Matte", quantity: "600 sqm", boxes: 393, pieces: 6667, unitPrice: "RWF 18,500", total: "RWF 11,100,000" },
      { productId: "6", product: "Basalt Grey Textured", quantity: "150 sqm", boxes: 79, pieces: 938, unitPrice: "RWF 24,000", total: "RWF 3,600,000" },
    ],
  },
];

const orderRecords = salesCustomers.flatMap((customer, customerIndex) =>
  orderTemplates.map((order, orderIndex) => {
    const createdByType: SalesOrderCreatorType = customerIndex % 2 === 0 ? "customer" : "staff";

    return {
      ...order,
      createdByType,
      createdByName:
        createdByType === "customer"
          ? "the customer"
          : orderIndex === 1
            ? "a sales person"
            : "the stock manager",
      items: order.items.map((item) => {
        const product = products.find((candidate) => candidate.id === item.productId) ?? products[0];
        const calculation = calculateTileQuantity(
          Number(item.quantity.replace(/[^0-9.]/g, "")),
          product,
        );

        return {
          ...item,
          boxes: calculation.completeBoxes,
          additionalPieces: calculation.remainingPieces,
          pieces: calculation.totalPieces,
          image: product.image,
        };
      }),
      customerSlug: customer.slug,
      id: "ORD-" + (7001 + customerIndex * orderTemplates.length + orderIndex),
    };
  }),
);

export const salesOrders: SalesOrder[] = orderRecords.map((order) => {
  const customer = getSalesCustomer(order.customerSlug);
  const totalVolume = order.items.reduce((total, item) => total + Number(item.quantity.replace(/[^0-9.]/g, "")), 0);

  return {
    ...order,
    customerName: customer?.name ?? "Unknown customer",
    totalVolume: totalVolume.toLocaleString("en-US") + " SQM Total Volume",
    timeline: createTimeline(order.status, order.date, order.createdByName),
  };
});

export const getSalesOrder = (id: string) =>
  salesOrders.find((order) => order.id.toLowerCase() === id.toLowerCase());

export const getSalesOrdersForCustomer = (customerSlug: string) =>
  salesOrders.filter((order) => order.customerSlug === customerSlug);

export const sumSalesOrderItems = (items: SalesOrderItem[]) => {
  const total = items.reduce(
    (sum, item) => sum + Number(item.total.replace(/[^0-9]/g, "")),
    0,
  );
  return "RWF " + total.toLocaleString("en-US");
};
