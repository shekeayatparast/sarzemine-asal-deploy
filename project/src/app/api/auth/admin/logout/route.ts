// POST /api/auth/admin/logout
// Clears the admin's session cookie.

import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  try {
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/logout] error:", err);
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  }
}
