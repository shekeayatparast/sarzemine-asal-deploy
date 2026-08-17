import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// NEVER cache this route — order status can change at any time via the Telegram
// bot, and the customer must always see the latest state. Without these flags,
// Next.js may serve a stale rendered response.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// Convert Persian (۰-۹) and Arabic-Indic (٠-٩) digits to ASCII 0-9
const toAsciiDigits = (s: string): string =>
  s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

// GET /api/orders/track?phone=...&orderNumber=...
// Returns the customer's orders with status, for self-service tracking.
// Accepts Persian/Arabic digits and order numbers with or without "HN-" prefix.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone")?.trim() || "";
    const orderNumber = searchParams.get("orderNumber")?.trim() || "";

    if (!phone && !orderNumber) {
      return NextResponse.json(
        { error: "برای پیگیری سفارش، شماره تماس یا شماره سفارش را وارد کنید" },
        { status: 400 }
      );
    }

    // Normalize phone: convert Persian/Arabic digits → ASCII, strip non-digits
    const normalizePhone = (p: string) =>
      toAsciiDigits(p).replace(/\D/g, "");

    // Normalize order number:
    //  1. convert Persian/Arabic digits → ASCII
    //  2. uppercase
    //  3. if user typed only digits (no HN-), prepend "HN-"
    //  4. if user typed "hn-" lowercase, fix to "HN-"
    const normalizeOrderNumber = (o: string): string => {
      let v = toAsciiDigits(o).trim().toUpperCase();
      // remove all whitespace
      v = v.replace(/\s+/g, "");
      if (!v) return "";
      // If it starts with HN- already, keep as is
      if (v.startsWith("HN-")) return v;
      // If it starts with HN (no dash), insert dash
      if (v.startsWith("HN")) return "HN-" + v.slice(2);
      // If it's all digits, prepend HN-
      if (/^\d+$/.test(v)) return "HN-" + v;
      // Otherwise return as-is (will likely not match, but let DB decide)
      return v;
    };

    const where: any = {};
    if (orderNumber) {
      // Try the normalized order number first; if that fails, fall back to
      // a partial phone match in case the user typed a phone in the order field.
      const normalizedOn = normalizeOrderNumber(orderNumber);
      const normalizedPhoneFromOrderField = normalizePhone(orderNumber);

      // If the input looks like a phone (all digits, length >= 8), search by phone too
      const isPhoneLike =
        /^\d+$/.test(toAsciiDigits(orderNumber).replace(/\D/g, "")) &&
        normalizedPhoneFromOrderField.length >= 8;

      if (isPhoneLike) {
        where.customerPhone = { contains: normalizedPhoneFromOrderField };
      } else {
        where.orderNumber = normalizedOn;
      }
    } else {
      where.customerPhone = {
        contains: normalizePhone(phone),
      };
    }

    const orders = await db.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    // Explicit no-cache headers — the customer may re-search the same order
    // multiple times while waiting for the admin to update its status, so the
    // browser must always revalidate with the server.
    const noCacheHeaders = {
      "Cache-Control":
        "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    };

    if (!orders.length) {
      return NextResponse.json(
        {
          success: true,
          orders: [],
          message: "سفارشی با این اطلاعات یافت نشد",
        },
        { headers: noCacheHeaders }
      );
    }

    return NextResponse.json(
      { success: true, orders },
      { headers: noCacheHeaders }
    );
  } catch (e) {
    console.error("GET /api/orders/track error:", e);
    return NextResponse.json(
      { error: "خطا در پیگیری سفارش" },
      { status: 500 }
    );
  }
}
