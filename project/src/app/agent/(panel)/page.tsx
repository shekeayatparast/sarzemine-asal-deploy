import { redirect } from "next/navigation";
import { getCurrentAgent } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeAgentStats } from "@/lib/stats";
import type { AgentStats } from "@/lib/stats";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { StatCard } from "@/components/agent/StatCard";
import { DashboardCharts } from "@/components/agent/DashboardCharts";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/agent/OrderStatusBadge";
import {
  Wallet,
  ShoppingBag,
  TrendingUp,
  Clock,
  Coins,
  PackageOpen,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  toPersianDigits,
  formatToman,
  formatJalaliDateTime,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AgentDashboardPage() {
  const user = await getCurrentAgent();
  if (!user) redirect("/agent/login");

  // Layout already checks status === active, so safe to compute stats here.
  // (If something odd happened, stats call will throw — but layout guards this.)
  let stats: AgentStats;
  let agent: {
    name: string;
    storeName: string;
    phone: string;
    commissionRate: number;
    balance: number;
    totalSales: number;
    totalOrders: number;
    province: string;
    city: string;
    createdAt: Date;
  };

  try {
    const found = await db.agent.findUnique({
      where: { id: user.id },
      select: {
        name: true,
        storeName: true,
        phone: true,
        commissionRate: true,
        balance: true,
        totalSales: true,
        totalOrders: true,
        province: true,
        city: true,
        createdAt: true,
      },
    });
    if (!found) redirect("/agent/login");
    agent = found;
    stats = await computeAgentStats(user.id);
  } catch (err) {
    console.error("[agent dashboard] error:", err);
    redirect("/agent/login");
  }

  const helloName = agent.name;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Welcome */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-honey-dark">
            سلام {helloName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            فروشگاه: <b className="text-foreground">{agent.storeName}</b> —{" "}
            استان {agent.province}، شهر {agent.city}
          </p>
        </div>
        <Button asChild className="bg-honey-gradient text-primary-foreground hover:opacity-90 shadow-md">
          <Link href="/agent/orders/new">
            <PackageOpen className="w-4 h-4 ml-1.5" />
            ثبت سفارش جدید
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="فروش این ماه"
          value={formatToman(stats.thisMonthSales)}
          icon={TrendingUp}
          growthPct={stats.monthGrowthPct}
          growthLabel="نسبت به ماه قبل"
        />
        <StatCard
          title="کل سفارش‌ها"
          value={toPersianDigits(stats.totalOrders) + " سفارش"}
          icon={ShoppingBag}
          growthPct={stats.weekGrowthPct}
          growthLabel="رشد هفتگی"
        />
        <StatCard
          title="پورسانت کسب‌شده"
          value={formatToman(stats.totalCommission)}
          icon={Coins}
          iconClassName="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
        />
        <StatCard
          title="موجودی حساب"
          value={formatToman(stats.balance)}
          icon={Wallet}
          iconClassName="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
        />
      </div>

      {/* Pending orders banner (if any) */}
      {stats.pendingOrders > 0 && (
        <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-3 text-sm">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <p>
              شما{" "}
              <b className="text-amber-700 dark:text-amber-300">
                {toPersianDigits(stats.pendingOrders)} سفارش
              </b>{" "}
              در انتظار پرداخت دارید.{" "}
              <Link
                href="/agent/orders"
                className="underline font-bold hover:opacity-80"
              >
                مشاهده سفارش‌ها
              </Link>
            </p>
          </div>
        </Card>
      )}

      {/* Charts */}
      <DashboardCharts
        weeklySeries={stats.weeklySeries}
        monthlySeries={stats.monthlySeries}
        orderStatusDistribution={stats.orderStatusDistribution}
        topProducts={stats.topProducts}
      />

      {/* Recent orders */}
      <Card className="gap-4 p-5">
        <CardHeader className="px-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold">
                آخرین سفارش‌ها
              </CardTitle>
              <CardDescription>پنج سفارش اخیر شما</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/agent/orders">مشاهده همه</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {stats.recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <ShoppingBag className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">
                هنوز سفارشی ثبت نکرده‌اید.
              </p>
              <Button asChild className="bg-honey-gradient text-primary-foreground">
                <Link href="/agent/orders/new">
                  <PackageOpen className="w-4 h-4 ml-1.5" />
                  ثبت اولین سفارش
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>شماره سفارش</TableHead>
                  <TableHead>تاریخ</TableHead>
                  <TableHead>مبلغ</TableHead>
                  <TableHead>وضعیت پرداخت</TableHead>
                  <TableHead>وضعیت سفارش</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link
                        href={`/agent/orders/${o.id}`}
                        className="font-bold text-honey-dark hover:underline"
                      >
                        {o.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatJalaliDateTime(o.createdAt)}
                    </TableCell>
                    <TableCell className="font-bold">
                      {formatToman(o.finalAmount)}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={o.paymentStatus === "تأیید شده" ? "confirmed" : "pending"} />
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge
                        status={reverseStatusLabel(o.orderStatus)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Agent info card */}
      <Card className="p-5 bg-cream-gradient">
        <CardHeader className="px-0">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Wallet className="w-5 h-5 text-honey-dark" />
            اطلاعات حساب
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <Info label="نرخ پورسانت" value={`${toPersianDigits(agent.commissionRate)}٪`} />
            <Info label="فروش کل" value={formatToman(agent.totalSales)} />
            <Info label="موجودی" value={formatToman(agent.balance)} />
            <Info label="سفارش‌های کل" value={toPersianDigits(agent.totalOrders)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-bold text-foreground">{value}</p>
    </div>
  );
}

// Reverse the Persian label back to the status key for the badge
function reverseStatusLabel(label: string): string {
  const map: Record<string, string> = {
    "در انتظار پرداخت": "awaiting_payment",
    "پرداخت شده": "paid",
    "تأیید شده": "confirmed",
    "در حال آماده‌سازی": "preparing",
    "ارسال شده": "shipped",
    "تحویل داده شده": "delivered",
    "لغو شده": "cancelled",
  };
  return map[label] ?? label;
}
