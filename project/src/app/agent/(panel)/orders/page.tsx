import { redirect } from "next/navigation";
import { getCurrentAgent } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/agent/OrderStatusBadge";
import {
  History,
  PackageOpen,
  PackageSearch,
  ChevronLeft,
} from "lucide-react";
import {
  toPersianDigits,
  formatToman,
  formatJalaliDateTime,
} from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "همه" },
  { key: "awaiting_payment", label: "در انتظار پرداخت" },
  { key: "paid", label: "پرداخت ثبت شد" },
  { key: "confirmed", label: "تأیید مدیریت" },
  { key: "shipped", label: "تحویل به پست" },
  { key: "delivered", label: "تحویل داده شده" },
];

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string }>;
}

const PAGE_SIZE = 20;

export default async function AgentOrdersPage({
  searchParams,
}: PageProps) {
  const user = await getCurrentAgent();
  if (!user) redirect("/agent/login");

  const sp = await searchParams;
  const statusFilter = sp.status || "all";
  const page = Math.max(1, parseInt(sp.page || "1", 10));

  const whereClause = {
    agentId: user.id,
    ...(statusFilter !== "all" ? { orderStatus: statusFilter } : {}),
  };

  const [orders, totalOrders] = await Promise.all([
    db.order.findMany({
      where: whereClause,
      include: { items: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.order.count({ where: whereClause }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalOrders / PAGE_SIZE));
  const currentPage = page;

  return (
    <div className="space-y-5" dir="rtl">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-honey-dark flex items-center gap-2">
            <History className="w-6 h-6" />
            تاریخچه سفارشات
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            مجموع {toPersianDigits(totalOrders)} سفارش
          </p>
        </div>
        <Button asChild className="bg-honey-gradient text-primary-foreground hover:opacity-90 shadow-md">
          <Link href="/agent/orders/new">
            <PackageOpen className="w-4 h-4 ml-1.5" />
            ثبت سفارش جدید
          </Link>
        </Button>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => {
          const active = f.key === statusFilter;
          const href =
            f.key === "all"
              ? "/agent/orders"
              : `/agent/orders?status=${f.key}`;
          return (
            <Link
              key={f.key}
              href={href}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                active
                  ? "bg-honey-gradient text-primary-foreground border-transparent shadow-sm"
                  : "bg-card text-foreground border-border hover:border-honey/40 hover:bg-accent/50"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {/* Orders table */}
      <Card className="gap-0 p-0 overflow-hidden">
        <CardHeader className="p-4 border-b">
          <CardTitle className="text-base">سفارش‌های شما</CardTitle>
          <CardDescription>
            صفحه {toPersianDigits(currentPage)} از {toPersianDigits(totalPages)}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <PackageSearch className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-bold text-foreground">
                سفارشی یافت نشد
              </p>
              <p className="text-sm text-muted-foreground">
                {statusFilter !== "all"
                  ? "با این وضعیت سفارشی وجود ندارد. می‌توانید فیلتر را تغییر دهید."
                  : "هنوز سفارشی ثبت نکرده‌اید."}
              </p>
              {statusFilter !== "all" ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/agent/orders">نمایش همه سفارش‌ها</Link>
                </Button>
              ) : (
                <Button asChild className="bg-honey-gradient text-primary-foreground">
                  <Link href="/agent/orders/new">
                    <PackageOpen className="w-4 h-4 ml-1.5" />
                    ثبت اولین سفارش
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>شماره سفارش</TableHead>
                  <TableHead>تاریخ</TableHead>
                  <TableHead>تعداد اقلام</TableHead>
                  <TableHead>مبلغ نهایی</TableHead>
                  <TableHead>پرداخت</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link
                        href={`/agent/orders/${o.id}`}
                        className="font-bold text-honey-dark hover:underline"
                      >
                        {o.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm whitespace-normal">
                      {formatJalaliDateTime(o.createdAt)}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {toPersianDigits(o.items.length)} قلم
                      </span>
                    </TableCell>
                    <TableCell className="font-bold whitespace-nowrap">
                      {formatToman(o.finalAmount)}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={o.paymentStatus} />
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={o.orderStatus} />
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm" className="gap-1">
                        <Link href={`/agent/orders/${o.id}`}>
                          جزئیات
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {currentPage > 1 && (
            <Button asChild variant="outline" size="sm">
              <Link
                href={
                  statusFilter === "all"
                    ? `/agent/orders?page=${currentPage - 1}`
                    : `/agent/orders?status=${statusFilter}&page=${currentPage - 1}`
                }
              >
                صفحه قبل
              </Link>
            </Button>
          )}
          <span className="text-sm text-muted-foreground px-3">
            صفحه {toPersianDigits(currentPage)} از{" "}
            {toPersianDigits(totalPages)}
          </span>
          {currentPage < totalPages && (
            <Button asChild variant="outline" size="sm">
              <Link
                href={
                  statusFilter === "all"
                    ? `/agent/orders?page=${currentPage + 1}`
                    : `/agent/orders?status=${statusFilter}&page=${currentPage + 1}`
                }
              >
                صفحه بعد
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
