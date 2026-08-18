import { db } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrdersFilters } from "@/components/admin/OrdersFilters";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/agent/OrderStatusBadge";
import {
  ShoppingCart,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  PackageOpen,
  User,
} from "lucide-react";
import {
  toPersianDigits,
  formatToman,
  formatJalaliDateTime,
} from "@/lib/format";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    orderType?: string;
    orderStatus?: string;
    paymentStatus?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 20;

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const user = await getCurrentAdmin();
  if (!user) redirect("/admin/login");

  const params = await searchParams;
  const orderType = params.orderType;
  const orderStatus = params.orderStatus;
  const paymentStatus = params.paymentStatus;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);

  // Build where clause
  const where: {
    orderType?: string;
    orderStatus?: string;
    paymentStatus?: string;
  } = {};
  if (orderType && ["customer", "agent"].includes(orderType)) {
    where.orderType = orderType;
  }
  if (
    orderStatus &&
    [
      "awaiting_payment",
      "paid",
      "confirmed",
      "preparing",
      "shipped",
      "delivered",
      "cancelled",
    ].includes(orderStatus)
  ) {
    where.orderStatus = orderStatus;
  }
  if (paymentStatus && ["pending", "confirmed"].includes(paymentStatus)) {
    where.paymentStatus = paymentStatus;
  }

  // Parallel queries
  const [orders, totalCount, allTypeCounts] = await Promise.all([
    db.order.findMany({
      where,
      include: {
        items: { select: { id: true, productName: true, quantity: true } },
        agent: { select: { id: true, name: true, storeName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.order.count({ where }),
    db.order.findMany({
      select: { orderType: true },
    }),
  ]);

  const counts = {
    all: allTypeCounts.length,
    customer: allTypeCounts.filter((o) => o.orderType === "customer").length,
    agent: allTypeCounts.filter((o) => o.orderType === "agent").length,
  } as const;

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  // Build pagination link preserving current filters
  const pageHref = (n: number) => {
    const sp = new URLSearchParams();
    if (orderType) sp.set("orderType", orderType);
    if (orderStatus) sp.set("orderStatus", orderStatus);
    if (paymentStatus) sp.set("paymentStatus", paymentStatus);
    sp.set("page", String(n));
    return `/admin/orders?${sp.toString()}`;
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-honey-dark flex items-center gap-2">
            <ShoppingCart className="w-6 h-6" />
            مدیریت سفارش‌ها
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            مجموع {toPersianDigits(totalCount)} سفارش با این فیلترها
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin">
            <ArrowLeft className="w-4 h-4 mr-1" />
            بازگشت به داشبورد
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <OrdersFilters counts={counts} />
      </Card>

      {/* Orders table */}
      <Card className="gap-4 p-5">
        <CardHeader className="px-0">
          <CardTitle className="text-base font-bold">
            فهرست سفارش‌ها
          </CardTitle>
          <CardDescription>
            صفحه {toPersianDigits(page)} از {toPersianDigits(totalPages)}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <PackageOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">
                هیچ سفارشی با این فیلترها یافت نشد.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>شماره سفارش</TableHead>
                    <TableHead>تاریخ</TableHead>
                    <TableHead>مشتری / نماینده</TableHead>
                    <TableHead>نوع</TableHead>
                    <TableHead>محتویات</TableHead>
                    <TableHead>مبلغ</TableHead>
                    <TableHead>پرداخت</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead className="text-left">جزئیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <span className="font-bold text-honey-dark">
                          {o.orderNumber}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatJalaliDateTime(o.createdAt)}
                      </TableCell>
                      <TableCell>
                        {o.orderType === "customer" ? (
                          <>
                            <Link
                              href={`/admin/customers/${encodeURIComponent(
                                o.customerPhone
                              )}`}
                              className="text-sm font-medium text-honey-dark hover:underline inline-flex items-center gap-1"
                            >
                              <User className="w-3.5 h-3.5 opacity-70" />
                              {o.customerName}
                            </Link>
                            <a
                              href={`tel:${o.customerPhone}`}
                              className="block text-[11px] text-muted-foreground hover:text-honey-dark"
                              dir="ltr"
                            >
                              {toPersianDigits(o.customerPhone)}
                            </a>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium">
                              {o.customerName}
                            </p>
                            <p
                              className="text-[11px] text-muted-foreground"
                              dir="ltr"
                            >
                              {toPersianDigits(o.customerPhone)}
                            </p>
                          </>
                        )}
                        {o.agent && (
                          <p className="text-[11px] text-muted-foreground">
                            نماینده: {o.agent.storeName}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {o.orderType === "agent" ? (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700">
                            نماینده
                          </Badge>
                        ) : (
                          <Badge variant="outline">مشتری</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {toPersianDigits(o.items.length)} قلم
                      </TableCell>
                      <TableCell className="text-sm font-bold">
                        {formatToman(o.finalAmount)}
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={o.paymentStatus} />
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={o.orderStatus} />
                      </TableCell>
                      <TableCell>
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/admin/orders/${o.id}`}>
                            <ExternalLink className="w-4 h-4" />
                            مشاهده
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4 border-t mt-4">
              <Button asChild variant="outline" size="sm" disabled={!hasPrev}>
                <Link href={pageHref(page - 1)} aria-disabled={!hasPrev}>
                  <ArrowRight className="w-4 h-4 ml-1" />
                  قبلی
                </Link>
              </Button>
              <span className="text-sm text-muted-foreground">
                صفحه {toPersianDigits(page)} از {toPersianDigits(totalPages)}
              </span>
              <Button asChild variant="outline" size="sm" disabled={!hasNext}>
                <Link href={pageHref(page + 1)} aria-disabled={!hasNext}>
                  بعدی
                  <ArrowLeft className="w-4 h-4 mr-1" />
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
