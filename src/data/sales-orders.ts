import { getSalesCustomer, salesCustomers } from "@/data/sales-customers";

export type SalesOrderStatus = "Processing" | "Shipped" | "Delivered";

export type SalesOrderItem = {
  product: string;
  quantity: string;
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
  updatedAgo: string;
  expectedDelivery: string;
  totalVolume: string;
  items: SalesOrderItem[];
  timeline: SalesOrderTimelineStep[];
};

const createTimeline = (status: SalesOrderStatus, date: string): SalesOrderTimelineStep[] => [
  { label: "Order Placed", timestamp: date + " • 09:41 AM", note: "Created by the sales team via portal.", state: "done" },
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
    updatedAgo: "2 hours ago",
    expectedDelivery: "5 days",
    items: [
      { product: "Calacatta Gold Polished", quantity: "450 sqm", unitPrice: "RWF 45,000", total: "RWF 20,250,000" },
      { product: "Nero Marquina Premium", quantity: "300 sqm", unitPrice: "RWF 35,000", total: "RWF 10,500,000" },
    ],
  },
  {
    date: "Oct 22, 2026",
    amount: "RWF 8,250,000",
    amountShort: "RWF 8.25M",
    status: "Shipped" as const,
    updatedAgo: "1 day ago",
    expectedDelivery: "3 days",
    items: [
      { product: "Statuario Venato Slab", quantity: "220 sqm", unitPrice: "RWF 52,000", total: "RWF 11,440,000" },
      { product: "Oak Herringbone Parquet", quantity: "180 sqm", unitPrice: "RWF 31,000", total: "RWF 5,580,000" },
    ],
  },
  {
    date: "Oct 20, 2026",
    amount: "RWF 45,000,020",
    amountShort: "RWF 45.0M",
    status: "Delivered" as const,
    updatedAgo: "4 days ago",
    expectedDelivery: "Delivered",
    items: [
      { product: "Terrazzo Ivory Matte", quantity: "600 sqm", unitPrice: "RWF 18,500", total: "RWF 11,100,000" },
      { product: "Basalt Grey Textured", quantity: "150 sqm", unitPrice: "RWF 24,000", total: "RWF 3,600,000" },
    ],
  },
];

const orderRecords = salesCustomers.flatMap((customer, customerIndex) =>
  orderTemplates.map((order, orderIndex) => ({
    ...order,
    customerSlug: customer.slug,
    id: "ORD-" + (7001 + customerIndex * orderTemplates.length + orderIndex),
  })),
);

export const salesOrders: SalesOrder[] = orderRecords.map((order) => {
  const customer = getSalesCustomer(order.customerSlug);
  const totalVolume = order.items.reduce((total, item) => total + Number(item.quantity.replace(/[^0-9.]/g, "")), 0);

  return {
    ...order,
    customerName: customer?.name ?? "Unknown customer",
    totalVolume: totalVolume.toLocaleString("en-US") + " SQM Total Volume",
    timeline: createTimeline(order.status, order.date),
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
