// POST /api/auth/agent/register
// Registers a new sales agent. The agent starts in "pending" status and
// must be approved by an admin before they can log in.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  hashPassword,
  isValidIranPhone,
  normalizeIranPhone,
  isStrongPassword,
  createAgentSession,
  setSessionCookie,
} from "@/lib/auth";
import { PROVINCES } from "@/lib/locations";

const RegisterSchema = z.object({
  name: z.string().trim().min(3, "نام باید حداقل ۳ کاراکتر باشد").max(80),
  phone: z.string().trim().min(1, "شماره موبایل الزامی است"),
  password: z.string().min(1, "رمز عبور الزامی است"),
  storeName: z.string().trim().min(3, "نام فروشگاه الزامی است").max(100),
  province: z.string().trim().min(1, "استان الزامی است"),
  city: z.string().trim().min(1, "شهر الزامی است"),
  address: z.string().trim().min(5, "آدرس الزامی است").max(500),
  nationalId: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      const firstErr = parsed.error.issues[0]?.message || "ورودی نامعتبر";
      return NextResponse.json({ error: firstErr }, { status: 400 });
    }
    const data = parsed.data;

    // Phone validation
    if (!isValidIranPhone(data.phone)) {
      return NextResponse.json(
        { error: "شماره موبایل نامعتبر است (مثال صحیح: 09123456789)" },
        { status: 400 }
      );
    }
    const normalizedPhone = normalizeIranPhone(data.phone);

    // Password strength
    const pwdCheck = isStrongPassword(data.password);
    if (!pwdCheck.ok) {
      return NextResponse.json({ error: pwdCheck.reason }, { status: 400 });
    }

    // Province validation
    const provinceObj = PROVINCES.find((p) => p.name === data.province);
    if (!provinceObj) {
      return NextResponse.json(
        { error: "استان انتخاب شده نامعتبر است" },
        { status: 400 }
      );
    }
    if (!provinceObj.cities.includes(data.city)) {
      return NextResponse.json(
        { error: "شهر انتخاب شده نامعتبر است" },
        { status: 400 }
      );
    }

    // National ID validation (if provided)
    if (data.nationalId && data.nationalId.trim()) {
      const nid = data.nationalId.trim();
      if (!/^\d{10}$/.test(nid)) {
        return NextResponse.json(
          { error: "کد ملی باید ۱۰ رقم باشد" },
          { status: 400 }
        );
      }
    }

    // Check for duplicate phone
    const existing = await db.agent.findUnique({
      where: { phone: normalizedPhone },
    });
    if (existing) {
      return NextResponse.json(
        { error: "این شماره موبایل قبلاً ثبت شده است. لطفاً وارد شوید." },
        { status: 409 }
      );
    }

    // Create agent
    const passwordHash = await hashPassword(data.password);
    const agent = await db.agent.create({
      data: {
        name: data.name,
        phone: normalizedPhone,
        passwordHash,
        storeName: data.storeName,
        province: data.province,
        city: data.city,
        address: data.address,
        nationalId: data.nationalId || null,
        status: "pending", // requires admin approval
        commissionRate: 10, // default 10%
      },
    });

    // Auto-login the agent (they can see their own pending status but
    // dashboard is locked until approved)
    const token = await createAgentSession(agent.id);
    await setSessionCookie(token, "agent");

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        storeName: agent.storeName,
        phone: agent.phone,
        status: agent.status,
      },
      message:
        "ثبت‌نام شما با موفقیت انجام شد. پس از تأیید مدیر، می‌توانید وارد پنل خود شوید.",
    });
  } catch (err: any) {
    console.error("[agent/register] error:", err);
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "این شماره موبایل قبلاً ثبت شده است" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "خطای سرور. لطفاً دوباره تلاش کنید." },
      { status: 500 }
    );
  }
}
