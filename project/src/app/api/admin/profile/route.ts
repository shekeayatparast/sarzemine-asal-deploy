// GET  /api/admin/profile — return the current admin's profile (sanitized)
// PATCH /api/admin/profile — update profile (name OR password)

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireAdmin,
  hashPassword,
  verifyPassword,
  isStrongPassword,
} from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// ── GET ───────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const user = await requireAdmin();
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
        updatedAt: true,
      },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "ادمین یافت نشد" },
        { status: 404 }
      );
    }

    return NextResponse.json({ admin });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("UNAUTHORIZED")) {
      return NextResponse.json(
        { error: "برای دسترسی باید وارد شوید" },
        { status: 401 }
      );
    }
    console.error("[admin/profile GET] error:", err);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

// ── PATCH ────────────────────────────────────────────────────────────
const ProfileUpdateSchema = z
  .object({
    // Name update (optional)
    name: z
      .string()
      .trim()
      .min(3, "نام باید حداقل ۳ کاراکتر باشد")
      .max(80)
      .optional(),
    // Password change (all three required together if any is set)
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      // If newPassword is provided, currentPassword must be too
      if (data.newPassword && !data.currentPassword) return false;
      return true;
    },
    { message: "برای تغییر رمز، رمز فعلی را وارد کنید" }
  );

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAdmin();

    const body = await req.json();
    const parsed = ProfileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const firstErr = parsed.error.issues[0]?.message || "ورودی نامعتبر";
      return NextResponse.json({ error: firstErr }, { status: 400 });
    }
    const data = parsed.data;

    // Fetch current admin (with password hash for verification)
    const admin = await db.admin.findUnique({
      where: { id: user.id },
      select: { id: true, passwordHash: true, username: true },
    });
    if (!admin) {
      return NextResponse.json(
        { error: "ادمین یافت نشد" },
        { status: 404 }
      );
    }

    const updateData: { name?: string; passwordHash?: string } = {};

    // Name update
    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    // Password change
    if (data.newPassword) {
      // Verify current password
      const ok = await verifyPassword(
        data.currentPassword as string,
        admin.passwordHash
      );
      if (!ok) {
        return NextResponse.json(
          { error: "رمز فعلی اشتباه است" },
          { status: 400 }
        );
      }
      // Validate strength
      const strength = isStrongPassword(data.newPassword);
      if (!strength.ok) {
        return NextResponse.json(
          { error: strength.reason || "رمز جدید به اندازه کافی قوی نیست" },
          { status: 400 }
        );
      }
      updateData.passwordHash = await hashPassword(data.newPassword);
    }

    // If nothing to update, return current state
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "هیچ فیلدی برای به‌روزرسانی ارسال نشد" },
        { status: 400 }
      );
    }

    const updated = await db.admin.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const message =
      updateData.passwordHash !== undefined
        ? "رمز عبور با موفقیت تغییر کرد"
        : "اطلاعات پروفایل با موفقیت به‌روزرسانی شد";

    return NextResponse.json({
      success: true,
      admin: updated,
      message,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("UNAUTHORIZED")) {
      return NextResponse.json(
        { error: "برای دسترسی باید وارد شوید" },
        { status: 401 }
      );
    }
    console.error("[admin/profile PATCH] error:", err);
    return NextResponse.json(
      { error: "خطای سرور. لطفاً دوباره تلاش کنید." },
      { status: 500 }
    );
  }
}
