// GET /api/agent/profile — get current profile
// PATCH /api/agent/profile — update profile (name, storeName, address, etc.)

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAgent } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { PROVINCES } from "@/lib/locations";

// ── GET ───────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const user = await getCurrentAgent();
    if (!user) {
      return NextResponse.json(
        { error: "برای دسترسی باید وارد شوید" },
        { status: 401 }
      );
    }
    const agent = await db.agent.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        phone: true,
        storeName: true,
        province: true,
        city: true,
        address: true,
        nationalId: true,
        status: true,
        commissionRate: true,
        balance: true,
        totalSales: true,
        totalOrders: true,
        createdAt: true,
      },
    });
    if (!agent) {
      return NextResponse.json({ error: "نماینده یافت نشد" }, { status: 404 });
    }
    return NextResponse.json({ agent });
  } catch (err) {
    console.error("[agent/profile GET] error:", err);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────
const ProfileUpdateSchema = z.object({
  name: z.string().trim().min(3).max(80).optional(),
  storeName: z.string().trim().min(3).max(100).optional(),
  province: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1).optional(),
  address: z.string().trim().min(5).max(500).optional(),
  nationalId: z.string().trim().optional(),
  // For password change (all three required if any is set)
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentAgent();
    if (!user) {
      return NextResponse.json(
        { error: "برای دسترسی باید وارد شوید" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = ProfileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const firstErr = parsed.error.issues[0]?.message || "ورودی نامعتبر";
      return NextResponse.json({ error: firstErr }, { status: 400 });
    }
    const data = parsed.data;

    // Validate province/city if provided
    if (data.province) {
      const provinceObj = PROVINCES.find((p) => p.name === data.province);
      if (!provinceObj) {
        return NextResponse.json({ error: "استان نامعتبر است" }, { status: 400 });
      }
      if (data.city && !provinceObj.cities.includes(data.city)) {
        return NextResponse.json({ error: "شهر نامعتبر است" }, { status: 400 });
      }
    }

    // National ID validation
    if (data.nationalId && data.nationalId.trim()) {
      if (!/^\d{10}$/.test(data.nationalId.trim())) {
        return NextResponse.json(
          { error: "کد ملی باید ۱۰ رقم باشد" },
          { status: 400 }
        );
      }
    }

    const agent = await db.agent.findUnique({
      where: { id: user.id },
      select: { id: true, passwordHash: true },
    });
    if (!agent) {
      return NextResponse.json({ error: "نماینده یافت نشد" }, { status: 404 });
    }

    // Handle password change
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.storeName !== undefined) updateData.storeName = data.storeName;
    if (data.province !== undefined) updateData.province = data.province;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.nationalId !== undefined) {
      updateData.nationalId = data.nationalId.trim() || null;
    }

    if (data.newPassword) {
      // Require current password
      if (!data.currentPassword) {
        return NextResponse.json(
          { error: "برای تغییر رمز، رمز فعلی را وارد کنید" },
          { status: 400 }
        );
      }
      const ok = await verifyPassword(data.currentPassword, agent.passwordHash);
      if (!ok) {
        return NextResponse.json(
          { error: "رمز فعلی اشتباه است" },
          { status: 400 }
        );
      }
      if (data.newPassword.length < 6) {
        return NextResponse.json(
          { error: "رمز جدید باید حداقل ۶ کاراکتر باشد" },
          { status: 400 }
        );
      }
      updateData.passwordHash = await hashPassword(data.newPassword);
    }

    const updated = await db.agent.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        phone: true,
        storeName: true,
        province: true,
        city: true,
        address: true,
        nationalId: true,
        status: true,
        commissionRate: true,
      },
    });

    return NextResponse.json({
      success: true,
      agent: updated,
      message: "اطلاعات شما با موفقیت به‌روزرسانی شد",
    });
  } catch (err) {
    console.error("[agent/profile PATCH] error:", err);
    return NextResponse.json(
      { error: "خطای سرور. لطفاً دوباره تلاش کنید." },
      { status: 500 }
    );
  }
}
