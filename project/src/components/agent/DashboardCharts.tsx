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
import { TrendingUp, BarChart3, PieChart as PieIcon, Award } from "lucide-react";
import type { AgentStats } from "@/lib/stats";

// Honey color palette for charts (no indigo/blue)
const HONEY_PALETTE = [
  "#D97706", // honey-dark amber
  "#F59E0B", // amber-500
  "#FCD34D", // amber-300
  "#92400E", // amber-900
  "#FBBF24", // amber-400
  "#FDE68A", // amber-200
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

function formatTooltipValue(n: number): string {
  return formatToman(n);
}

// Custom tooltip so we can show Persian digits + Toman suffix
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
  // Donut chart colors (cycle through palette)
  const statusColors = orderStatusDistribution.map(
    (_, i) => HONEY_PALETTE[i % HONEY_PALETTE.length]
  );
  const productColors = topProducts.map(
    (_, i) => HONEY_PALETTE[i % HONEY_PALETTE.length]
  );

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
          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={weeklySeries}
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
                  tickFormatter={(v) => String(v)}
                  stroke="oklch(0.52 0.03 65)"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={formatAxisNumber}
                  stroke="oklch(0.52 0.03 65)"
                />
                <Tooltip
                  content={
                    <ChartTooltip formatter={formatTooltipValue} />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="sales"
                  name="فروش"
                  stroke="#D97706"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#D97706" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
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
          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlySeries}
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
                    <ChartTooltip formatter={formatTooltipValue} />
                  }
                />
                <Bar
                  dataKey="sales"
                  name="فروش"
                  fill="#F59E0B"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
          {orderStatusDistribution.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
              هنوز سفارشی ثبت نشده است.
            </div>
          ) : (
            <div className="h-64 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderStatusDistribution}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
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
                        formatter={(v: number) =>
                          toPersianDigits(v) + " سفارش"
                        }
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
            <Award className="w-5 h-5 text-honey-dark" />
            پرفروش‌ترین محصولات
          </CardTitle>
          <CardDescription>بر اساس تعداد فروخته شده</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {topProducts.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
              هنوز سفارشی ثبت نشده است.
            </div>
          ) : (
            <div className="h-64 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topProducts.map((p) => ({
                    name: p.productName,
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
                        formatter={(v: number) =>
                          toPersianDigits(v) + " عدد"
                        }
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
                      <Cell
                        key={i}
                        fill={productColors[i]}
                      />
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
