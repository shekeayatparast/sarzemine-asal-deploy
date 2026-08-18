import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeAdminStats } from "@/lib/stats";
import type { AdminStats } from "@/lib/stats";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StatCard } from "@/components/admin/StatCard";
import { AdminDashboardCharts } from "@/components/admin/AdminDashboardCharts";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Coins,
  ShoppingCart,
  Users,
  TrendingUp,
  ArrowLeft,
  Bell,
  UserCheck,
  Package,
  Wallet,
} from "lucide-react";
import {
  toPersianDigits,
  formatToman,
  formatJalaliDateTime,
} from "@/lib/format";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/agent/OrderStatusBadge";

export const dynamic = "force-dynamic";

// Reverse Persian label → status key (for the OrderStatusBadge component)
function reverseStatusLabel(label: string): string {
  const map: Record<string, string> = {
    "در انتظار پرداخت": "awaiting_payment",
    "پرداخت ثبت شد": "paid",
    "تأیید مدیریت": "confirmed",
    "در حال آماده‌سازی": "preparing",
    "تحویل به پست": "shipped",
    "تحویل داده شد": "delivered",
    "لغو شد": "cancelled",
  };
  return map[label] ?? label;
}

export default async function AdminDashboardPage() {
  const user = await getCurrentAdmin();
  if (!user) redirect("/admin/login");

  // Layout already validates the admin session — safe to compute stats here.
  const admin = await db.admin.findUnique({
    where: { id: user.id },
    select: { name: true, role: true, lastLoginAt: true },
  });
  if (!admin) redirect("/admin/login");

  let stats: AdminStats;
  try {
    stats = await computeAdminStats();
  } catch (err) {
    console.error("[admin dashboard] stats error:", err);
    stats = {
      totalAgents: 0,
      activeAgents: 0,
      pendingAgents: 0,
      blockedAgents: 0,
      totalOrders: 0,
      agentOrders: 0,
      customerOrders: 0,
      totalRevenue: 0,
      agentRevenue: 0,
      customerRevenue: 0,
      totalCommissionPaid: 0,
      thisWeekRevenue: 0,
      thisMonthRevenue: 0,
      weekGrowthPct: null,
      monthGrowthPct: null,
      weeklyRevenueSeries: [],
      monthlyRevenueSeries: [],
      topAgents: [],
      topProducts: [],
      orderStatusDistribution: [],
      recentAgents: [],
      recentOrders: [],
    };
  }

  const pendingCount = stats.pendingAgents;
  const greeting = admin.name ? `سلام ${admin.name} 👋` : "سلام 👋";

  return (
    <div className="space-y-6" dir="rtl">
      {/* Welcome */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-honey-dark">
            {greeting}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            خلاصه‌ای از وضعیت سرزمین عسل در یک نگاه
            {admin.lastLoginAt && (
              <span className="block sm:inline sm:mr-2">
                — آخرین ورود: {formatJalaliDateTime(admin.lastLoginAt)}
              </span>
            )}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/reports">
            <BarChartIcon />
            مشاهده گزارش کامل
          </Link>
        </Button>
      </div>

      {/* Pending agents banner */}
      {pendingCount > 0 && (
        <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="flex-1 min-w-0">
              <b className="text-amber-700 dark:text-amber-300">
                {toPersianDigits(pendingCount)} درخواست نمایندگی جدید
              </b>{" "}
              در انتظار تأیید شما هستند.
            </p>
            <Button asChild size="sm" className="bg-honey-gradient text-primary-foreground">
              <Link href="/admin/agents?status=pending">
                <UserCheck className="w-4 h-4" />
                بررسی درخواست‌ها
              </Link>
            </Button>
          </div>
        </Card>
      )}

      {/* Top stat row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="درآمد کل"
          value={formatToman(stats.totalRevenue)}
          icon={Coins}
          iconClassName="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
          growthPct={stats.monthGrowthPct}
          growthLabel="رشد ماهانه"
        />
        <StatCard
          title="کل سفارش‌ها"
          value={toPersianDigits(stats.totalOrders) + " سفارش"}
          icon={ShoppingCart}
          iconClassName="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
          growthPct={stats.weekGrowthPct}
          growthLabel="رشد هفتگی"
        />
        <StatCard
          title="نماینده‌های فعال"
          value={toPersianDigits(stats.activeAgents) + " نفر"}
          icon={Users}
          iconClassName="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
          hint={`${toPersianDigits(stats.pendingAgents)} در انتظار، ${toPersianDigits(stats.blockedAgents)} مسدود`}
        />
        <StatCard
          title="پورسانت پرداختی"
          value={formatToman(stats.totalCommissionPaid)}
          icon={Wallet}
          iconClassName="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
          hint="مجموع پورسانت نماینده‌ها"
        />
      </div>

      {/* Secondary mini stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat
          label="درآمد این هفته"
          value={formatToman(stats.thisWeekRevenue)}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <MiniStat
          label="درآمد این ماه"
          value={formatToman(stats.thisMonthRevenue)}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <MiniStat
          label="سفارش‌های نماینده"
          value={toPersianDigits(stats.agentOrders)}
          icon={<Package className="w-4 h-4" />}
        />
        <MiniStat
          label="سفارش‌های مشتری"
          value={toPersianDigits(stats.customerOrders)}
          icon={<Package className="w-4 h-4" />}
        />
      </div>

      {/* Charts */}
      <AdminDashboardCharts
        weeklyRevenueSeries={stats.weeklyRevenueSeries}
        monthlyRevenueSeries={stats.monthlyRevenueSeries}
        orderStatusDistribution={stats.orderStatusDistribution}
        topAgents={stats.topAgents}
      />

      {/* Two columns: recent agents + recent orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Recent agents */}
        <Card className="gap-4 p-5">
          <CardHeader className="px-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-honey-dark" />
                  نماینده‌های جدید
                </CardTitle>
                <CardDescription>پنج درخواست اخیر</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/agents">
                  مشاهده همه
                  <ArrowLeft className="w-4 h-4 mr-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-0">
            {stats.recentAgents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-center text-sm text-muted-foreground">
                <Users className="w-10 h-10 opacity-30" />
                هنوز نماینده‌ای ثبت نکرده است.
              </div>
            ) : (
              <div className="space-y-2">
                {stats.recentAgents.map((a) => (
                  <Link
                    key={a.id}
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
                        {a.storeName} — {toPersianDigits(a.phone)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusBadge status={a.status} />
                      <span className="text-[11px] text-muted-foreground">
                        {formatJalaliDateTime(a.createdAt)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent orders */}
        <Card className="gap-4 p-5">
          <CardHeader className="px-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-honey-dark" />
                  سفارش‌های اخیر
                </CardTitle>
                <CardDescription>پنج سفارش آخر</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/orders">
                  مشاهده همه
                  <ArrowLeft className="w-4 h-4 mr-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-0">
            {stats.recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-center text-sm text-muted-foreground">
                <ShoppingCart className="w-10 h-10 opacity-30" />
                هنوز سفارشی ثبت نشده است.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>سفارش</TableHead>
                    <TableHead>نوع</TableHead>
                    <TableHead>مبلغ</TableHead>
                    <TableHead>پرداخت</TableHead>
                    <TableHead>وضعیت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <div>
                          <p className="font-bold text-honey-dark">
                            {o.orderNumber}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {o.customerName}
                          </p>
                        </div>
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
                      <TableCell className="font-bold text-sm">
                        {formatToman(o.finalAmount)}
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge
                          status={
                            o.paymentStatus === "تأیید شده" ? "confirmed" : "pending"
                          }
                        />
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
      </div>

      {/* All agents quick list */}
      <Card className="gap-4 p-5">
        <CardHeader className="px-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-honey-dark" />
                نماینده‌های فعال
              </CardTitle>
              <CardDescription>
                کلی از وضعیت همه نماینده‌ها (برای جزئیات روی هر ردیف کلیک کنید)
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/agents">
                مدیریت همه
                <ArrowLeft className="w-4 h-4 mr-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <ActiveAgentsList />
        </CardContent>
      </Card>
    </div>
  );
}

// Quick active agents table — server component that queries DB directly
async function ActiveAgentsList() {
  const agents = await db.agent
    .findMany({
      where: { status: "active" },
      select: {
        id: true,
        name: true,
        storeName: true,
        phone: true,
        province: true,
        city: true,
        commissionRate: true,
        totalSales: true,
        totalOrders: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { totalSales: "desc" },
      take: 8,
    })
    .catch(() => []);

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center text-sm text-muted-foreground">
        <Users className="w-10 h-10 opacity-30" />
        هنوز نماینده فعالی ثبت نشده است.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>نام</TableHead>
          <TableHead>فروشگاه</TableHead>
          <TableHead>استان / شهر</TableHead>
          <TableHead>تلفن</TableHead>
          <TableHead>سفارش‌ها</TableHead>
          <TableHead>فروش کل</TableHead>
          <TableHead>پورسانت</TableHead>
          <TableHead>آخرین ورود</TableHead>
      </TableRow>
      </TableHeader>
      <TableBody>
        {agents.map((a) => (
          <TableRow key={a.id}>
            <TableCell>
              <Link
                href={`/admin/agents/${a.id}`}
                className="font-bold text-honey-dark hover:underline"
              >
                {a.name}
              </Link>
            </TableCell>
            <TableCell className="text-sm">{a.storeName}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {a.province} / {a.city}
            </TableCell>
            <TableCell className="text-sm" dir="ltr">
              {toPersianDigits(a.phone)}
            </TableCell>
            <TableCell className="text-sm">
              {toPersianDigits(a.totalOrders)}
            </TableCell>
            <TableCell className="text-sm font-bold">
              {formatToman(a.totalSales)}
            </TableCell>
            <TableCell className="text-sm">
              <Badge className="bg-honey-light/40 text-honey-dark border-honey/20">
                {toPersianDigits(a.commissionRate)}٪
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {a.lastLoginAt ? formatJalaliDateTime(a.lastLoginAt) : "بدون ورود"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
      <div className="w-9 h-9 rounded-lg bg-honey-light/30 flex items-center justify-center text-honey-dark shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-bold text-foreground truncate">{value}</p>
      </div>
    </Card>
  );
}

function BarChartIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}
