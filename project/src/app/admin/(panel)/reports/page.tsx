import { getCurrentAdmin } from "@/lib/auth";
import { computeAdminStats } from "@/lib/stats";
import type { AdminStats, ReportPeriod } from "@/lib/stats";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { StatCard } from "@/components/admin/StatCard";
import { ReportsCharts } from "@/components/admin/ReportsCharts";
import { DownloadAgentsCsvButton } from "@/components/admin/DownloadAgentsCsvButton";
import { DownloadReportsPdfButton } from "@/components/admin/DownloadReportsPdfButton";
import { ReportsPeriodFilter } from "@/components/admin/ReportsPeriodFilter";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Coins,
  ShoppingCart,
  Users,
  TrendingUp,
  Wallet,
  Package,
  BarChart3,
  ArrowLeft,
  Calendar,
  Store,
} from "lucide-react";
import {
  toPersianDigits,
  formatToman,
  formatJalaliDate,
} from "@/lib/format";

export const dynamic = "force-dynamic";

function parsePeriod(s: string | undefined): ReportPeriod {
  if (s === "weekly" || s === "monthly" || s === "yearly") return s;
  return "monthly";
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getCurrentAdmin();
  if (!user) redirect("/admin/login");

  const sp = await searchParams;
  const period = parsePeriod(sp.period);

  let stats: AdminStats;
  try {
    stats = await computeAdminStats({ period });
  } catch (err) {
    console.error("[admin reports] stats error:", err);
    redirect("/admin/login");
  }

  // Derived metrics
  const totalRevenue = stats.totalRevenue;
  const avgOrderValue =
    stats.periodOrders > 0
      ? Math.round(totalRevenue / stats.periodOrders)
      : 0;
  const activeRate =
    stats.totalAgents > 0
      ? Math.round((stats.activeAgents / stats.totalAgents) * 100)
      : 0;

  const today = formatJalaliDate(new Date());

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-honey-dark flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            گزارش‌ها و تحلیل‌ها
            <span className="text-sm font-normal text-muted-foreground">
              ({stats.periodLabel})
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            تاریخ گزارش: {today} • بازه: {formatJalaliDate(stats.periodRangeStart)} تا {formatJalaliDate(stats.periodRangeEnd)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Suspense fallback={null}>
            <ReportsPeriodFilter />
          </Suspense>
          <Suspense fallback={null}>
            <DownloadReportsPdfButton />
          </Suspense>
          <DownloadAgentsCsvButton />
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin">
              <ArrowLeft className="w-4 h-4 mr-1" />
              بازگشت به داشبورد
            </Link>
          </Button>
        </div>
      </div>

      {/* Main stat grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={`درآمد ${stats.periodLabel}`}
          value={formatToman(stats.totalRevenue)}
          icon={Coins}
          iconClassName="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
          growthPct={stats.monthGrowthPct}
          growthLabel="رشد ماهانه"
        />
        <StatCard
          title="درآمد این ماه"
          value={formatToman(stats.thisMonthRevenue)}
          icon={TrendingUp}
          iconClassName="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
          hint={`درآمد این هفته: ${formatToman(stats.thisWeekRevenue)}`}
        />
        <StatCard
          title="میانگین ارزش سفارش"
          value={formatToman(avgOrderValue)}
          icon={ShoppingCart}
          iconClassName="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
          hint={`${toPersianDigits(stats.periodOrders)} سفارش در دوره • ${toPersianDigits(stats.totalOrders)} سفارش کل`}
        />
        <StatCard
          title="پورسانت پرداختی"
          value={formatToman(stats.totalCommissionPaid)}
          icon={Wallet}
          iconClassName="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
          hint="مجموع پورسانت نماینده‌ها"
        />
      </div>

      {/* Secondary mini stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat
          icon={<Users className="w-5 h-5" />}
          label="کل نماینده‌ها"
          value={toPersianDigits(stats.totalAgents) + " نفر"}
          color="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
        />
        <MiniStat
          icon={<Users className="w-5 h-5" />}
          label="نماینده‌های فعال"
          value={`${toPersianDigits(stats.activeAgents)} (${toPersianDigits(activeRate)}٪)`}
          color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
        />
        <MiniStat
          icon={<Store className="w-5 h-5" />}
          label="درآمد نماینده‌ها"
          value={formatToman(stats.agentRevenue)}
          color="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
        />
        <MiniStat
          icon={<Package className="w-5 h-5" />}
          label="درآمد مشتریان"
          value={formatToman(stats.customerRevenue)}
          color="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
        />
      </div>

      {/* Charts */}
      <ReportsCharts
        weeklyRevenueSeries={stats.weeklyRevenueSeries}
        monthlyRevenueSeries={stats.monthlyRevenueSeries}
        orderStatusDistribution={stats.orderStatusDistribution}
        topAgents={stats.topAgents}
        topProducts={stats.topProducts}
        agentRevenue={stats.agentRevenue}
        customerRevenue={stats.customerRevenue}
        thisMonthRevenue={stats.thisMonthRevenue}
        thisWeekRevenue={stats.thisWeekRevenue}
        weekGrowthPct={stats.weekGrowthPct}
        monthGrowthPct={stats.monthGrowthPct}
        weeklySeriesLabel={stats.weeklySeriesLabel}
        monthlySeriesLabel={stats.monthlySeriesLabel}
        periodLabel={stats.periodLabel}
      />

      {/* Top products table */}
      <Card className="gap-4 p-5">
        <CardHeader className="px-0">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Package className="w-5 h-5 text-honey-dark" />
            جزئیات پرفروش‌ترین محصولات
          </CardTitle>
          <CardDescription>
            ۵ محصول برتر در دوره {stats.periodLabel.toLowerCase()} بر اساس تعداد و درآمد
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {stats.topProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <Package className="w-12 h-12 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">
                هنوز محصولی فروخته نشده است.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-right">
                    <th className="pb-2 font-medium text-muted-foreground">رتبه</th>
                    <th className="pb-2 font-medium text-muted-foreground">محصول</th>
                    <th className="pb-2 font-medium text-muted-foreground text-left">تعداد</th>
                    <th className="pb-2 font-medium text-muted-foreground text-left">درآمد</th>
                    <th className="pb-2 font-medium text-muted-foreground text-left">میانگین قیمت</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topProducts.map((p, i) => {
                    const avgPrice =
                      p.quantity > 0 ? Math.round(p.total / p.quantity) : 0;
                    return (
                      <tr key={p.productName} className="border-b last:border-0">
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                              i === 0
                                ? "bg-amber-200 text-amber-900 dark:bg-amber-700 dark:text-amber-100"
                                : i === 1
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-100"
                                : i === 2
                                ? "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {toPersianDigits(i + 1)}
                          </span>
                        </td>
                        <td className="py-3 font-bold text-foreground">
                          {p.productName}
                        </td>
                        <td className="py-3 text-left font-bold">
                          {toPersianDigits(p.quantity)} عدد
                        </td>
                        <td className="py-3 text-left font-bold text-honey-dark">
                          {formatToman(p.total)}
                        </td>
                        <td className="py-3 text-left text-muted-foreground">
                          {formatToman(avgPrice)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent activity summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card className="gap-4 p-5">
          <CardHeader className="px-0">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-honey-dark" />
              جدیدترین نماینده‌ها
            </CardTitle>
            <CardDescription>۵ ثبت‌نام اخیر</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {stats.recentAgents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                هنوز کسی ثبت‌نام نکرده است.
              </p>
            ) : (
              <ul className="space-y-2">
                {stats.recentAgents.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/admin/agents/${a.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full bg-honey-gradient flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">
                        {a.name?.charAt(0) || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">
                          {a.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {a.storeName}
                        </p>
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {formatJalaliDate(a.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="gap-4 p-5">
          <CardHeader className="px-0">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-honey-dark" />
              آخرین سفارش‌ها
            </CardTitle>
            <CardDescription>۵ سفارش اخیر</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {stats.recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                هنوز سفارشی ثبت نشده است.
              </p>
            ) : (
              <ul className="space-y-2">
                {stats.recentOrders.map((o) => (
                  <li key={o.id}>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-honey-dark">
                          {o.orderNumber}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {o.customerName} — {o.orderType === "agent" ? "نماینده" : "مشتری"}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-foreground shrink-0">
                        {formatToman(o.finalAmount)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
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
