import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifyBotPaymentConfirmed } from "@/lib/notify-bot";

interface ConfirmBody {
  orderNumber: string;
}

// POST /api/orders/confirm — customer confirms they made the card-to-card payment
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ConfirmBody;

    if (!body.orderNumber?.trim()) {
      return NextResponse.json(
        { error: "شماره سفارش الزامی است" },
        { status: 400 }
      );
    }

    const order = await db.order.findUnique({
      where: { orderNumber: body.orderNumber.trim() },
    });

    if (!order) {
      return NextResponse.json(
        { error: "سفارشی با این شماره یافت نشد" },
        { status: 404 }
      );
    }

    if (order.paymentStatus === "confirmed") {
      return NextResponse.json({
        success: true,
        alreadyConfirmed: true,
        message: "پرداخت این سفارش قبلاً تأیید شده است",
      });
    }

    await db.order.update({
      where: { id: order.id },
      data: { paymentStatus: "confirmed", orderStatus: "paid" },
    });

    // Notify the Telegram bot so the admin can verify the payment
    notifyBotPaymentConfirmed(order.orderNumber);

    return NextResponse.json({
      success: true,
      message:
        "اطلاعیه پرداخت شما با موفقیت برای مدیریت ارسال شد. پس از تأیید نهایی، با شما تماس گرفته خواهد شد.",
    });
  } catch (e) {
    console.error("POST /api/orders/confirm error:", e);
    return NextResponse.json(
      { error: "خطا در ثبت تأیید پرداخت" },
      { status: 500 }
    );
  }
}
