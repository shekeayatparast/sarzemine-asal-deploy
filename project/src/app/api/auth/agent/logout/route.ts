// POST /api/auth/agent/logout
// Clears the agent's session (DB row + cookie) and redirects to /agent/login.
//
// The sidebar/header logout buttons use a plain HTML <form>
// (action="/api/auth/agent/logout" method="POST"). Returning JSON would show
// the raw body ("true") to the user. Instead we return HTTP 303 (See Other),
// the standard PRG pattern: browser follows with a GET to /agent/login.

import { NextRequest, NextResponse } from "next/server";
import {
  getSessionToken,
  destroyAgentSession,
  clearSessionCookie,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const token = await getSessionToken();
    if (token) {
      await destroyAgentSession(token);
    }
    await clearSessionCookie();
  } catch (err) {
    console.error("[agent/logout] error:", err);
    // Even on error, clear the cookie so the client logs out
    await clearSessionCookie().catch(() => {});
  }
  // 303 See Other → browser follows with GET to /agent/login
  const loginUrl = new URL("/agent/login", req.url);
  return NextResponse.redirect(loginUrl, 303);
}
