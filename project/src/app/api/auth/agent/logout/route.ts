// POST /api/auth/agent/logout
// Clears the agent's session.

import { NextResponse } from "next/server";
import { getSessionToken, destroyAgentSession, clearSessionCookie } from "@/lib/auth";

export async function POST() {
  try {
    const token = await getSessionToken();
    if (token) {
      await destroyAgentSession(token);
    }
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[agent/logout] error:", err);
    // Even on error, clear the cookie so the client logs out
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  }
}
