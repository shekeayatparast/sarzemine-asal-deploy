// Authentication utilities for سرزمین عسل
// Handles password hashing, token generation, and session cookies
// for both Agent and Admin panels.

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import * as crypto from "crypto";
// Re-export phone helpers from the client-safe format module so that
// callers can import them from "@/lib/auth" without caring where they live.
// The actual implementation lives in format.ts (which has no server-only
// imports) so that client components can also import the same helpers.
export {
  isValidIranPhone,
  normalizeIranPhone,
  persianToEnglishDigits,
} from "@/lib/format";

// ── Constants ────────────────────────────────────────────────────────
const BCRYPT_ROUNDS = 10;
const SESSION_COOKIE_NAME = "sarzemine_session";
const SESSION_TYPE_AGENT = "agent";
const SESSION_TYPE_ADMIN = "admin";
const SESSION_TTL_DAYS = 7;

// ── Password hashing ──────────────────────────────────────────────────
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  // bcryptjs sometimes returns with extra null bytes; trim defensively
  const cleanHash = (hash || "").replace(/\0/g, "");
  if (!cleanHash) return false;
  try {
    return await bcrypt.compare(plain, cleanHash);
  } catch {
    return false;
  }
}

// ── Token generation (cryptographically secure) ───────────────────────
export function generateToken(): string {
  // Use Node crypto module (works in Bun and Node)
  return crypto.randomBytes(32).toString("hex");
}

// ── Session management ────────────────────────────────────────────────
// Sessions are stored in the AgentSession table for agents.
// Admins use short-lived signed cookies with id+token.

export interface SessionUser {
  type: "agent" | "admin";
  id: string;
  name: string;
  // For agents only
  storeName?: string;
  status?: string;
  // For admins only
  role?: string;
}

// ── Agent session helpers ─────────────────────────────────────────────
export async function createAgentSession(agentId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  await db.agentSession.create({
    data: { agentId, token, expiresAt },
  });

  // Update last login
  await db.agent.update({
    where: { id: agentId },
    data: { lastLoginAt: new Date() },
  });

  return token;
}

export async function getAgentFromToken(
  token: string | undefined
): Promise<SessionUser | null> {
  if (!token) return null;
  const session = await db.agentSession.findUnique({
    where: { token },
    include: { agent: true },
  });
  if (!session) return null;
  // Expired?
  if (session.expiresAt < new Date()) {
    await db.agentSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  // Agent blocked/rejected? Then invalidate session.
  // Pending agents keep their session so the layout can show the
  // "waiting for approval" page instead of forcing them back to login.
  if (
    session.agent.status === "blocked" ||
    session.agent.status === "rejected"
  ) {
    await db.agentSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return {
    type: SESSION_TYPE_AGENT,
    id: session.agent.id,
    name: session.agent.name,
    storeName: session.agent.storeName,
    status: session.agent.status,
  };
}

export async function destroyAgentSession(token: string): Promise<void> {
  await db.agentSession.deleteMany({ where: { token } }).catch(() => {});
}

// ── Admin session helpers (signed cookie, no DB) ─────────────────────
// For admins we use a simple HMAC-signed cookie. The session id + signature
// is stored in the cookie. To revoke, we'd need a DB table — for v1, no
// revocation needed (admins are trusted).
const ADMIN_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  "sarzemine-asal-admin-secret-change-in-prod-please-2026";

function signAdminPayload(payload: string): string {
  const hmac = crypto.createHmac("sha256", ADMIN_SECRET);
  hmac.update(payload);
  return hmac.digest("hex");
}

export async function createAdminSession(adminId: string): Promise<string> {
  // Payload: id|exp_timestamp
  const exp = Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${adminId}|${exp}`;
  const sig = signAdminPayload(payload);
  // Combine and base64-encode (URL-safe)
  const token = `${payload}.${sig}`;
  // Update last login
  await db.admin
    .update({
      where: { id: adminId },
      data: { lastLoginAt: new Date() },
    })
    .catch(() => {});
  return token;
}

export async function getAdminFromToken(
  token: string | undefined
): Promise<SessionUser | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expectedSig = signAdminPayload(payload);
  if (sig !== expectedSig) return null;
  const [id, expStr] = payload.split("|");
  if (!id || !expStr) return null;
  const exp = parseInt(expStr, 10);
  if (isNaN(exp) || Date.now() > exp) return null;
  const admin = await db.admin.findUnique({ where: { id } }).catch(() => null);
  if (!admin || !admin.active) return null;
  return {
    type: SESSION_TYPE_ADMIN,
    id: admin.id,
    name: admin.name,
    role: admin.role,
  };
}

// ── Cookie helpers (for server actions / route handlers) ─────────────
export async function setSessionCookie(
  token: string,
  type: "agent" | "admin"
): Promise<void> {
  const isProd = process.env.NODE_ENV === "production";
  const c = await cookies();
  c.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
  // Also set a non-httpOnly "current user" cookie for client-side state
  // (so the site header can show agent/admin links without an API call)
  c.set("sarzemine_user_type", type, {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const c = await cookies();
  c.delete(SESSION_COOKIE_NAME);
  c.delete("sarzemine_user_type");
}

export async function getSessionToken(): Promise<string | undefined> {
  const c = await cookies();
  return c.get(SESSION_COOKIE_NAME)?.value;
}

// ── Main: get current session user ────────────────────────────────────
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = await getSessionToken();
  if (!token) return null;
  // Try agent first (DB session)
  const agentUser = await getAgentFromToken(token);
  if (agentUser) return agentUser;
  // Then admin (signed cookie)
  return await getAdminFromToken(token);
}

export async function getCurrentAgent(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  return user?.type === "agent" ? user : null;
}

export async function getCurrentAdmin(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  return user?.type === "admin" ? user : null;
}

// ── For route handlers: require auth helpers ──────────────────────────
export async function requireAgent(): Promise<SessionUser> {
  const user = await getCurrentAgent();
  if (!user) {
    throw new Error("UNAUTHORIZED: agent session required");
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentAdmin();
  if (!user) {
    throw new Error("UNAUTHORIZED: admin session required");
  }
  return user;
}

// Convenience: get the cookie name (for client-side fetches / axios etc.)
export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

// NOTE: phone validation helpers (isValidIranPhone, normalizeIranPhone,
// persianToEnglishDigits) are re-exported from "@/lib/format" at the top
// of this file. They live there so client components can also import them.

// ── Password strength validation ──────────────────────────────────────
export function isStrongPassword(pwd: string): { ok: boolean; reason?: string } {
  if (pwd.length < 6) return { ok: false, reason: "رمز عبور باید حداقل ۶ کاراکتر باشد" };
  if (!/\d/.test(pwd)) return { ok: false, reason: "رمز عبور باید حداقل یک عدد داشته باشد" };
  if (!/[a-zA-Z]/.test(pwd)) return { ok: false, reason: "رمز عبور باید حداقل یک حرف داشته باشد" };
  return { ok: true };
}
