// GET /api/agent/orders — list agent's own orders
// POST /api/agent/orders — create a new order as agent

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAgent } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  generateOrderNumber,
  generateUniqueAmount,
  toPersianDigits,
} from "@/lib/format";
import { FREE_DELIVERY_CITY } from "@/lib/products";
import { notifyBotNewOrder } from "@/lib/notify-bot";
import { PROVINCES } from "@/lib/locations";

// ── GET: list agent's orders ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentAgent();
    if (!user) {
      return NextResponse.json(
        { error: "برای دسترسی به این بخش باید وارد شوید" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // optional filter
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const orders = await db.order.findMany({
      where: {
        agentId: user.id,
        ...(status ? { orderStatus: status } : {}),
      },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 200),
    });

    return NextResponse.json({ orders });
  } catch (err) {
    console.error("[agent/orders GET] error:", err);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

// ── POST: create new order as agent ───────────────────────────────────
// The agent places an order on behalf of their store. The customerName
// is the agent's name, and customerPhone is the agent's phone.
const CreateOrderSchema = z.object({
  province: z.string().trim().min(1, "استان الزامی است"),
  city: z.string().trim().min(1, "شهر الزامی است"),
  address: z.string().trim().min(5, "آدرس الزامی است").max(500),
  notes: z.string().trim().max(500).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        containerSize: z.number().positive(),
        hasWax: z.boolean().default(false),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .min(1, "سبد خرید خالی است"),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentAgent();
    if (!user) {
      return NextResponse.json(
        { error: "برای دسترسی به این بخش باید وارد شوید" },
        { status: 401 }
      );
    }
    if (user.status !== "active") {
      return NextResponse.json(
        { error: "حساب شما هنوز توسط مدیر تأیید نشده است" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = CreateOrderSchema.safeParse(body);
    if (!parsed.success) {
      const firstErr = parsed.error.issues[0]?.message || "ورودی نامعتبر";
      return NextResponse.json({ error: firstErr }, { status: 400 });
    }
    const data = parsed.data;

    // Province/city validation
    const provinceObj = PROVINCES.find((p) => p.name === data.province);
    if (!provinceObj) {
      return NextResponse.json({ error: "استان نامعتبر است" }, { status: 400 });
    }
    if (!provinceObj.cities.includes(data.city)) {
      return NextResponse.json({ error: "شهر نامعتبر است" }, { status: 400 });
    }

    // Load agent info for name/phone
    const agent = await db.agent.findUnique({
      where: { id: user.id },
      select: { name: true, phone: true, storeName: true },
    });
    if (!agent) {
      return NextResponse.json({ error: "نماینده یافت نشد" }, { status: 404 });
    }

    // Validate items against live DB prices
    const productIds = [...new Set(data.items.map((i) => i.productId))];
    const dbProducts = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, pricePerKg: true, agentPricePerKg: true, stockKg: true },
    });
    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    let totalAmount = 0;
    const validatedItems = data.items.map((item) => {
      const p = productMap.get(item.productId);
      if (!p) {
        throw new Error(`محصول یافت نشد: ${item.productId}`);
      }
      // ── B14: Dual pricing ──────────────────────────────────────────
      // Use agentPricePerKg if it's set (>0); otherwise fall back to the
      // regular customer pricePerKg.
      const effectivePricePerKg =
        p.agentPricePerKg > 0 ? p.agentPricePerKg : p.pricePerKg;
      const unitPrice = Math.round(effectivePricePerKg * item.containerSize);
      const itemTotal = unitPrice * item.quantity;
      totalAmount += itemTotal;
      return {
        productId: item.productId,
        productName: p.name,
        containerSize: item.containerSize,
        hasWax: item.hasWax,
        isWholesale: item.containerSize >= 25,
        quantity: item.quantity,
        unitPrice,
        total: itemTotal,
      };
    });

    // ── B11: Stock validation ──────────────────────────────────────────
    // Aggregate requested kg per product, then compare against live stock.
    // We DO NOT expose the stock value to the agent up-front (per task);
    // but we DO validate here and return a clear Persian message that tells
    // them how much is available if they exceed it.
    const requestedKgByProduct = new Map<string, number>();
    for (const item of data.items) {
      const kg = item.containerSize * item.quantity;
      requestedKgByProduct.set(
        item.productId,
        (requestedKgByProduct.get(item.productId) ?? 0) + kg
      );
    }
    for (const [productId, requestedKg] of requestedKgByProduct) {
      const p = productMap.get(productId);
      if (!p) continue;
      if (requestedKg > p.stockKg + 0.001) {
        return NextResponse.json(
          {
            error: `موجودی کافی نیست: ${p.name} — موجودی فعلی: ${toPersianDigits(
              p.stockKg.toFixed(2).replace(/\.?0+$/, "")
            )} کیلو، درخواست شما: ${toPersianDigits(
              requestedKg.toFixed(2).replace(/\.?0+$/, "")
            )} کیلو. لطفاً سفارش خود را تنظیم کنید.`,
          },
          { status: 400 }
        );
      }
    }

    // Determine delivery type
    const deliveryType = data.city === FREE_DELIVERY_CITY ? "shahrekord" : "post";
    const uniqueAmount = generateUniqueAmount();
    const finalAmount = totalAmount + uniqueAmount;
    const orderNumber = generateOrderNumber();

    // ── B11: Create order + decrement stock atomically ────────────────
    // Wrap the order insert + stock decrements in a transaction so we can't
    // end up with stock decremented but no order (or vice versa).
    const order = await db.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          customerName: `${agent.name} (${agent.storeName})`,
          customerPhone: agent.phone,
          province: data.province,
          city: data.city,
          address: data.address,
          notes: data.notes || null,
          totalAmount,
          uniqueAmount,
          finalAmount,
          paymentStatus: "pending",
          orderStatus: "awaiting_payment",
          deliveryType,
          agentId: user.id,
          orderType: "agent",
          items: { create: validatedItems },
        },
        include: { items: true },
      });

      // Decrement stock per unique product
      for (const [productId, kg] of requestedKgByProduct) {
        await tx.product.update({
          where: { id: productId },
          data: { stockKg: { decrement: kg } },
        });
      }

      return created;
    });

    // Update agent stats
    await db.agent.update({
      where: { id: user.id },
      data: {
        totalOrders: { increment: 1 },
        // totalSales only updated when payment confirmed
      },
    });

    // Notify admin bot about the new agent order
    try {
      await notifyBotNewOrder({
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        province: order.province,
        city: order.city,
        address: order.address,
        totalAmount: order.totalAmount,
        uniqueAmount: order.uniqueAmount,
        finalAmount: order.finalAmount,
        items: order.items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
          containerSize: i.containerSize,
          unitPrice: i.unitPrice,
          total: i.total,
        })),
      });
    } catch (e) {
      console.error("[agent/orders POST] bot notify failed:", e);
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        uniqueAmount: order.uniqueAmount,
        finalAmount: order.finalAmount,
        deliveryType: order.deliveryType,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        items: order.items,
      },
      message: "سفارش شما با موفقیت ثبت شد.",
    });
  } catch (err: any) {
    console.error("[agent/orders POST] error:", err);
    if (err?.message?.startsWith("محصول یافت نشد")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "خطای سرور. لطفاً دوباره تلاش کنید." },
      { status: 500 }
    );
  }
}
