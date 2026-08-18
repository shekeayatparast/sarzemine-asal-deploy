import { db } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AgentOrderHistoryTable } from "@/components/admin/AgentOrderHistoryTable";
import {
  ArrowRight,
  User as UserIcon,
  Phone,
  MapPin,
  Home as HomeIcon,
  ShoppingBag,
  Coins,
  Calendar,
  CalendarClock,
  ExternalLink,
  Store,
  Info,
} from "lucide-react";
import {
  toPersianDigits,
  formatToman,
  formatJalaliDateTime,
  formatJalaliDate,
  persianToEnglishDigits,
} from "@/lib/format";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ phone: string }>;
}

export default async function AdminCustomerDetailsPage({
  params,
}: PageProps) {
  const user = await getCurrentAdmin();
  if (!user) redirect("/admin/login");

  // The [phone] param is the URL-encoded phone number (digits only — safe,
  // but we decode + normalize Persian digits anyway).
  const { phone: rawPhone } = await params;
  const phone = persianToEnglishDigits(decodeURIComponent(rawPhone));

  // Fetch ALL of this customer's orders with their items + agent linkage.
  // We include the agent relation so we can show "this order was placed by
  // an agent on the customer's behalf" hints in the order history.
  const orders = await db.order.findMany({
    where: { customerPhone: phone },
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      customerPhone: true,
      province: true,
      city: true,
      address: true,
      finalAmount: true,
      orderStatus: true,
      paymentStatus: true,
      orderType: true,
      createdAt: true,
      agent: { select: { id: true, name: true, storeName: true } },
      items: {
        select: {
          id: true,
          productId: true,
          productName: true,
          containerSize: true,
          hasWax: true,
          isWholesale: true,
          quantity: true,
          unitPrice: true,
          total: true,
        },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  if (orders.length === 0) {
    // No orders for this phone → not a real customer → 404
    notFound();
  }

  // The latest order (first in the array, since ordered by createdAt desc)
  // gives us the canonical name / address info to show in the customer card.
  const latest = orders[0];
  const customerName = latest.customerName;
  const province = latest.province;
  const city = latest.city;
  const address = latest.address;

  // Aggregate stats from the fetched orders. Note: this is bounded by the
  // `take: 200` cap above, so for customers with more than 200 orders we
  // fall back to a separate aggregate query for accurate totals.
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((s, o) => s + o.finalAmount, 0);
  const lastOrderDate = orders[0].createdAt;
  const firstOrderDate = orders[orders.length - 1].createdAt;

  // If we hit the 200-cap, run a groupBy to get the true totals.
  let trueTotalOrders = totalOrders;
  let trueTotalSpent = totalSpent;
  let trueFirstOrderDate: Date | null = firstOrderDate;
  let trueLastOrderDate: Date | null = lastOrderDate;
  if (totalOrders >= 200) {
    const agg = await db.order.groupBy({
      by: ["customerPhone"],
      where: { customerPhone: phone },
      _count: { id: true },
      _sum: { finalAmount: true },
      _min: { createdAt: true },
      _max: { createdAt: true },
    });
    const a = agg[0];
    if (a) {
      trueTotalOrders = a._count.id;
      trueTotalSpent = a._sum.finalAmount ?? 0;
      trueFirstOrderDate = a._min.createdAt;
      trueLastOrderDate = a._max.createdAt;
    }
  }

  // Count agent-placed orders for this customer (orders placed on their
  // behalf by an agent).
  const agentPlacedCount = orders.filter((o) => o.orderType === "agent").length;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Breadcrumb + header */}
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-mr-2">
          <Link href="/admin/customers">
            <ArrowRight className="w-4 h-4 ml-1" />
            بازگشت به فهرست مشتریان
          </Link>
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-honey-gradient flex items-center justify-center text-primary-foreground text-lg font-bold shrink-0">
              {customerName?.charAt(0) || "?"}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-honey-dark">
                {customerName}
              </h1>
              <a
                href={`tel:${phone}`}
                className="text-sm text-muted-foreground hover:text-honey-dark inline-flex items-center gap-1.5"
                dir="ltr"
              >
                <Phone className="w-3.5 h-3.5" />
                {toPersianDigits(phone)}
              </a>
            </div>
          </div>
          <Badge
            variant="outline"
            className="bg-honey-light/40 text-honey-dark border-honey/30"
          >
            <UserIcon className="w-3 h-3 ml-1" />
            مشتری
          </Badge>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat
          icon={<ShoppingBag className="w-5 h-5" />}
          label="کل سفارش‌ها"
          value={`${toPersianDigits(trueTotalOrders)} سفارش`}
          color="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
        />
        <MiniStat
          icon={<Coins className="w-5 h-5" />}
          label="مجموع خرید"
          value={formatToman(trueTotalSpent)}
          color="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
        />
        <MiniStat
          icon={<Calendar className="w-5 h-5" />}
          label="اولین سفارش"
          value={trueFirstOrderDate ? formatJalaliDate(trueFirstOrderDate) : "—"}
          color="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
        />
        <MiniStat
          icon={<CalendarClock className="w-5 h-5" />}
          label="آخرین سفارش"
          value={trueLastOrderDate ? formatJalaliDate(trueLastOrderDate) : "—"}
          color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
        />
      </div>

      {/* Agent-placed hint */}
      {agentPlacedCount > 0 && (
        <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-3 text-sm">
            <Store className="w-5 h-5 text-amber-700 dark:text-amber-300 shrink-0" />
            <p className="text-amber-800 dark:text-amber-200">
              <b>{toPersianDigits(agentPlacedCount)}</b> سفارش از مجموع{" "}
              <b>{toPersianDigits(trueTotalOrders)}</b> سفارش این مشتری توسط{" "}
              <b>نماینده</b> ثبت شده است.
            </p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Customer info (2 cols) */}
        <Card className="lg:col-span-2 gap-4 p-5">
          <CardHeader className="px-0">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-honey-dark" />
              اطلاعات مشتری
            </CardTitle>
            <CardDescription>
              بر اساس آخرین سفارش ثبت‌شده
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow
                icon={<UserIcon className="w-4 h-4" />}
                label="نام و نام خانوادگی"
                value={customerName}
              />
              <InfoRow
                icon={<Phone className="w-4 h-4" />}
                label="شماره تماس"
                value={toPersianDigits(phone)}
                dir="ltr"
                href={`tel:${phone}`}
              />
              <InfoRow
                icon={<MapPin className="w-4 h-4" />}
                label="استان / شهر"
                value={`${province} / ${city}`}
              />
              <InfoRow
                icon={<Calendar className="w-4 h-4" />}
                label="اولین سفارش"
                value={trueFirstOrderDate ? formatJalaliDateTime(trueFirstOrderDate) : "—"}
              />
              <InfoRow
                icon={<CalendarClock className="w-4 h-4" />}
                label="آخرین سفارش"
                value={trueLastOrderDate ? formatJalaliDateTime(trueLastOrderDate) : "—"}
              />
              <InfoRow
                icon={<ShoppingBag className="w-4 h-4" />}
                label="تعداد کل سفارش‌ها"
                value={`${toPersianDigits(trueTotalOrders)} سفارش`}
              />
            </div>

            {address && (
              <>
                <Separator className="my-4" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                    <HomeIcon className="w-3.5 h-3.5" />
                    آدرس (آخرین سفارش)
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {address}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Financial summary (1 col) */}
        <Card className="gap-4 p-5 bg-cream-gradient">
          <CardHeader className="px-0">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Coins className="w-5 h-5 text-honey-dark" />
              خلاصه خرید
            </CardTitle>
            <CardDescription>وضعیت سفارش‌ها و مبلغ کل</CardDescription>
          </CardHeader>
          <CardContent className="px-0 space-y-3">
            <FinancialRow
              label="مجموع خرید"
              value={formatToman(trueTotalSpent)}
            />
            <FinancialRow
              label="میانگین هر سفارش"
              value={formatToman(
                trueTotalOrders > 0
                  ? Math.round(trueTotalSpent / trueTotalOrders)
                  : 0
              )}
            />
            <Separator />
            <FinancialRow
              label="تعداد سفارش"
              value={`${toPersianDigits(trueTotalOrders)} سفارش`}
            />
            <FinancialRow
              label="سفارش‌های ثبت‌شده توسط نماینده"
              value={`${toPersianDigits(agentPlacedCount)} سفارش`}
            />
            <Separator />
            <div className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <p>
                آمار مبلغ و تعداد سفارش بر اساس داده‌های واقعی سفارش‌ها در
                پایگاه داده محاسبه شده است.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order history */}
      <Card className="gap-4 p-5">
        <CardHeader className="px-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-honey-dark" />
                تاریخچه سفارش‌ها
              </CardTitle>
              <CardDescription>
                {toPersianDigits(orders.length)} سفارش اخیر — برای مشاهده
                جزئیات اقلام هر سفارش روی دکمهٔ «جزئیات» بزنید
              </CardDescription>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/orders?orderType=customer`}>
                <ExternalLink className="w-4 h-4 ml-1" />
                همه سفارش‌های مشتری در مدیریت سفارش‌ها
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <AgentOrderHistoryTable orders={orders} />
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card className="p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-bold text-foreground truncate">{value}</p>
      </div>
    </Card>
  );
}

function InfoRow({
  icon,
  label,
  value,
  dir,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
  href?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      {href ? (
        <a
          href={href}
          className="text-sm font-bold text-honey-dark hover:underline"
          dir={dir}
        >
          {value}
        </a>
      ) : (
        <p className="text-sm font-bold text-foreground" dir={dir}>
          {value}
        </p>
      )}
    </div>
  );
}

function FinancialRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground">{value}</span>
    </div>
  );
}
