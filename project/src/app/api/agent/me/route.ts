// GET /api/agent/me
// Returns the currently logged-in agent's profile (sanitized).

import { NextResponse } from "next/server";
import { getCurrentAgent } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentAgent();
    if (!user) {
      return NextResponse.json(
        { error: "برای دسترسی به این بخش باید وارد شوید" },
        { status: 401 }
      );
    }

    const agent = await db.agent.findUnique({
      where: { id: user.id },
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
        createdAt: true,
        approvedAt: true,
        lastLoginAt: true,
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: "حساب کاربری یافت نشد" },
        { status: 404 }
      );
    }

    return NextResponse.json({ agent });
  } catch (err) {
    console.error("[agent/me] error:", err);
    return NextResponse.json(
      { error: "خطای سرور" },
      { status: 500 }
    );
  }
}
