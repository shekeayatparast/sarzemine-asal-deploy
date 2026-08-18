// GET  /api/admin/products — list all products (admin only, all fields)
// POST /api/admin/products — create a new product (B13)

import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

// ── GET: list all products (full fields incl. stockKg) ──────────────────
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentAdmin();
    if (!user) {
      return NextResponse.json(
        { error: "برای دسترسی باید وارد شوید" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get("archived") === "1";

    const products = await db.product.findMany({
      orderBy: [{ featured: "desc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({
      products,
      count: products.length,
      includeArchived,
    });
  } catch (err) {
    console.error("[admin/products GET] error:", err);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

// ── POST: create a new product (B13) ────────────────────────────────────
const CreateProductSchema = z.object({
  name: z.string().trim().min(2, "نام محصول الزامی است").max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(
      /^[a-z0-9-]+$/,
      "اسلاگ فقط شامل حروف انگلیسی کوچک، اعداد و خط تیره باشد"
    ),
  description: z.string().trim().min(5, "توضیحات کوتاه است").max(2000),
  benefits: z.string().trim().max(2000).optional().default(""),
  pricePerKg: z
    .number()
    .int("قیمت باید عدد صحیح باشد")
    .min(0, "قیمت نمی‌تواند منفی باشد"),
  agentPricePerKg: z
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .refine((v) => v === 0 || v > 0, {
      message: "قیمت نماینده یا ۰ باشد یا مقدار مثبت",
    }),
  stockKg: z
    .number()
    .min(0, "موجودی نمی‌تواند منفی باشد")
    .optional()
    .default(0),
  color: z.string().trim().max(60).optional().default(""),
  origin: z.string().trim().max(120).optional().default(""),
  image: z.string().nullable().optional(),
  featured: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentAdmin();
    if (!user) {
      return NextResponse.json(
        { error: "برای دسترسی باید وارد شوید" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = CreateProductSchema.safeParse(body);
    if (!parsed.success) {
      const firstErr = parsed.error.issues[0]?.message || "ورودی نامعتبر";
      return NextResponse.json({ error: firstErr }, { status: 400 });
    }
    const data = parsed.data;

    // Slug uniqueness check
    const existing = await db.product.findUnique({
      where: { slug: data.slug },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "این اسلاگ قبلاً استفاده شده است" },
        { status: 400 }
      );
    }

    const created = await db.product.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        benefits: data.benefits ?? "",
        pricePerKg: data.pricePerKg,
        agentPricePerKg: data.agentPricePerKg ?? 0,
        stockKg: data.stockKg ?? 0,
        color: data.color ?? "",
        origin: data.origin ?? "",
        image: data.image ?? null,
        featured: data.featured ?? false,
      },
    });

    return NextResponse.json({
      success: true,
      product: created,
      message: "محصول با موفقیت ایجاد شد",
    });
  } catch (err) {
    console.error("[admin/products POST] error:", err);
    return NextResponse.json(
      { error: "خطای سرور. لطفاً دوباره تلاش کنید." },
      { status: 500 }
    );
  }
}
