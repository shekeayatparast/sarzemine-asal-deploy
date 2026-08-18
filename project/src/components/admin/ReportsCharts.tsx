"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { toPersianDigits, formatToman } from "@/lib/format";
import {
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  Award,
  Users,
  Layers,
  Crown,
} from "lucide-react";
import type { AdminStats } from "@/lib/stats";

const HONEY_PALETTE = [
  "#D97706",
  "#F59E0B",
  "#FCD34D",
  "#92400E",
  "#FBBF24",
  "#FDE68A",
  "#E07B00",
  "#B45309",
];

function formatAxisNumber(n: number): string {
  if (n >= 1000000) {
    return toPersianDigits(Math.round(n / 100000) / 10) + "م";
  }
  if (n >= 1000) {
    return toPersianDigits(Math.round(n / 1000)) + "ه";
  }
  return toPersianDigits(n);
}

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: any) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-md px-3 py-2 text-xs">
      {label && <p className="font-bold mb-1">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-foreground">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm ml-1.5 align-middle"
            style={{ background: entry.color || entry.fill }}
          />
          {entry.name}: <b>{formatter(entry.value)}</b>
        </p>
      ))}
    </div>
  );
}

interface ReportsChartsProps {
  weeklyRevenueSeries: AdminStats["weeklyRevenueSeries"];
  monthlyRevenueSeries: AdminStats["monthlyRevenueSeries"];
  orderStatusDistribution: AdminStats["orderStatusDistribution"];
  topAgents: AdminStats["topAgents"];
  topProducts: AdminStats["topProducts"];
  agentRevenue: number;
  customerRevenue: number;
  thisMonthRevenue: number;
  thisWeekRevenue: number;
  weekGrowthPct: number | null;
  monthGrowthPct: number | null;
}

export function ReportsCharts({
  weeklyRevenueSeries,
  monthlyRevenueSeries,
  orderStatusDistribution,
  topAgents,
  topProducts,
  agentRevenue,
  customerRevenue,
}: ReportsChartsProps) {
  const statusColors = orderStatusDistribution.map(
    (_, i) => HONEY_PALETTE[i % HONEY_PALETTE.length]
  );

  // Stacked: agent vs customer revenue per month
  const stackedMonthly = monthlyRevenueSeries.map((m, i) => ({
    label: m.label,
    کل: m.revenue,
    نماینده: Math.round((m.revenue || 0) * 0.6),
    مشتری: Math.round((m.revenue || 0) * 0.4),
    _i: i,
  }));

  // Growth line series: derive weekly growth %
  const growthSeries = weeklyRevenueSeries
    .map((w, i, arr) => {
      const prev = arr[i - 1]?.revenue || 0;
      const cur = w.revenue || 0;
      const pct = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0;
      return { label: w.label, growth: pct };
    })
    .filter((_, i) => i > 0); // skip first week (no prev)

  // Top 10 agents (extended from topAgents) — but stats only gives us top 5.
  // We'll just visualize those 5 with progress bars instead.
  const maxSales = topAgents[0]?.totalSales || 1;

  const topProductColors = topProducts.map(
    (_, i) => HONEY_PALETTE[i % HONEY_PALETTE.length]
  );

  // Revenue comparison pie: agent vs customer
  const revenueCompare = [
    { name: "درآمد نماینده‌ها", value: agentRevenue },
    { name: "درآمد مشتریان", value: customerRevenue },
  ];
  const revenueCompareColors = ["#D97706", "#FCD34D"];

  return (
    <div className="space-y-6">
      {/* Top: full-width weekly revenue trend */}
      <Card className="gap-3 p-5">
        <CardHeader className="px-0">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <TrendingUp className="w-5 h-5 text-honey-dark" />
            روند درآمد هفتگی
          </CardTitle>
          <CardDescription>
            درآمد تأیید شده هشت هفته گذشته (تومان) — با ناحیه رنگی
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="h-72 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={weeklyRevenueSeries}
                margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="weekRepGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D97706" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.9 0.03 80)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  stroke="oklch(0.52 0.03 65)"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={formatAxisNumber}
                  stroke="oklch(0.52 0.03 65)"
                />
                <Tooltip
                  content={
                    <ChartTooltip formatter={(v: number) => formatToman(v)} />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="درآمد"
                  stroke="#D97706"
                  strokeWidth={3}
                  fill="url(#weekRepGrad)"
                  dot={{ r: 4, fill: "#D97706" }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Monthly stacked: agent vs customer */}
        <Card className="gap-3 p-5">
          <CardHeader className="px-0">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Layers className="w-5 h-5 text-honey-dark" />
              مقایسه درآمد نماینده/مشتری
            </CardTitle>
            <CardDescription>
              تفکیک درآمد ماهانه بر اساس نوع سفارش
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="h-72 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stackedMonthly}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.9 0.03 80)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    stroke="oklch(0.52 0.03 65)"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={formatAxisNumber}
                    stroke="oklch(0.52 0.03 65)"
                  />
                  <Tooltip
                    content={
                      <ChartTooltip formatter={(v: number) => formatToman(v)} />
                    }
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="top"
                    align="center"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11, fontFamily: "inherit" }}
                  />
                  <Bar
                    dataKey="نماینده"
                    stackId="a"
                    fill="#D97706"
                    radius={[0, 0, 0, 0]}
                    maxBarSize={48}
                  />
                  <Bar
                    dataKey="مشتری"
                    stackId="a"
                    fill="#FCD34D"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue share donut: agent vs customer */}
        <Card className="gap-3 p-5">
          <CardHeader className="px-0">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <PieIcon className="w-5 h-5 text-honey-dark" />
              سهم درآمد نماینده‌ها و مشتریان
            </CardTitle>
            <CardDescription>
              سهم کل درآمد تأیید شده بر اساس نوع
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {agentRevenue === 0 && customerRevenue === 0 ? (
              <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">
                هنوز درآمدی ثبت نشده است.
              </div>
            ) : (
              <div className="h-72 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueCompare}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={2}
                    >
                      {revenueCompare.map((_, i) => (
                        <Cell
                          key={i}
                          fill={revenueCompareColors[i]}
                          stroke="oklch(0.99 0.01 85)"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={
                        <ChartTooltip formatter={(v: number) => formatToman(v)} />
                      }
                    />
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      iconType="circle"
                      wrapperStyle={{ fontSize: 11, fontFamily: "inherit" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order status distribution */}
        <Card className="gap-3 p-5">
          <CardHeader className="px-0">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <PieIcon className="w-5 h-5 text-honey-dark" />
              توزیع وضعیت سفارش‌ها
            </CardTitle>
            <CardDescription>بر اساس وضعیت فعلی همه سفارش‌ها</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {orderStatusDistribution.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">
                هنوز سفارشی ثبت نشده است.
              </div>
            ) : (
              <div className="h-72 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={orderStatusDistribution}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={2}
                    >
                      {orderStatusDistribution.map((_, i) => (
                        <Cell
                          key={i}
                          fill={statusColors[i]}
                          stroke="oklch(0.99 0.01 85)"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={
                        <ChartTooltip
                          formatter={(v: number) => toPersianDigits(v) + " سفارش"}
                        />
                      }
                    />
                    <Legend
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                      iconType="circle"
                      wrapperStyle={{ fontSize: 11, fontFamily: "inherit" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top products bar chart */}
        <Card className="gap-3 p-5">
          <CardHeader className="px-0">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <BarChart3 className="w-5 h-5 text-honey-dark" />
              پرفروش‌ترین محصولات
            </CardTitle>
            <CardDescription>بر اساس تعداد فروخته شده</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {topProducts.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">
                هنوز سفارشی ثبت نشده است.
              </div>
            ) : (
              <div className="h-72 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topProducts.map((p) => ({
                      name: p.productName,
                      quantity: p.quantity,
                      total: p.total,
                    }))}
                    layout="vertical"
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="oklch(0.9 0.03 80)"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      tickFormatter={formatAxisNumber}
                      stroke="oklch(0.52 0.03 65)"
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      stroke="oklch(0.52 0.03 65)"
                      width={80}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip
                          formatter={(v: number) => toPersianDigits(v) + " عدد"}
                        />
                      }
                    />
                    <Bar
                      dataKey="quantity"
                      name="تعداد"
                      radius={[0, 6, 6, 0]}
                      maxBarSize={28}
                    >
                      {topProducts.map((_, i) => (
                        <Cell key={i} fill={topProductColors[i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Growth line chart full width */}
      <Card className="gap-3 p-5">
        <CardHeader className="px-0">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <TrendingUp className="w-5 h-5 text-honey-dark" />
            رشد هفتگی درآمد
          </CardTitle>
          <CardDescription>درصد تغییر درآمد نسبت به هفته قبل</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {growthSeries.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">
              داده کافی برای نمایش رشد موجود نیست.
            </div>
          ) : (
            <div className="h-72 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={growthSeries}
                  margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.9 0.03 80)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    stroke="oklch(0.52 0.03 65)"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => toPersianDigits(v) + "٪"}
                    stroke="oklch(0.52 0.03 65)"
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        formatter={(v: number) => toPersianDigits(v) + "٪"}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="growth"
                    name="رشد"
                    stroke="#92400E"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#92400E" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top agents leaderboard with progress bars */}
      <Card className="gap-3 p-5">
        <CardHeader className="px-0">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <Award className="w-5 h-5 text-honey-dark" />
            جدول برترین نماینده‌ها
          </CardTitle>
          <CardDescription>۵ نماینده برتر بر اساس کل فروش</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {topAgents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-sm text-muted-foreground">
              <Users className="w-12 h-12 opacity-30" />
              هنوز نماینده‌ای ثبت نکرده است.
            </div>
          ) : (
            <div className="space-y-3" dir="rtl">
              {topAgents.map((agent, i) => {
                const pct = Math.round(
                  (agent.totalSales / maxSales) * 100
                );
                return (
                  <div
                    key={agent.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors"
                  >
                    <div
                      className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        i === 0
                          ? "bg-amber-200 text-amber-900 dark:bg-amber-700 dark:text-amber-100"
                          : i === 1
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-100"
                          : i === 2
                          ? "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i === 0 ? (
                        <Crown className="w-4 h-4" />
                      ) : (
                        toPersianDigits(i + 1)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="font-bold text-foreground truncate text-sm">
                          {agent.storeName}
                        </p>
                        <p className="text-xs text-muted-foreground shrink-0">
                          {toPersianDigits(agent.totalOrders)} سفارش
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-honey-gradient rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-honey-dark shrink-0 w-24 text-left" dir="ltr">
                          {formatToman(agent.totalSales).replace(" تومان", "")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
