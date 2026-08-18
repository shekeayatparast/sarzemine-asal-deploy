"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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
  Inbox,
} from "lucide-react";
import type { AgentStats } from "@/lib/stats";

// Honey color palette for charts (no indigo/blue) — 7 stops from dark to light
// so every status in the donut gets a distinct shade.
const HONEY_PALETTE = [
  "#92400E", // amber-900 (darkest)
  "#B45309", // amber-700
  "#D97706", // honey-dark / amber-600
  "#F59E0B", // amber-500
  "#FBBF24", // amber-400
  "#FCD34D", // amber-300
  "#FDE68A", // amber-200
];

// ── Helpers ──────────────────────────────────────────────────────────

function formatAxisNumber(n: number): string {
  if (n >= 1000000) {
    return toPersianDigits(Math.round(n / 100000) / 10) + "م";
  }
  if (n >= 1000) {
    return toPersianDigits(Math.round(n / 1000)) + "ه";
  }
  return toPersianDigits(n);
}

function ChartEmptyState({ label }: { label: string }) {
  return (
    <div className="h-64 flex flex-col items-center justify-center gap-2 text-center">
      <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
        <Inbox className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

// Custom tooltip so we can show Persian digits + Toman suffix
function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; fill?: string }>;
  label?: string;
  formatter: (v: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      dir="rtl"
      className="bg-card border border-border rounded-lg shadow-md px-3 py-2 text-xs space-y-1"
    >
      {label && <p className="font-bold">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="text-foreground flex items-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
            style={{ background: entry.color || entry.fill }}
          />
          <span>{entry.name}:</span>
          <b dir="ltr">{formatter(Number(entry.value ?? 0))}</b>
        </p>
      ))}
    </div>
  );
}

interface DashboardChartsProps {
  weeklySeries: AgentStats["weeklySeries"];
  monthlySeries: AgentStats["monthlySeries"];
  orderStatusDistribution: AgentStats["orderStatusDistribution"];
  topProducts: AgentStats["topProducts"];
}

export function DashboardCharts({
  weeklySeries,
  monthlySeries,
  orderStatusDistribution,
  topProducts,
}: DashboardChartsProps) {
  // Donut: only render slices that have at least one order. The stats layer
  // always returns all 7 statuses (with count 0 for missing ones) so the
  // legend stays stable; here we visually drop the empty slices.
  const donutData = orderStatusDistribution.filter((d) => d.count > 0);
  const totalOrdersInDist = donutData.reduce((s, d) => s + d.count, 0);

  // Color assignment for donut slices — cycle through palette but keep the
  // color stable per status (i.e. "awaiting_payment" is always palette[0]).
  const STATUS_COLOR_INDEX: Record<string, number> = {
    "در انتظار پرداخت": 0,
    "پرداخت ثبت شد": 1,
    "تأیید مدیریت": 2,
    "در حال آماده‌سازی": 3,
    "تحویل به پست": 4,
    "تحویل داده شد": 5,
    "لغو شد": 6,
  };

  const productColors = topProducts.map(
    (_, i) => HONEY_PALETTE[i % HONEY_PALETTE.length]
  );

  const weeklyTotal = weeklySeries.reduce((s, w) => s + w.sales, 0);
  const monthlyTotal = monthlySeries.reduce((s, m) => s + m.sales, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      {/* Weekly sales line chart */}
      <Card className="gap-3 p-5">
        <CardHeader className="px-0">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <TrendingUp className="w-5 h-5 text-honey-dark" />
            روند فروش هفتگی
          </CardTitle>
          <CardDescription>
            فروش هشت هفته گذشته (تومان)
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {weeklyTotal === 0 ? (
            <ChartEmptyState label="هنوز فروشی در این بازه ثبت نشده است." />
          ) : (
            <div className="h-64 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={weeklySeries}
                  margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="weeklyLineStroke" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#FCD34D" />
                      <stop offset="100%" stopColor="#D97706" />
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
                    tickFormatter={(v) => String(v)}
                    stroke="oklch(0.52 0.03 65)"
                    dy={4}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={formatAxisNumber}
                    stroke="oklch(0.52 0.03 65)"
                    width={48}
                  />
                  <Tooltip
                    cursor={{ stroke: "#FCD34D", strokeWidth: 1.5 }}
                    content={<ChartTooltip formatter={formatToman} />}
                  />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    name="فروش"
                    stroke="url(#weeklyLineStroke)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#D97706", strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: "#D97706", stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly sales bar chart */}
      <Card className="gap-3 p-5">
        <CardHeader className="px-0">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <BarChart3 className="w-5 h-5 text-honey-dark" />
            فروش ماهانه
          </CardTitle>
          <CardDescription>شش ماه گذشته (تومان)</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {monthlyTotal === 0 ? (
            <ChartEmptyState label="هنوز فروشی در این بازه ثبت نشده است." />
          ) : (
            <div className="h-64 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlySeries}
                  margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="monthlyBarFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FCD34D" />
                      <stop offset="100%" stopColor="#D97706" />
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
                    dy={4}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={formatAxisNumber}
                    stroke="oklch(0.52 0.03 65)"
                    width={48}
                  />
                  <Tooltip
                    cursor={{ fill: "oklch(0.96 0.04 80)" }}
                    content={<ChartTooltip formatter={formatToman} />}
                  />
                  <Bar
                    dataKey="sales"
                    name="فروش"
                    fill="url(#monthlyBarFill)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order status distribution donut */}
      <Card className="gap-3 p-5">
        <CardHeader className="px-0">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <PieIcon className="w-5 h-5 text-honey-dark" />
            توزیع وضعیت سفارش‌ها
          </CardTitle>
          <CardDescription>بر اساس وضعیت فعلی سفارش‌ها</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {totalOrdersInDist === 0 ? (
            <ChartEmptyState label="هنوز سفارشی ثبت نشده است." />
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="h-56 w-full sm:w-1/2" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      stroke="oklch(0.99 0.01 85)"
                      strokeWidth={2}
                    >
                      {donutData.map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={
                            HONEY_PALETTE[STATUS_COLOR_INDEX[entry.status] ?? 0] ??
                            HONEY_PALETTE[0]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={
                        <ChartTooltip
                          formatter={(v) => toPersianDigits(v) + " سفارش"}
                        />
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 text-xs w-full" dir="rtl">
                {donutData.map((entry) => {
                  const colorIdx =
                    STATUS_COLOR_INDEX[entry.status] ?? 0;
                  const pct =
                    totalOrdersInDist > 0
                      ? Math.round((entry.count / totalOrdersInDist) * 100)
                      : 0;
                  return (
                    <li
                      key={entry.status}
                      className="flex items-center gap-2"
                    >
                      <span
                        className="inline-block w-3 h-3 rounded-sm shrink-0"
                        style={{
                          background:
                            HONEY_PALETTE[colorIdx] ?? HONEY_PALETTE[0],
                        }}
                      />
                      <span className="text-foreground flex-1 truncate">
                        {entry.status}
                      </span>
                      <span className="text-muted-foreground tabular-nums" dir="ltr">
                        {toPersianDigits(entry.count)} · {toPersianDigits(pct)}٪
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top products bar chart — sorted by revenue in stats.ts */}
      <Card className="gap-3 p-5">
        <CardHeader className="px-0">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <Award className="w-5 h-5 text-honey-dark" />
            پرفروش‌ترین محصولات
          </CardTitle>
          <CardDescription>بر اساس درآمد (تومان)</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {topProducts.length === 0 ? (
            <ChartEmptyState label="هنوز سفارشی ثبت نشده است." />
          ) : (
            <div className="h-64 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topProducts.map((p) => ({
                    name: p.productName,
                    total: p.total,
                    quantity: p.quantity,
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
                    dy={4}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    stroke="oklch(0.52 0.03 65)"
                    width={92}
                  />
                  <Tooltip
                    cursor={{ fill: "oklch(0.96 0.04 80)" }}
                    content={
                      <ChartTooltip formatter={(v) => formatToman(Number(v))} />
                    }
                  />
                  <Bar
                    dataKey="total"
                    name="درآمد"
                    radius={[0, 6, 6, 0]}
                    maxBarSize={28}
                  >
                    {topProducts.map((_, i) => (
                      <Cell key={i} fill={productColors[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
