// POST /api/auth/admin/login
// Logs in an admin user.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  verifyPassword,
  createAdminSession,
  setSessionCookie,
} from "@/lib/auth";

const LoginSchema = z.object({
  username: z.string().trim().min(1, "نام کاربری الزامی است"),
  password: z.string().min(1, "رمز عبور الزامی است"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      const firstErr = parsed.error.issues[0]?.message || "ورودی نامعتبر";
      return NextResponse.json({ error: firstErr }, { status: 400 });
    }
    const data = parsed.data;

    const admin = await db.admin.findUnique({
      where: { username: data.username },
    });
    if (!admin) {
      return NextResponse.json(
        { error: "نام کاربری یا رمز عبور اشتباه است" },
        { status: 401 }
      );
    }

    const passwordOk = await verifyPassword(data.password, admin.passwordHash);
    if (!passwordOk) {
      return NextResponse.json(
        { error: "نام کاربری یا رمز عبور اشتباه است" },
        { status: 401 }
      );
    }

    if (!admin.active) {
      return NextResponse.json(
        { error: "حساب شما غیرفعال شده است" },
        { status: 403 }
      );
    }

    const token = await createAdminSession(admin.id);
    await setSessionCookie(token, "admin");

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error("[admin/login] error:", err);
    return NextResponse.json(
      { error: "خطای سرور. لطفاً دوباره تلاش کنید." },
      { status: 500 }
    );
  }
}
