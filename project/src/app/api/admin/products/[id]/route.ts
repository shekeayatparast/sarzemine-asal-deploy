// GET    /api/admin/products/[id] — fetch a single product
// PATCH  /api/admin/products/[id] — update product (incl. inline stock)
// DELETE /api/admin/products/[id] — delete product (blocked if has orders)

import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

// ── GET: fetch a single product ─────────────────────────────────────────
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
    const product = await db.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json(
        { error: "محصول یافت نشد" },
        { status: 404 }
      );
    }
    return NextResponse.json({ product });
  } catch (err) {
    console.error("[admin/products/[id] GET] error:", err);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

// ── PATCH: update a product (B10 + B13) ────────────────────────────────
const UpdateProductSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "اسلاگ نامعتبر است")
    .optional(),
  description: z.string().trim().min(5).max(2000).optional(),
  benefits: z.string().trim().max(2000).optional(),
  pricePerKg: z.number().int().min(0).optional(),
  agentPricePerKg: z.number().int().min(0).optional(),
  stockKg: z.number().min(0).optional(),
  color: z.string().trim().max(60).optional(),
  origin: z.string().trim().max(120).optional(),
  image: z.string().nullable().optional(),
  featured: z.boolean().optional(),
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
    const parsed = UpdateProductSchema.safeParse(body);
    if (!parsed.success) {
      const firstErr = parsed.error.issues[0]?.message || "ورودی نامعتبر";
      return NextResponse.json({ error: firstErr }, { status: 400 });
    }
    const data = parsed.data;

    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "محصول یافت نشد" },
        { status: 404 }
      );
    }

    // Slug uniqueness check (if changing slug)
    if (data.slug && data.slug !== existing.slug) {
      const conflict = await db.product.findUnique({
        where: { slug: data.slug },
        select: { id: true },
      });
      if (conflict) {
        return NextResponse.json(
          { error: "این اسلاگ قبلاً استفاده شده است" },
          { status: 400 }
        );
      }
    }

    const updated = await db.product.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      success: true,
      product: updated,
      message: "محصول با موفقیت به‌روزرسانی شد",
    });
  } catch (err) {
    console.error("[admin/products/[id] PATCH] error:", err);
    return NextResponse.json(
      { error: "خطای سرور. لطفاً دوباره تلاش کنید." },
      { status: 500 }
    );
  }
}

// ── DELETE: delete a product (B13) ─────────────────────────────────────
export async function DELETE(
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
    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "محصول یافت نشد" },
        { status: 404 }
      );
    }

    // Prevent hard-delete if product is referenced in any order item —
    // otherwise the historical order rows would lose their product linkage
    // (the productName snapshot is preserved, but admins would lose the
    // ability to filter by product later). Instead we return a clear error
    // and recommend un-featuring instead.
    const ordersCount = await db.orderItem.count({
      where: { productId: id },
    });
    if (ordersCount > 0) {
      return NextResponse.json(
        {
          error: `این محصول در ${ordersCount.toLocaleString("fa-IR")} سفارش استفاده شده و قابل حذف نیست. می‌توانید آن را به حالت غیرفعال درآورید یا موجودی آن را به صفر برسانید.`,
        },
        { status: 400 }
      );
    }

    await db.product.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "محصول با موفقیت حذف شد",
    });
  } catch (err) {
    console.error("[admin/products/[id] DELETE] error:", err);
    return NextResponse.json(
      { error: "خطای سرور. لطفاً دوباره تلاش کنید." },
      { status: 500 }
    );
  }
}
