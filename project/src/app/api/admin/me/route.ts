// GET /api/admin/me — returns current admin user

import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentAdmin();
    if (!user) {
      return NextResponse.json(
        { error: "برای دسترسی باید وارد شوید" },
        { status: 401 }
      );
    }

    const admin = await db.admin.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!admin) {
      return NextResponse.json({ error: "ادمین یافت نشد" }, { status: 404 });
    }

    return NextResponse.json({ admin });
  } catch (err) {
    console.error("[admin/me] error:", err);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
