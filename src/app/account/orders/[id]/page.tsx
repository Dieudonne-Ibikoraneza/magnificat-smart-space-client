import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Boxes,
  CalendarDays,
  Check,
  Clock,
  History,
  MapPin,
  Printer,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAccountOrder } from "@/data/account-orders";

type AccountOrderDetailsProps = { params: Promise<{ id: string }> };
type OrderStatus = "Processing" | "Shipped" | "Delivered";

const statusVariant = (status: OrderStatus) =>
  ({ Processing: "secondary", Shipped: "primary", Delivered: "muted" } as const)[status];

const formatPrice = (value: number) => `RWF ${value.toLocaleString("en-US")}`;

export const generateMetadata = async ({ params }: AccountOrderDetailsProps): Promise<Metadata> => {
  const { id } = await params;
  const order = getAccountOrder(id);
  return { title: order ? `${order.id} | My Orders` : "Order details" };
};

const AccountOrderDetailsPage = async ({ params }: AccountOrderDetailsProps) => {
  const { id } = await params;
  const order = getAccountOrder(id);
  if (!order) notFound();

  const timeline = [
    { label: "Order Placed", timestamp: order.date + " • 09:41 AM", note: "We received your order.", state: "done" },
    { label: "Processing", timestamp: order.date + " • 11:30 AM", note: "Your order is being prepared.", state: order.status === "Processing" ? "current" : "done" },
    { label: "Shipped", timestamp: order.status === "Processing" ? undefined : order.date + " • 04:15 PM", note: order.status === "Processing" ? "Pending" : "Your order is on its way.", state: order.status === "Processing" ? "pending" : order.status === "Shipped" ? "current" : "done" },
    { label: "Delivered", timestamp: order.status === "Delivered" ? order.date + " • 05:02 PM" : undefined, note: order.status === "Delivered" ? "Order delivered successfully." : "Pending", state: order.status === "Delivered" ? "current" : "pending" },
  ] as const;

  return (
    <div className="mx-auto max-w-300">
      <header className="border-b border-slate-200 pb-5 sm:pb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink render={<Link href="/account" />}>Account</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink render={<Link href="/account/orders" />}>My Orders</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>{order.id}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-2xl font-bold text-ink sm:text-4xl">Order #{order.id}</h1>
              <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted">
              <Clock className="size-4" /> Placed on {order.date}
            </div>
          </div>
          <Button type="button" variant="outline" className="h-auto gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase">
            <Printer className="size-4" /> Print Invoice
          </Button>
        </div>
      </header>

      <div className="mt-6 space-y-5 sm:space-y-6">
        <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
          {[
            { icon: Wallet, label: "Total Amount", value: order.amountShort, note: "Full amount: " + formatPrice(order.total) },
            { icon: CalendarDays, label: "Order Date", value: order.date, note: order.expectedDelivery === "Delivered" ? "" : "Expected delivery in " + order.expectedDelivery },
            { icon: Boxes, label: "Total Items", value: order.items.length + " Types", note: order.totalVolume },
          ].map(({ icon: Icon, label, value, note }) => (
            <article key={label} className="rounded-2xl bg-white p-5 shadow-sm transition-transform duration-200 active:scale-95 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[11px] font-bold tracking-wider text-muted uppercase">{label}</span>
                <Icon className="size-5 text-muted" />
              </div>
              <p className="mt-3 truncate font-data text-xl font-bold text-ink sm:text-2xl">{value}</p>
              {note ? <p className="mt-1 text-xs text-muted">{note}</p> : null}
            </article>
          ))}
        </div>

        <div className="grid items-start gap-5 sm:gap-6 xl:grid-cols-[1.7fr_1fr]">
          <section className="overflow-hidden rounded-2xl bg-white">
            <div className="flex items-center justify-between gap-3 px-5 py-5 sm:px-6">
              <h2 className="text-lg font-bold text-ink sm:text-2xl">Order Items</h2>
              <Badge variant="secondary">{order.items.length} Items</Badge>
            </div>
            <Separator className="bg-slate-100" />
            <div className="md:hidden">
              <ul className="divide-y divide-slate-100">
                {order.items.map((item) => (
                  <li key={item.productId} className="px-5 py-5 sm:px-6">
                    <Link href={`/products/${item.productId}`} className="flex items-center gap-4">
                      <Image src={item.image} alt={item.name} width={80} height={80} unoptimized className="size-16 shrink-0 rounded-sm object-cover sm:size-20" />
                      <span className="min-w-0 flex-1"><span className="block font-medium text-ink uppercase">{item.name}</span><span className="mt-1 block text-sm text-muted">{item.quantity} · Unit price {formatPrice(item.unitPrice)}</span></span>
                      <span className="shrink-0 text-right font-semibold text-ink">{formatPrice(item.total)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Quantity</TableHead><TableHead>Unit Price</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.productId}>
                      <TableCell className="font-medium text-ink uppercase"><Link href={`/products/${item.productId}`} className="flex items-center gap-3 hover:underline"><Image src={item.image} alt={item.name} width={80} height={80} unoptimized className="size-16 shrink-0 rounded-sm object-cover" /><span>{item.name}</span></Link></TableCell>
                      <TableCell className="whitespace-nowrap text-ink"><span className="block">{item.quantity}</span><span className="mt-1 block text-xs text-muted">{item.boxes} boxes{item.additionalPieces > 0 ? " + " + item.additionalPieces + " pcs" : ""} ({item.pieces} pcs)</span></TableCell>
                      <TableCell className="whitespace-nowrap text-muted">{formatPrice(item.unitPrice)}</TableCell>
                      <TableCell className="whitespace-nowrap font-semibold text-ink">{formatPrice(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-end gap-4 bg-primary px-5 py-5 sm:px-10">
              <span className="text-lg font-semibold text-ink">Total</span>
              <span className="text-xl font-bold text-ink sm:text-2xl">{formatPrice(order.total)}</span>
            </div>
          </section>

          <div className="space-y-5 sm:space-y-6">
            <section className="rounded-2xl bg-white p-5 sm:p-6">
              <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-secondary"><MapPin className="size-5" /></span><h2 className="text-lg font-bold text-ink sm:text-xl">Customer Info</h2></div>
              <div className="mt-5 flex items-start gap-3 text-sm"><MapPin className="mt-0.5 size-4 shrink-0 text-muted" /><div><p className="text-[11px] font-bold tracking-wider text-muted uppercase">Delivery Address</p><p className="mt-1 text-ink">Kigali, Rwanda</p></div></div>
            </section>

            <section className="rounded-2xl bg-white p-5 sm:p-6">
              <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-secondary"><History className="size-5" /></span><h2 className="text-lg font-bold text-ink sm:text-xl">Timeline</h2></div>
              <ol className="mt-5 space-y-6 border-l border-slate-200 pl-6">
                {timeline.map((step) => (
                  <li key={step.label} className="relative">
                    <span className={"absolute top-1.5 -left-[31px] flex size-3 items-center justify-center rounded-full border-2 " + (step.state === "pending" ? "border-slate-200 bg-white" : "border-ink bg-primary")}>
                      {step.state === "done" ? <Check className="size-2 text-ink" /> : null}
                    </span>
                    <div className={step.state === "current" ? "rounded-lg bg-primary p-3" : ""}>
                      <p className={"text-[11px] font-bold tracking-wider uppercase " + (step.state === "pending" ? "text-muted" : "text-ink")}>{step.label}</p>
                      {step.timestamp ? <p className="mt-0.5 font-data text-xs text-muted">{step.timestamp}</p> : null}
                      <p className={"mt-1 text-xs " + (step.state === "pending" ? "text-muted" : "text-ink")}>{step.note}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      </div>

    </div>
  );
};

export default AccountOrderDetailsPage;
