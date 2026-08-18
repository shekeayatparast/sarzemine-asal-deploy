import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  generateOrderNumber,
  generateUniqueAmount,
  toPersianDigits,
} from "@/lib/format";
import { FREE_DELIVERY_CITY } from "@/lib/products";
import { notifyBotNewOrder } from "@/lib/notify-bot";

interface OrderItemInput {
  productId: string;
  productName: string;
  containerSize: number;
  hasWax: boolean;
  isWholesale: boolean;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface CreateOrderBody {
  customerName: string;
  customerPhone: string;
  province: string;
  city: string;
  address?: string;
  notes?: string;
  items: OrderItemInput[];
  totalAmount: number;
}

// POST /api/orders — create a new order with unique tracking amount
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateOrderBody;

    // Validation
    if (!body.customerName?.trim()) {
      return NextResponse.json(
        { error: "نام و نام خانوادگی الزامی است" },
        { status: 400 }
      );
    }
    if (!body.customerPhone?.trim()) {
      return NextResponse.json(
        { error: "شماره تماس الزامی است" },
        { status: 400 }
      );
    }
    if (!body.province || !body.city) {
      return NextResponse.json(
        { error: "استان و شهر محل تحویل الزامی است" },
        { status: 400 }
      );
    }
    if (!body.items?.length) {
      return NextResponse.json(
        { error: "سبد خرید شما خالی است" },
        { status: 400 }
      );
    }

    // ── SECURITY: Re-validate EVERY item's unitPrice against the live DB.
    // The admin may have changed product prices via the Telegram bot. The
    // client-sent unitPrice is NEVER trusted — we always look up the
    // product's current pricePerKg from the DB and recompute the unit price
    // for the given container size. This guarantees customers always pay the
    // current price, not a stale (potentially lower) cached price.
    const productIds = [...new Set(body.items.map((i) => i.productId))];
    const dbProducts = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, pricePerKg: true, stockKg: true },
    });
    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // Validate every item
    for (const item of body.items) {
      // Validate quantity: must be a positive integer (1..99)
      if (
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 99
      ) {
        return NextResponse.json(
          { error: "تعداد سفارش نامعتبر است" },
          { status: 400 }
        );
      }
      // Validate container size: must be positive number
      if (
        typeof item.containerSize !== "number" ||
        item.containerSize <= 0 ||
        item.containerSize > 100
      ) {
        return NextResponse.json(
          { error: "اندازه ظرف نامعتبر است" },
          { status: 400 }
        );
      }
      const p = productMap.get(item.productId);
      if (!p) {
        return NextResponse.json(
          { error: `محصول یافت نشد: ${item.productName}` },
          { status: 400 }
        );
      }
      // Recompute the correct unit price from the live DB price
      const expectedUnitPrice = Math.round(p.pricePerKg * item.containerSize);
      if (item.unitPrice !== expectedUnitPrice) {
        // Price mismatch — could be stale cache or tampering.
        // Use the server-authoritative price.
        item.unitPrice = expectedUnitPrice;
      }
      // Also sync the product name (admin may have renamed via bot? we don't
      // support that yet, but sync anyway for consistency)
      item.productName = p.name;
    }

    // ── B11: Stock validation ──────────────────────────────────────────
    // Aggregate requested kg per product, then compare against the live
    // stock value. Per task instructions, we DO NOT expose the stock number
    // to the customer up-front — but we DO validate here on submission and
    // return a clear Persian message that tells them how much is available.
    const requestedKgByProduct = new Map<string, number>();
    for (const item of body.items) {
      const kg = item.containerSize * item.quantity;
      requestedKgByProduct.set(
        item.productId,
        (requestedKgByProduct.get(item.productId) ?? 0) + kg
      );
    }
    for (const [productId, requestedKg] of requestedKgByProduct) {
      const p = productMap.get(productId);
      if (!p) continue;
      // Allow tiny float slack (1 gram) to avoid rounding noise
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

    // Recompute total server-side from the validated unit prices
    const totalAmount = body.items.reduce(
      (s, i) => s + i.unitPrice * i.quantity,
      0
    );

    // Generate unique tracking amount (1..999 toman)
    const uniqueAmount = generateUniqueAmount();
    const finalAmount = totalAmount + uniqueAmount;

    // Delivery type: free in Shahrekord, post elsewhere
    const deliveryType =
      body.city.trim() === FREE_DELIVERY_CITY ? "shahrekord" : "post";

    // Ensure orderNumber uniqueness (regenerate on collision until unique, max 5 tries)
    let orderNumber = generateOrderNumber();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await db.order.findUnique({
        where: { orderNumber },
      });
      if (!existing) break;
      // Collision — regenerate a NEW order number and retry
      orderNumber = generateOrderNumber();
      attempts++;
    }

    // ── B11: Create order + decrement stock atomically ────────────────
    // We use a transaction so that if the order create fails (e.g. orderNumber
    // race), the stock decrements don't go through either — and vice versa.
    const created = await db.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerName: body.customerName.trim(),
          customerPhone: body.customerPhone.trim(),
          province: body.province,
          city: body.city,
          address: body.address?.trim() || null,
          totalAmount,
          uniqueAmount,
          finalAmount,
          paymentStatus: "pending",
          deliveryType,
          notes: body.notes?.trim() || null,
          items: {
            create: body.items.map((i) => ({
              productId: i.productId,
              productName: i.productName,
              containerSize: i.containerSize,
              hasWax: i.hasWax,
              isWholesale: i.isWholesale,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              total: i.unitPrice * i.quantity,
            })),
          },
        },
        include: { items: true },
      });

      // Decrement stock for each unique product (atomic with order creation)
      for (const [productId, kg] of requestedKgByProduct) {
        await tx.product.update({
          where: { id: productId },
          data: { stockKg: { decrement: kg } },
        });
      }

      return order;
    });

    // Notify the Telegram bot so the admin gets an instant alert
    notifyBotNewOrder(created.orderNumber);

    return NextResponse.json({
      success: true,
      orderNumber: created.orderNumber,
      orderId: created.id,
      totalAmount,
      uniqueAmount,
      finalAmount,
      deliveryType,
    });
  } catch (e) {
    console.error("POST /api/orders error:", e);
    return NextResponse.json(
      { error: "خطا در ثبت سفارش. لطفاً دوباره تلاش کنید." },
      { status: 500 }
    );
  }
}
