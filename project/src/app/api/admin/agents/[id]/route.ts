// GET /api/admin/agents/[id] — get agent details with order history
// PATCH /api/admin/agents/[id] — update status (approve, block, reject), commission, etc.

import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// ── GET ───────────────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentAdmin();
    if (!user) {
      return NextResponse.json(
        { error: "برای دسترسی باید وارد شوید" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const agent = await db.agent.findUnique({
      where: { id },
      include: {
        orders: {
          select: {
            id: true,
            orderNumber: true,
            finalAmount: true,
            orderStatus: true,
            paymentStatus: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "نماینده یافت نشد" }, { status: 404 });
    }

    return NextResponse.json({ agent });
  } catch (err) {
    console.error("[admin/agents/[id] GET] error:", err);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────
const AgentUpdateSchema = z.object({
  status: z
    .enum(["pending", "active", "blocked", "rejected"])
    .optional(),
  commissionRate: z.number().int().min(0).max(100).optional(),
  rejectionReason: z.string().max(500).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentAdmin();
    if (!user) {
      return NextResponse.json(
        { error: "برای دسترسی باید وارد شوید" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = AgentUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const firstErr = parsed.error.issues[0]?.message || "ورودی نامعتبر";
      return NextResponse.json({ error: firstErr }, { status: 400 });
    }
    const data = parsed.data;

    const agent = await db.agent.findUnique({ where: { id } });
    if (!agent) {
      return NextResponse.json({ error: "نماینده یافت نشد" }, { status: 404 });
    }

    const updateData: any = {};
    let statusChanged = false;

    if (data.status && data.status !== agent.status) {
      updateData.status = data.status;
      if (data.status === "active" && !agent.approvedAt) {
        updateData.approvedAt = new Date();
        updateData.approvedById = user.id;
      }
      if (data.status === "rejected" && data.rejectionReason) {
        updateData.rejectionReason = data.rejectionReason;
      } else if (data.status !== "rejected") {
        updateData.rejectionReason = null;
      }
      statusChanged = true;
    } else if (data.rejectionReason !== undefined) {
      updateData.rejectionReason = data.rejectionReason;
    }

    if (data.commissionRate !== undefined) {
      updateData.commissionRate = data.commissionRate;
    }

    const updated = await db.agent.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        storeName: true,
        status: true,
        commissionRate: true,
        approvedAt: true,
        rejectionReason: true,
      },
    });

    // If agent was approved/blocked, invalidate their sessions (force re-login)
    if (statusChanged && (data.status === "blocked" || data.status === "rejected")) {
      await db.agentSession.deleteMany({ where: { agentId: id } }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      agent: updated,
      message:
        data.status === "active"
          ? "نماینده با موفقیت تأیید شد"
          : data.status === "blocked"
          ? "نماینده مسدود شد"
          : data.status === "rejected"
          ? "درخواست نمایندگی رد شد"
          : data.status === "pending"
          ? "نماینده به حالت انتظار در آمد"
          : "اطلاعات نماینده به‌روزرسانی شد",
    });
  } catch (err) {
    console.error("[admin/agents/[id] PATCH] error:", err);
    return NextResponse.json(
      { error: "خطای سرور. لطفاً دوباره تلاش کنید." },
      { status: 500 }
    );
  }
}
