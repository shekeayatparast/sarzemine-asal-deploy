// GET /api/agent/orders/[id]
// Returns details of a specific order (only if it belongs to the agent).

import { NextRequest, NextResponse } from "next/server";
import { getCurrentAgent } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentAgent();
    if (!user) {
      return NextResponse.json(
        { error: "برای دسترسی به این بخش باید وارد شوید" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const order = await db.order.findFirst({
      where: { id, agentId: user.id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: "سفارش یافت نشد" },
        { status: 404 }
      );
    }

    return NextResponse.json({ order });
  } catch (err) {
    console.error("[agent/orders/[id] GET] error:", err);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
