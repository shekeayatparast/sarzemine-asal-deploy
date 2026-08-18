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
//
// This endpoint is consumed by the PUBLIC customer site (ProductsView,
// AddToCartDialog, HomeView) and the AGENT new-order page (which needs to
// know the agent price for dual pricing).
//
// Per B11: stockKg must NEVER be exposed to customers or agents — only the
// admin API returns it. We select a curated set of fields here.
export async function GET() {
  try {
    const products = await db.product.findMany({
      orderBy: [{ featured: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        benefits: true,
        pricePerKg: true,
        agentPricePerKg: true,
        color: true,
        origin: true,
        image: true,
        featured: true,
        createdAt: true,
        updatedAt: true,
        // NOTE: stockKg is intentionally omitted (B11 — capacity must
        // not be exposed to customers/agents). The admin API at
        // /api/admin/products returns the full row including stock.
      },
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
