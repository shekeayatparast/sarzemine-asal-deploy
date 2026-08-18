// POST /api/auth/agent/login
// Logs in a sales agent by phone + password.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  verifyPassword,
  normalizeIranPhone,
  isValidIranPhone,
  createAgentSession,
  setSessionCookie,
} from "@/lib/auth";

const LoginSchema = z.object({
  phone: z.string().trim().min(1, "شماره موبایل الزامی است"),
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

    if (!isValidIranPhone(data.phone)) {
      return NextResponse.json(
        { error: "شماره موبایل نامعتبر است" },
        { status: 400 }
      );
    }
    const normalizedPhone = normalizeIranPhone(data.phone);

    const agent = await db.agent.findUnique({
      where: { phone: normalizedPhone },
    });
    if (!agent) {
      return NextResponse.json(
        { error: "شماره موبایل یا رمز عبور اشتباه است" },
        { status: 401 }
      );
    }

    const passwordOk = await verifyPassword(data.password, agent.passwordHash);
    if (!passwordOk) {
      return NextResponse.json(
        { error: "شماره موبایل یا رمز عبور اشتباه است" },
        { status: 401 }
      );
    }

    // Block login for blocked/rejected agents
    if (agent.status === "blocked") {
      return NextResponse.json(
        {
          error:
            "حساب شما مسدود شده است. لطفاً با پشتیبانی تماس بگیرید.",
        },
        { status: 403 }
      );
    }
    if (agent.status === "rejected") {
      return NextResponse.json(
        {
          error:
            "درخواست نمایندگی شما رد شده است. برای اطلاعات بیشتر با پشتیبانی تماس بگیرید.",
        },
        { status: 403 }
      );
    }
    if (agent.status === "pending") {
      // Allow login but mark as pending — UI will show waiting screen
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
          "حساب شما هنوز توسط مدیر تأیید نشده است. پس از تأیید، به پنل دسترسی خواهید داشت.",
        pendingApproval: true,
      });
    }

    // status === "active"
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
        province: agent.province,
        city: agent.city,
        address: agent.address,
        nationalId: agent.nationalId,
        commissionRate: agent.commissionRate,
        balance: agent.balance,
        totalSales: agent.totalSales,
        totalOrders: agent.totalOrders,
        createdAt: agent.createdAt,
      },
    });
  } catch (err: any) {
    console.error("[agent/login] error:", err);
    return NextResponse.json(
      { error: "خطای سرور. لطفاً دوباره تلاش کنید." },
      { status: 500 }
    );
  }
}
