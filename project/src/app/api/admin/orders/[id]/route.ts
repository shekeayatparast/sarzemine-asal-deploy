// PATCH /api/admin/orders/[id] — change order status / tracking code / cancel
//
// Body:
//   { orderStatus?: string, trackingCode?: string, cancel?: boolean }
//
// - cancel: true  → sets orderStatus = "cancelled"
// - orderStatus:  one of awaiting_payment|paid|confirmed|preparing|shipped|delivered|cancelled
// - trackingCode: required when transitioning to "shipped" (unless one is already set)
//
// We disallow going backwards in the pipeline (except to "cancelled").
// Pipeline order is defined by ORDER_STATUS_STEPS in lib/format.ts.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ORDER_STATUS_STEPS,
  statusStepIndex,
} from "@/lib/format";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ALL_STATUSES = [...ORDER_STATUS_STEPS, "cancelled"];

const PatchSchema = z
  .object({
    orderStatus: z
      .enum(["awaiting_payment", "paid", "confirmed", "preparing", "shipped", "delivered", "cancelled"])
      .optional(),
    trackingCode: z.string().min(1).max(50).optional(),
    cancel: z.boolean().optional(),
  })
  .strict();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate the admin is logged in. requireAdmin throws on missing session.
    await requireAdmin();
  } catch {
    return NextResponse.json(
      { error: "برای این عملیات باید به‌عنوان مدیر وارد شوید." },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "بدنه درخواست نامعتبر است." },
        { status: 400 }
      );
    }

    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      const firstErr = parsed.error.issues[0]?.message || "ورودی نامعتبر";
      return NextResponse.json({ error: firstErr }, { status: 400 });
    }
    const data = parsed.data;

    // Load the order
    const order = await db.order.findUnique({
      where: { id },
      include: { items: true, agent: { select: { id: true, name: true, storeName: true } } },
    });
    if (!order) {
      return NextResponse.json(
        { error: "سفارش با این شناسه یافت نشد." },
        { status: 404 }
      );
    }

    // Already cancelled?
    if (order.orderStatus === "cancelled") {
      return NextResponse.json(
        { error: "این سفارش قبلاً لغو شده و قابل تغییر نیست." },
        { status: 400 }
      );
    }

    // Determine the requested next status
    let nextStatus: string | undefined;
    if (data.cancel) {
      nextStatus = "cancelled";
    } else if (data.orderStatus) {
      nextStatus = data.orderStatus;
    } else if (data.trackingCode) {
      // No status change — just edit the tracking code
      const updated = await db.order.update({
        where: { id },
        data: { trackingCode: data.trackingCode.trim() },
        include: { items: true, agent: { select: { id: true, name: true, storeName: true } } },
      });
      return NextResponse.json({
        success: true,
        order: updated,
        message: "کد رهگیری به‌روزرسانی شد.",
      });
    } else {
      return NextResponse.json(
        { error: "هیچ تغییری برای اعمال مشخص نشده است." },
        { status: 400 }
      );
    }

    // Validate status transition: not backwards (cancelled is always allowed)
    const currentIdx = statusStepIndex(order.orderStatus);
    const nextIdx = ALL_STATUSES.indexOf(nextStatus);

    if (nextStatus !== "cancelled") {
      // Unknown next status — shouldn't happen due to zod enum
      if (nextIdx < 0) {
        return NextResponse.json(
          { error: "وضعیت نامعتبر است." },
          { status: 400 }
        );
      }
      // Same status (no-op) is allowed
      if (nextStatus !== order.orderStatus) {
        // Going backwards in the pipeline?
        if (currentIdx >= 0 && nextIdx < currentIdx) {
          return NextResponse.json(
            {
              error:
                "امکان بازگشت به وضعیت قبلی وجود ندارد. تنها می‌توانید سفارش را لغو کنید.",
            },
            { status: 400 }
          );
        }
        // Going forwards but skipping? allow it — the Telegram bot does too.
      }
    }

    // If moving to "shipped", require a tracking code (unless one already exists)
    let trackingCode = data.trackingCode?.trim();
    if (nextStatus === "shipped") {
      if (!trackingCode && !order.trackingCode) {
        return NextResponse.json(
          { error: "برای تحویل به پست، کد رهگیری الزامی است." },
          { status: 400 }
        );
      }
      // Keep the existing code if the user didn't supply a new one
      if (!trackingCode && order.trackingCode) {
        trackingCode = order.trackingCode;
      }
    }

    // Build update data
    const updateData: {
      orderStatus?: string;
      trackingCode?: string | null;
    } = { orderStatus: nextStatus };
    if (trackingCode) {
      updateData.trackingCode = trackingCode;
    }

    const updated = await db.order.update({
      where: { id },
      data: updateData,
      include: { items: true, agent: { select: { id: true, name: true, storeName: true } } },
    });

    // Build a friendly success message
    let message = "وضعیت سفارش به‌روزرسانی شد.";
    if (nextStatus === "cancelled") message = "سفارش با موفقیت لغو شد.";
    else if (nextStatus === "shipped") message = "وضعیت به «تحویل به پست» تغییر یافت و کد رهگیری ثبت شد.";
    else if (nextStatus === "delivered") message = "سفارش تحویل داده شد.";
    else if (nextStatus === "confirmed") message = "سفارش توسط مدیریت تأیید شد.";
    else if (nextStatus === "paid") message = "پرداخت سفارش ثبت شد.";

    return NextResponse.json({
      success: true,
      order: updated,
      message,
    });
  } catch (err) {
    console.error("[admin/orders/[id] PATCH] error:", err);
    return NextResponse.json(
      { error: "خطای سرور. لطفاً دوباره تلاش کنید." },
      { status: 500 }
    );
  }
}
