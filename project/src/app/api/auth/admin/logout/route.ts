// POST /api/auth/admin/logout
// Clears the admin's session cookie and redirects to /admin/login.
//
// IMPORTANT: The sidebar/header logout buttons use a plain HTML <form>
// (action="/api/auth/admin/logout" method="POST"). If we returned JSON here,
// the browser would display the raw JSON body ("true") to the user.
// Instead we return an HTTP 303 (See Other) redirect — this is the standard
// PRG (Post/Redirect/Get) pattern: the browser follows the redirect with a
// GET request to /admin/login, so the user sees the login page, not JSON.

import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await clearSessionCookie();
  } catch (err) {
    console.error("[admin/logout] error:", err);
    // Even on error, clear the cookie so the client logs out
    await clearSessionCookie().catch(() => {});
  }
  // 303 See Other → browser follows with GET to /admin/login
  const loginUrl = new URL("/admin/login", req.url);
  return NextResponse.redirect(loginUrl, 303);
}
