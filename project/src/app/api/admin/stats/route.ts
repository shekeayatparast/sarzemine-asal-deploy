// GET /api/admin/stats — dashboard statistics for admin

import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { computeAdminStats } from "@/lib/stats";

export async function GET() {
  try {
    const user = await getCurrentAdmin();
    if (!user) {
      return NextResponse.json(
        { error: "برای دسترسی باید وارد شوید" },
        { status: 401 }
      );
    }
    const stats = await computeAdminStats();
    return NextResponse.json({ stats });
  } catch (err) {
    console.error("[admin/stats] error:", err);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
