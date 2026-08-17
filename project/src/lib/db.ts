import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// ── SQLite optimization for concurrent access (site + bot share the DB) ──
// WAL mode allows concurrent readers alongside a single writer, which
// dramatically reduces SQLITE_BUSY errors when the Telegram bot and the
// Next.js site both access the database simultaneously.
// NOTE: In SQLite, ALL PRAGMA statements (even SET forms) can return rows.
// Prisma's $executeRawUnsafe throws if any rows come back, so we use
// $queryRawUnsafe for all pragmas.
let pragmasInitialized = false
async function initSqlitePragmas() {
  if (pragmasInitialized) return
  pragmasInitialized = true
  try {
    await db.$queryRawUnsafe('PRAGMA journal_mode=WAL;')
    await db.$queryRawUnsafe('PRAGMA busy_timeout=10000;')
    await db.$queryRawUnsafe('PRAGMA synchronous=NORMAL;')
    console.log('[db] SQLite pragmas set: WAL, busy_timeout=10s, synchronous=NORMAL')
  } catch (e) {
    console.error('[db] Failed to set SQLite pragmas:', e)
  }
}

initSqlitePragmas()
