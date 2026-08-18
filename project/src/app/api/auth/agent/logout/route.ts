// POST /api/auth/agent/logout
// Clears the agent's session (DB row + cookie) and redirects to /agent/login.
//
// The sidebar/header logout buttons use a plain HTML <form>
// (action="/api/auth/agent/logout" method="POST"). Returning JSON would show
// the raw body ("true") to the user. Instead we return HTTP 303 (See Other),
// the standard PRG pattern: browser follows with a GET to /agent/login.
//
// We use a relative Location header so the redirect works behind reverse
// proxies (Caddy/gateway) — new URL("/agent/login", req.url) would produce
// localhost:3000 (internal), not the public-facing domain.

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
  // 303 See Other with a RELATIVE Location — browser resolves against the
  // current page URL (public domain), avoiding the localhost:3000 issue.
  return new NextResponse(null, {
    status: 303,
    headers: { Location: "/agent/login" },
  });
}
