import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// NEVER cache this route — the admin can edit product prices, descriptions,
// and featured status via the Telegram bot at any time. The site must always
// reflect the latest DB state.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const NO_CACHE_HEADERS = {
  "Cache-Control":
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

// GET /api/products — list all honey products
export async function GET() {
  try {
    const products = await db.product.findMany({
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ products }, { headers: NO_CACHE_HEADERS });
  } catch (e) {
    console.error("GET /api/products error:", e);
    return NextResponse.json(
      { error: "خطا در دریافت محصولات" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
