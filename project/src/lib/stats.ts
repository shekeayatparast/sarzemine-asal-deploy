// Stats calculation helpers for agent and admin dashboards.
// These functions compute weekly/monthly sales, top products, etc.
// Used by /api/agent/stats and /api/admin/stats.

import { db } from "@/lib/db";

// ── Report period type ───────────────────────────────────────────────
export type ReportPeriod = "weekly" | "monthly" | "yearly";

// ── Persian (Jalali) date helpers ────────────────────────────────────
// We need to compute "this week" and "this month" in the user's timezone
// (Asia/Tehran) and ideally in the Jalali calendar for proper labeling.
// For now, we use Gregorian weeks/months but format labels in Persian.

const TZ = "Asia/Tehran";

// Convert an English number to Persian digits
export function toPersianDigits(n: number | string): string {
  const map = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return String(n).replace(/[0-9]/g, (d) => map[parseInt(d, 10)]);
}

// Get start of week (Saturday in Iran calendar)
export function getStartOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 6=Sat
  // In Iran, week starts on Saturday (day 6)
  // To get the most recent Saturday:
  //   if today is Saturday (6), diff = 0
  //   if today is Sunday (0), diff = -1 (1 day back to Saturday)
  //   if today is Monday (1), diff = -2
  //   ...
  //   if today is Friday (5), diff = -6
  let diff = day === 6 ? 0 : -(day + 1);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getStartOfMonth(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Agent stats ──────────────────────────────────────────────────────
export interface AgentStats {
  // Summary
  totalOrders: number;
  totalSales: number; // toman
  totalCommission: number; // toman (calculated from commission rate)
  balance: number;
  commissionRate: number;
  pendingOrders: number;
  // This period
  thisWeekSales: number;
  thisMonthSales: number;
  // Growth %
  weekGrowthPct: number | null; // vs last week
  monthGrowthPct: number | null; // vs last month
  // Charts
  weeklySeries: { label: string; sales: number; orders: number }[]; // last 8 weeks
  monthlySeries: { label: string; sales: number; orders: number }[]; // last 6 months
  orderStatusDistribution: { status: string; count: number }[];
  topProducts: { productName: string; quantity: number; total: number }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    finalAmount: number;
    orderStatus: string;
    paymentStatus: string;
    createdAt: string;
  }[];
}

export async function computeAgentStats(agentId: string): Promise<AgentStats> {
  const agent = await db.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      commissionRate: true,
      balance: true,
      totalSales: true,
      totalOrders: true,
    },
  });
  if (!agent) throw new Error("Agent not found");

  // All orders for this agent
  const orders = await db.order.findMany({
    where: { agentId },
    select: {
      id: true,
      orderNumber: true,
      finalAmount: true,
      totalAmount: true,
      uniqueAmount: true,
      orderStatus: true,
      paymentStatus: true,
      createdAt: true,
      items: {
        select: {
          productName: true,
          quantity: true,
          total: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalOrders = orders.length;
  const totalSales = orders.reduce(
    (sum, o) => sum + (o.paymentStatus === "confirmed" ? o.finalAmount : 0),
    0
  );
  const totalCommission = Math.round((totalSales * agent.commissionRate) / 100);
  const pendingOrders = orders.filter(
    (o) =>
      o.orderStatus === "awaiting_payment" || o.orderStatus === "paid"
  ).length;

  // This week's sales (confirmed payments only)
  const weekStart = getStartOfWeek();
  const monthStart = getStartOfMonth();
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastMonthStart = new Date(monthStart);
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

  const thisWeekSales = orders
    .filter(
      (o) =>
        o.paymentStatus === "confirmed" && new Date(o.createdAt) >= weekStart
    )
    .reduce((s, o) => s + o.finalAmount, 0);
  const thisMonthSales = orders
    .filter(
      (o) =>
        o.paymentStatus === "confirmed" && new Date(o.createdAt) >= monthStart
    )
    .reduce((s, o) => s + o.finalAmount, 0);
  const lastWeekSales = orders
    .filter(
      (o) =>
        o.paymentStatus === "confirmed" &&
        new Date(o.createdAt) >= lastWeekStart &&
        new Date(o.createdAt) < weekStart
    )
    .reduce((s, o) => s + o.finalAmount, 0);
  const lastMonthSales = orders
    .filter(
      (o) =>
        o.paymentStatus === "confirmed" &&
        new Date(o.createdAt) >= lastMonthStart &&
        new Date(o.createdAt) < monthStart
    )
    .reduce((s, o) => s + o.finalAmount, 0);

  const weekGrowthPct =
    lastWeekSales > 0
      ? Math.round(((thisWeekSales - lastWeekSales) / lastWeekSales) * 100)
      : thisWeekSales > 0
      ? 100
      : null;
  const monthGrowthPct =
    lastMonthSales > 0
      ? Math.round(((thisMonthSales - lastMonthSales) / lastMonthSales) * 100)
      : thisMonthSales > 0
      ? 100
      : null;

  // Weekly series (last 8 weeks)
  const weeklySeries: { label: string; sales: number; orders: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const wStart = new Date(weekStart);
    wStart.setDate(wStart.getDate() - i * 7);
    const wEnd = new Date(wStart);
    wEnd.setDate(wEnd.getDate() + 7);
    const weekOrders = orders.filter((o) => {
      const d = new Date(o.createdAt);
      return d >= wStart && d < wEnd;
    });
    const sales = weekOrders
      .filter((o) => o.paymentStatus === "confirmed")
      .reduce((s, o) => s + o.finalAmount, 0);
    weeklySeries.push({
      label: `هفته ${toPersianDigits(8 - i)}`,
      sales,
      orders: weekOrders.length,
    });
  }

  // Monthly series (last 6 months)
  const monthlySeries: { label: string; sales: number; orders: number }[] = [];
  const monthNames = [
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
  ];
  // Approximate Jalali month using simple offset (good enough for labels)
  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(monthStart);
    mStart.setMonth(mStart.getMonth() - i);
    const mEnd = new Date(mStart);
    mEnd.setMonth(mEnd.getMonth() + 1);
    const monthOrders = orders.filter((o) => {
      const d = new Date(o.createdAt);
      return d >= mStart && d < mEnd;
    });
    const sales = monthOrders
      .filter((o) => o.paymentStatus === "confirmed")
      .reduce((s, o) => s + o.finalAmount, 0);
    // Approximate Jalali month index (Gregorian month - 3, mod 12, then +1 if past March 21)
    let jIdx = (mStart.getMonth() - 2 + 12) % 12;
    if (mStart.getMonth() < 2) jIdx = (mStart.getMonth() + 10) % 12;
    monthlySeries.push({
      label: monthNames[jIdx],
      sales,
      orders: monthOrders.length,
    });
  }

  // Order status distribution — covers all 7 statuses (count 0 if missing)
  // so the donut chart can render a stable legend.
  const ALL_STATUS_KEYS = [
    "awaiting_payment",
    "paid",
    "confirmed",
    "preparing",
    "shipped",
    "delivered",
    "cancelled",
  ] as const;
  const statusLabels: Record<string, string> = {
    awaiting_payment: "در انتظار پرداخت",
    paid: "پرداخت ثبت شد",
    confirmed: "تأیید مدیریت",
    preparing: "در حال آماده‌سازی",
    shipped: "تحویل به پست",
    delivered: "تحویل داده شد",
    cancelled: "لغو شد",
  };
  const statusCounts: Record<string, number> = {};
  for (const k of ALL_STATUS_KEYS) statusCounts[k] = 0;
  for (const o of orders) {
    if (statusCounts[o.orderStatus] !== undefined) {
      statusCounts[o.orderStatus]++;
    }
  }
  const orderStatusDistribution = ALL_STATUS_KEYS.map((status) => ({
    status: statusLabels[status] || status,
    count: statusCounts[status] || 0,
  }));

  // Top products aggregated across all orders — sorted by revenue (total)
  // descending so the dashboard bar chart shows the highest earners first.
  const productAgg: Record<string, { quantity: number; total: number }> = {};
  for (const o of orders) {
    for (const item of o.items) {
      if (!productAgg[item.productName]) {
        productAgg[item.productName] = { quantity: 0, total: 0 };
      }
      productAgg[item.productName].quantity += item.quantity;
      productAgg[item.productName].total += item.total;
    }
  }
  const topProducts = Object.entries(productAgg)
    .map(([productName, v]) => ({ productName, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Recent orders (last 5) — return raw English status keys so the badge
  // components can map them to Persian labels themselves. The previous
  // implementation mapped keys → Persian here, then the dashboard re-mapped
  // Persian → keys, which was both lossy and fragile.
  const recentOrders = orders.slice(0, 5).map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    finalAmount: o.finalAmount,
    orderStatus: o.orderStatus,
    paymentStatus: o.paymentStatus,
    createdAt: o.createdAt.toISOString(),
  }));

  return {
    totalOrders,
    totalSales,
    totalCommission,
    balance: agent.balance,
    commissionRate: agent.commissionRate,
    pendingOrders,
    thisWeekSales,
    thisMonthSales,
    weekGrowthPct,
    monthGrowthPct,
    weeklySeries,
    monthlySeries,
    orderStatusDistribution,
    topProducts,
    recentOrders,
  };
}

// ── Admin stats ───────────────────────────────────────────────────────
export interface AdminStats {
  // Summary
  totalAgents: number;
  activeAgents: number;
  pendingAgents: number;
  blockedAgents: number;
  totalOrders: number; // lifetime order count
  agentOrders: number; // lifetime
  customerOrders: number; // lifetime
  totalRevenue: number; // revenue in selected period (confirmed)
  agentRevenue: number; // agent revenue in selected period
  customerRevenue: number; // customer revenue in selected period
  totalCommissionPaid: number;
  // This period snapshots (always "this week" / "this month", regardless of period filter)
  thisWeekRevenue: number;
  thisMonthRevenue: number;
  weekGrowthPct: number | null;
  monthGrowthPct: number | null;
  // Period filter metadata
  period: ReportPeriod;
  periodLabel: string; // Persian label, e.g. "ماهیانه"
  periodOrders: number; // # of orders in the selected period (any status)
  periodRangeStart: string; // ISO date — inclusive start
  periodRangeEnd: string; // ISO date — exclusive end (now)
  // Charts
  weeklyRevenueSeries: { label: string; revenue: number; orders: number }[];
  monthlyRevenueSeries: { label: string; revenue: number; orders: number }[];
  weeklySeriesLabel: string; // Persian label describing the weekly series granularity
  monthlySeriesLabel: string; // Persian label describing the monthly series granularity
  topAgents: {
    id: string;
    name: string;
    storeName: string;
    totalOrders: number;
    totalSales: number;
  }[];
  topProducts: { productName: string; quantity: number; total: number }[];
  orderStatusDistribution: { status: string; count: number }[];
  recentAgents: {
    id: string;
    name: string;
    storeName: string;
    phone: string;
    status: string;
    createdAt: string;
  }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    customerName: string;
    finalAmount: number;
    orderType: string;
    orderStatus: string;
    paymentStatus: string;
    createdAt: string;
  }[];
}

export async function computeAdminStats(
  opts: { period?: ReportPeriod } = {}
): Promise<AdminStats> {
  const period: ReportPeriod = opts.period ?? "monthly";
  const periodDays =
    period === "weekly" ? 7 : period === "monthly" ? 30 : 365;
  const periodLabel =
    period === "weekly"
      ? "هفتگی"
      : period === "monthly"
      ? "ماهیانه"
      : "سالیانه";

  // Agent counts
  const agents = await db.agent.findMany({
    select: {
      id: true,
      name: true,
      storeName: true,
      phone: true,
      status: true,
      commissionRate: true,
      balance: true,
      totalSales: true,
      totalOrders: true,
      createdAt: true,
    },
  });
  const totalAgents = agents.length;
  const activeAgents = agents.filter((a) => a.status === "active").length;
  const pendingAgents = agents.filter((a) => a.status === "pending").length;
  const blockedAgents = agents.filter((a) => a.status === "blocked").length;

  // All orders (lifetime, for series + recent activity)
  const orders = await db.order.findMany({
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      finalAmount: true,
      orderType: true,
      orderStatus: true,
      paymentStatus: true,
      createdAt: true,
      agent: { select: { id: true, name: true, storeName: true } },
      items: { select: { productName: true, quantity: true, total: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const totalOrders = orders.length;
  const agentOrders = orders.filter((o) => o.orderType === "agent").length;
  const customerOrders = orders.filter((o) => o.orderType === "customer").length;

  // Commission paid (lifetime — based on agent's stored totalSales)
  const totalCommissionPaid = agents.reduce(
    (s, a) => s + Math.round((a.totalSales * a.commissionRate) / 100),
    0
  );

  // Period filter — affects revenue totals, top products, top agents,
  // status distribution. Snapshot stats (thisWeek/Month) stay lifetime.
  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - (periodDays - 1));
  periodStart.setHours(0, 0, 0, 0);

  const periodOrders = orders.filter(
    (o) => new Date(o.createdAt) >= periodStart
  );
  const periodConfirmed = periodOrders.filter(
    (o) => o.paymentStatus === "confirmed"
  );
  const totalRevenue = periodConfirmed.reduce((s, o) => s + o.finalAmount, 0);
  const agentRevenue = periodConfirmed
    .filter((o) => o.orderType === "agent")
    .reduce((s, o) => s + o.finalAmount, 0);
  const customerRevenue = totalRevenue - agentRevenue;

  // This period snapshots — always "this week" / "this month" regardless
  // of the period filter
  const weekStart = getStartOfWeek();
  const monthStart = getStartOfMonth();
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastMonthStart = new Date(monthStart);
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

  const confirmedOrders = orders.filter((o) => o.paymentStatus === "confirmed");
  const thisWeekRevenue = confirmedOrders
    .filter((o) => new Date(o.createdAt) >= weekStart)
    .reduce((s, o) => s + o.finalAmount, 0);
  const thisMonthRevenue = confirmedOrders
    .filter((o) => new Date(o.createdAt) >= monthStart)
    .reduce((s, o) => s + o.finalAmount, 0);
  const lastWeekRevenue = confirmedOrders
    .filter(
      (o) =>
        new Date(o.createdAt) >= lastWeekStart &&
        new Date(o.createdAt) < weekStart
    )
    .reduce((s, o) => s + o.finalAmount, 0);
  const lastMonthRevenue = confirmedOrders
    .filter(
      (o) =>
        new Date(o.createdAt) >= lastMonthStart &&
        new Date(o.createdAt) < monthStart
    )
    .reduce((s, o) => s + o.finalAmount, 0);

  const weekGrowthPct =
    lastWeekRevenue > 0
      ? Math.round(((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100)
      : thisWeekRevenue > 0
      ? 100
      : null;
  const monthGrowthPct =
    lastMonthRevenue > 0
      ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : thisMonthRevenue > 0
      ? 100
      : null;

  const monthNames = [
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
  ];
  const dayNames = [
    "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه",
  ];
  function jalaliMonthLabel(gDate: Date): string {
    // Approximate Jalali month index from Gregorian — good enough for chart labels
    let jIdx = (gDate.getMonth() - 2 + 12) % 12;
    if (gDate.getMonth() < 2) jIdx = (gDate.getMonth() + 10) % 12;
    return monthNames[jIdx];
  }

  // Weekly & monthly series — adjusted per period:
  //  - weekly   → weeklyRevenueSeries = daily for last 7 days
  //               monthlyRevenueSeries = weekly for last 8 weeks
  //  - monthly  → weeklyRevenueSeries = weekly for last 8 weeks (default)
  //               monthlyRevenueSeries = monthly for last 6 months (default)
  //  - yearly   → weeklyRevenueSeries = monthly for last 12 months
  //               monthlyRevenueSeries = quarterly for last 4 quarters
  const weeklyRevenueSeries: {
    label: string;
    revenue: number;
    orders: number;
  }[] = [];
  const monthlyRevenueSeries: {
    label: string;
    revenue: number;
    orders: number;
  }[] = [];
  let weeklySeriesLabel = "روند درآمد هفتگی";
  let monthlySeriesLabel = "مقایسه درآمد ماهانه";

  if (period === "weekly") {
    // Daily for last 7 days
    weeklySeriesLabel = "روند درآمد روزانه (۷ روز اخیر)";
    for (let i = 6; i >= 0; i--) {
      const dStart = new Date(now);
      dStart.setDate(dStart.getDate() - i);
      dStart.setHours(0, 0, 0, 0);
      const dEnd = new Date(dStart);
      dEnd.setDate(dEnd.getDate() + 1);
      const dOrders = orders.filter((o) => {
        const d = new Date(o.createdAt);
        return d >= dStart && d < dEnd;
      });
      const revenue = dOrders
        .filter((o) => o.paymentStatus === "confirmed")
        .reduce((s, o) => s + o.finalAmount, 0);
      weeklyRevenueSeries.push({
        label: dayNames[dStart.getDay()],
        revenue,
        orders: dOrders.length,
      });
    }
    // Weekly for last 8 weeks (coarse)
    monthlySeriesLabel = "روند درآمد هفتگی (۸ هفته اخیر)";
    for (let i = 7; i >= 0; i--) {
      const wStart = new Date(weekStart);
      wStart.setDate(wStart.getDate() - i * 7);
      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 7);
      const wOrders = orders.filter((o) => {
        const d = new Date(o.createdAt);
        return d >= wStart && d < wEnd;
      });
      const revenue = wOrders
        .filter((o) => o.paymentStatus === "confirmed")
        .reduce((s, o) => s + o.finalAmount, 0);
      monthlyRevenueSeries.push({
        label: `هفته ${toPersianDigits(8 - i)}`,
        revenue,
        orders: wOrders.length,
      });
    }
  } else if (period === "yearly") {
    // Monthly for last 12 months (fine)
    weeklySeriesLabel = "روند درآمد ماهانه (۱۲ ماه اخیر)";
    for (let i = 11; i >= 0; i--) {
      const mStart = new Date(monthStart);
      mStart.setMonth(mStart.getMonth() - i);
      const mEnd = new Date(mStart);
      mEnd.setMonth(mEnd.getMonth() + 1);
      const mOrders = orders.filter((o) => {
        const d = new Date(o.createdAt);
        return d >= mStart && d < mEnd;
      });
      const revenue = mOrders
        .filter((o) => o.paymentStatus === "confirmed")
        .reduce((s, o) => s + o.finalAmount, 0);
      weeklyRevenueSeries.push({
        label: jalaliMonthLabel(mStart),
        revenue,
        orders: mOrders.length,
      });
    }
    // Quarterly for last 4 quarters (coarse)
    monthlySeriesLabel = "روند درآمد فصلانه (۴ فصل اخیر)";
    for (let q = 3; q >= 0; q--) {
      const qEnd = new Date();
      qEnd.setMonth(qEnd.getMonth() - q * 3);
      const qStart = new Date(qEnd);
      qStart.setMonth(qStart.getMonth() - 3);
      const qOrders = orders.filter((o) => {
        const d = new Date(o.createdAt);
        return d >= qStart && d < qEnd;
      });
      const revenue = qOrders
        .filter((o) => o.paymentStatus === "confirmed")
        .reduce((s, o) => s + o.finalAmount, 0);
      monthlyRevenueSeries.push({
        label: `فصل ${toPersianDigits(4 - q)}`,
        revenue,
        orders: qOrders.length,
      });
    }
  } else {
    // monthly (default) — same as before
    weeklySeriesLabel = "روند درآمد هفتگی (۸ هفته اخیر)";
    for (let i = 7; i >= 0; i--) {
      const wStart = new Date(weekStart);
      wStart.setDate(wStart.getDate() - i * 7);
      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 7);
      const wOrders = orders.filter((o) => {
        const d = new Date(o.createdAt);
        return d >= wStart && d < wEnd;
      });
      const revenue = wOrders
        .filter((o) => o.paymentStatus === "confirmed")
        .reduce((s, o) => s + o.finalAmount, 0);
      weeklyRevenueSeries.push({
        label: `هفته ${toPersianDigits(8 - i)}`,
        revenue,
        orders: wOrders.length,
      });
    }
    monthlySeriesLabel = "روند درآمد ماهانه (۶ ماه اخیر)";
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(monthStart);
      mStart.setMonth(mStart.getMonth() - i);
      const mEnd = new Date(mStart);
      mEnd.setMonth(mEnd.getMonth() + 1);
      const mOrders = orders.filter((o) => {
        const d = new Date(o.createdAt);
        return d >= mStart && d < mEnd;
      });
      const revenue = mOrders
        .filter((o) => o.paymentStatus === "confirmed")
        .reduce((s, o) => s + o.finalAmount, 0);
      monthlyRevenueSeries.push({
        label: jalaliMonthLabel(mStart),
        revenue,
        orders: mOrders.length,
      });
    }
  }

  // Top agents — by sales in the period (re-computed from period orders)
  const agentSalesAgg: Record<
    string,
    { id: string; name: string; storeName: string; totalOrders: number; totalSales: number }
  > = {};
  for (const a of agents) {
    if (!agentSalesAgg[a.id]) {
      agentSalesAgg[a.id] = {
        id: a.id,
        name: a.name,
        storeName: a.storeName,
        totalOrders: 0,
        totalSales: 0,
      };
    }
  }
  for (const o of periodConfirmed) {
    if (o.orderType !== "agent") continue;
    const aid = (o.agent as { id?: string } | null)?.id;
    if (!aid || !agentSalesAgg[aid]) continue;
    agentSalesAgg[aid].totalOrders += 1;
    agentSalesAgg[aid].totalSales += o.finalAmount;
  }
  const topAgents = Object.values(agentSalesAgg)
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 5)
    // Fall back to lifetime totals if all period sales are zero
    .map((a) =>
      a.totalSales === 0
        ? {
            ...a,
            totalOrders: agents.find((x) => x.id === a.id)?.totalOrders ?? 0,
            totalSales: agents.find((x) => x.id === a.id)?.totalSales ?? 0,
          }
        : a
    );

  // Top products — from period orders (any status, since items reflect activity)
  const productAgg: Record<string, { quantity: number; total: number }> = {};
  for (const o of periodOrders) {
    for (const item of o.items) {
      if (!productAgg[item.productName]) {
        productAgg[item.productName] = { quantity: 0, total: 0 };
      }
      productAgg[item.productName].quantity += item.quantity;
      productAgg[item.productName].total += item.total;
    }
  }
  const topProducts = Object.entries(productAgg)
    .map(([productName, v]) => ({ productName, ...v }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Order status distribution — from period orders only
  const statusLabels: Record<string, string> = {
    awaiting_payment: "در انتظار پرداخت",
    paid: "پرداخت شده",
    confirmed: "تأیید شده",
    preparing: "در حال آماده‌سازی",
    shipped: "ارسال شده",
    delivered: "تحویل داده شده",
    cancelled: "لغو شده",
  };
  const statusCounts: Record<string, number> = {};
  for (const o of periodOrders) {
    statusCounts[o.orderStatus] = (statusCounts[o.orderStatus] || 0) + 1;
  }
  const orderStatusDistribution = Object.entries(statusCounts).map(
    ([status, count]) => ({
      status: statusLabels[status] || status,
      count,
    })
  );

  // Recent agents (last 5) — lifetime
  const recentAgents = agents
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map((a) => ({
      id: a.id,
      name: a.name,
      storeName: a.storeName,
      phone: a.phone,
      status: a.status,
      createdAt: a.createdAt.toISOString(),
    }));

  // Recent orders (last 5) — lifetime
  const recentOrders = orders.slice(0, 5).map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    finalAmount: o.finalAmount,
    orderType: o.orderType,
    orderStatus: statusLabels[o.orderStatus] || o.orderStatus,
    paymentStatus: o.paymentStatus === "confirmed" ? "تأیید شده" : "در انتظار",
    createdAt: o.createdAt.toISOString(),
  }));

  return {
    totalAgents,
    activeAgents,
    pendingAgents,
    blockedAgents,
    totalOrders,
    agentOrders,
    customerOrders,
    totalRevenue,
    agentRevenue,
    customerRevenue,
    totalCommissionPaid,
    thisWeekRevenue,
    thisMonthRevenue,
    weekGrowthPct,
    monthGrowthPct,
    period,
    periodLabel,
    periodOrders: periodOrders.length,
    periodRangeStart: periodStart.toISOString(),
    periodRangeEnd: now.toISOString(),
    weeklyRevenueSeries,
    monthlyRevenueSeries,
    weeklySeriesLabel,
    monthlySeriesLabel,
    topAgents,
    topProducts,
    orderStatusDistribution,
    recentAgents,
    recentOrders,
  };
}
