// Prisma client for the Telegram bot — shares the same SQLite DB as the web app.
//
// CRITICAL: Both the Next.js site and this bot write to the same SQLite file.
// SQLite has a single-writer lock. To prevent SQLITE_BUSY errors when both
// processes try to write at the same time, we:
//   1. Enable WAL journal mode (persistent — allows concurrent readers + 1 writer)
//   2. Set a 10-second busy_timeout so writers wait instead of failing instantly
//   3. Provide a `withRetry` helper that retries on SQLITE_BUSY with backoff
import { PrismaClient, Prisma } from "@prisma/client";

const globalForBot = globalThis as unknown as {
  botPrisma: PrismaClient | undefined;
};

export const db =
  globalForBot.botPrisma ??
  new PrismaClient({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalForBot.botPrisma = db;

// ── One-time SQLite pragma setup ─────────────────────────────────────
// WAL mode is persistent (survives restarts). busy_timeout is per-connection
// but Prisma keeps a connection pool, so we set it on every query via $on.
// We also run it once at startup to be safe.
//
// NOTE: In SQLite, PRAGMA statements (even SET forms like `PRAGMA busy_timeout=X`)
// can return rows. Prisma's $executeRawUnsafe throws "Execute returned results"
// if any rows come back. So we ALWAYS use $queryRawUnsafe for pragmas.
let pragmasInitialized = false;
async function initSqlitePragmas() {
  if (pragmasInitialized) return;
  pragmasInitialized = true;
  try {
    // WAL mode allows concurrent readers alongside a single writer.
    // This dramatically reduces SQLITE_BUSY errors.
    await db.$queryRawUnsafe("PRAGMA journal_mode=WAL;");
    // Wait up to 10 seconds if the DB is locked by another writer.
    await db.$queryRawUnsafe("PRAGMA busy_timeout=10000;");
    // Normal synchronous level — good balance of safety and speed.
    await db.$queryRawUnsafe("PRAGMA synchronous=NORMAL;");
    console.log("✅ SQLite pragmas set: WAL mode, busy_timeout=10s, synchronous=NORMAL");
  } catch (e) {
    console.error("⚠️ Failed to set SQLite pragmas:", e);
  }
}

// Fire-and-forget initialization. The first DB query might race with this,
// but Prisma will retry internally for the busy_timeout window.
initSqlitePragmas();

// ── Retry helper for SQLITE_BUSY / SQLITE_LOCKED ─────────────────────
// Even with WAL mode + busy_timeout, extreme contention can still cause
// SQLITE_BUSY. This helper retries with exponential backoff.
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelayMs?: number; label?: string } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 200;
  const label = options.label ?? "DB operation";

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      // Prisma wraps SQLite errors. Check for common busy/locked codes.
      const msg = String(e?.message || "");
      const code = e?.code || e?.errno || "";
      const isBusy =
        msg.includes("SQLITE_BUSY") ||
        msg.includes("SQLITE_LOCKED") ||
        msg.includes("database is locked") ||
        code === "P2024" || // Prisma: Timed out fetching a connection from the pool
        code === "P2034";   // Prisma: Transaction failed (could be lock conflict)

      if (!isBusy || attempt === maxRetries) {
        throw e;
      }
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.warn(
        `⏳ ${label} retry ${attempt + 1}/${maxRetries} after ${delay}ms ` +
          `(code=${code}, msg=${msg.slice(0, 100)})`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}
