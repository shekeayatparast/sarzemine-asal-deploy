// GET /api/admin/agents
// Lists all agents with optional status filter + search.

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
    const status = searchParams.get("status"); // pending | active | blocked | rejected
    const search = searchParams.get("search")?.trim();
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const where: any = {};
    if (status && ["pending", "active", "blocked", "rejected"].includes(status)) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { storeName: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const agents = await db.agent.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        storeName: true,
        province: true,
        city: true,
        address: true,
        nationalId: true,
        status: true,
        commissionRate: true,
        balance: true,
        totalSales: true,
        totalOrders: true,
        rejectionReason: true,
        approvedAt: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 500),
    });

    return NextResponse.json({
      agents,
      count: agents.length,
    });
  } catch (err) {
    console.error("[admin/agents GET] error:", err);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
