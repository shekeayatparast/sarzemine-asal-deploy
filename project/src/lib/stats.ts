// Stats calculation helpers for agent and admin dashboards.
// These functions compute weekly/monthly sales, top products, etc.
// Used by /api/agent/stats and /api/admin/stats.

import { db } from "@/lib/db";

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

  // Order status distribution
  const statusCounts: Record<string, number> = {};
  for (const o of orders) {
    statusCounts[o.orderStatus] = (statusCounts[o.orderStatus] || 0) + 1;
  }
  const statusLabels: Record<string, string> = {
    awaiting_payment: "در انتظار پرداخت",
    paid: "پرداخت شده",
    confirmed: "تأیید شده",
    preparing: "در حال آماده‌سازی",
    shipped: "ارسال شده",
    delivered: "تحویل داده شده",
    cancelled: "لغو شده",
  };
  const orderStatusDistribution = Object.entries(statusCounts).map(
    ([status, count]) => ({
      status: statusLabels[status] || status,
      count,
    })
  );

  // Top products (by total quantity)
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
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Recent orders (last 5)
  const recentOrders = orders.slice(0, 5).map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    finalAmount: o.finalAmount,
    orderStatus: statusLabels[o.orderStatus] || o.orderStatus,
    paymentStatus: o.paymentStatus === "confirmed" ? "تأیید شده" : "در انتظار",
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
  totalOrders: number;
  agentOrders: number;
  customerOrders: number;
  totalRevenue: number; // all confirmed payments
  agentRevenue: number; // from agent orders only
  customerRevenue: number;
  totalCommissionPaid: number;
  // This period
  thisWeekRevenue: number;
  thisMonthRevenue: number;
  weekGrowthPct: number | null;
  monthGrowthPct: number | null;
  // Charts
  weeklyRevenueSeries: { label: string; revenue: number; orders: number }[];
  monthlyRevenueSeries: { label: string; revenue: number; orders: number }[];
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

export async function computeAdminStats(): Promise<AdminStats> {
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

  // Orders
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
      agent: { select: { name: true, storeName: true } },
      items: { select: { productName: true, quantity: true, total: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const totalOrders = orders.length;
  const agentOrders = orders.filter((o) => o.orderType === "agent").length;
  const customerOrders = orders.filter((o) => o.orderType === "customer").length;

  const confirmedOrders = orders.filter((o) => o.paymentStatus === "confirmed");
  const totalRevenue = confirmedOrders.reduce((s, o) => s + o.finalAmount, 0);
  const agentRevenue = confirmedOrders
    .filter((o) => o.orderType === "agent")
    .reduce((s, o) => s + o.finalAmount, 0);
  const customerRevenue = totalRevenue - agentRevenue;

  // Commission paid = sum of (agentRevenue * agent.commissionRate / 100) per agent
  // For simplicity, compute from agent's stored totalSales and commissionRate
  const totalCommissionPaid = agents.reduce(
    (s, a) => s + Math.round((a.totalSales * a.commissionRate) / 100),
    0
  );

  // This period revenue
  const weekStart = getStartOfWeek();
  const monthStart = getStartOfMonth();
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastMonthStart = new Date(monthStart);
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

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

  // Weekly series (last 8 weeks)
  const weeklyRevenueSeries: {
    label: string;
    revenue: number;
    orders: number;
  }[] = [];
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

  // Monthly series (last 6 months)
  const monthlyRevenueSeries: {
    label: string;
    revenue: number;
    orders: number;
  }[] = [];
  const monthNames = [
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
  ];
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
    let jIdx = (mStart.getMonth() - 2 + 12) % 12;
    if (mStart.getMonth() < 2) jIdx = (mStart.getMonth() + 10) % 12;
    monthlyRevenueSeries.push({
      label: monthNames[jIdx],
      revenue,
      orders: mOrders.length,
    });
  }

  // Top agents (by totalSales)
  const topAgents = agents
    .map((a) => ({
      id: a.id,
      name: a.name,
      storeName: a.storeName,
      totalOrders: a.totalOrders,
      totalSales: a.totalSales,
    }))
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 5);

  // Top products across all orders
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
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Order status distribution
  const statusCounts: Record<string, number> = {};
  for (const o of orders) {
    statusCounts[o.orderStatus] = (statusCounts[o.orderStatus] || 0) + 1;
  }
  const statusLabels: Record<string, string> = {
    awaiting_payment: "در انتظار پرداخت",
    paid: "پرداخت شده",
    confirmed: "تأیید شده",
    preparing: "در حال آماده‌سازی",
    shipped: "ارسال شده",
    delivered: "تحویل داده شده",
    cancelled: "لغو شده",
  };
  const orderStatusDistribution = Object.entries(statusCounts).map(
    ([status, count]) => ({
      status: statusLabels[status] || status,
      count,
    })
  );

  // Recent agents (last 5)
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

  // Recent orders (last 5)
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
    weeklyRevenueSeries,
    monthlyRevenueSeries,
    topAgents,
    topProducts,
    orderStatusDistribution,
    recentAgents,
    recentOrders,
  };
}
