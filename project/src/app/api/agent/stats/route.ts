// GET /api/agent/stats
// Returns dashboard statistics for the logged-in agent.

import { NextResponse } from "next/server";
import { getCurrentAgent } from "@/lib/auth";
import { computeAgentStats } from "@/lib/stats";

export async function GET() {
  try {
    const user = await getCurrentAgent();
    if (!user) {
      return NextResponse.json(
        { error: "برای دسترسی به این بخش باید وارد شوید" },
        { status: 401 }
      );
    }
    if (user.status !== "active") {
      return NextResponse.json(
        { error: "حساب شما هنوز تأیید نشده است" },
        { status: 403 }
      );
    }
    const stats = await computeAgentStats(user.id);
    return NextResponse.json({ stats });
  } catch (err) {
    console.error("[agent/stats] error:", err);
    return NextResponse.json(
      { error: "خطای سرور" },
      { status: 500 }
    );
  }
}
