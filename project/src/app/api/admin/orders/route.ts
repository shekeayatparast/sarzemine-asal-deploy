// GET /api/admin/orders — list all orders (customers + agents) with filters

import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentAdmin();
    if (!user) {
      return NextResponse.json(
        { error: "برای دسترسی باید وارد شوید" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const orderType = searchParams.get("orderType"); // customer | agent
    const orderStatus = searchParams.get("orderStatus");
    const paymentStatus = searchParams.get("paymentStatus");
    const agentId = searchParams.get("agentId");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const where: any = {};
    if (orderType && ["customer", "agent"].includes(orderType)) {
      where.orderType = orderType;
    }
    if (orderStatus) {
      where.orderStatus = orderStatus;
    }
    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }
    if (agentId) {
      where.agentId = agentId;
    }

    const orders = await db.order.findMany({
      where,
      include: {
        items: true,
        agent: {
          select: {
            id: true,
            name: true,
            storeName: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 500),
    });

    return NextResponse.json({
      orders,
      count: orders.length,
    });
  } catch (err) {
    console.error("[admin/orders GET] error:", err);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
