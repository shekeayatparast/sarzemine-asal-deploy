// Configuration for the Telegram admin bot of سرزمین عسل
// All values are read from environment variables (set in .env by setup.sh).

export const BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN ||
  "8902705780:AAFGE0CuGGvyXYDT2yQRHME6iKB4sdXG3pQ";

// Telegram numeric ID of the admin (sales manager)
export const ADMIN_ID = Number(
  process.env.TELEGRAM_ADMIN_ID || "5207653104"
);

// HTTP port for receiving notifications from the Next.js app
export const PORT = Number(process.env.BOT_PORT || "3003");

// Database path (same SQLite DB as the web app).
// Must be set via DATABASE_URL env var — no hardcoded fallback to avoid
// accidentally writing to a wrong location.
export const DATABASE_URL =
  process.env.DATABASE_URL ||
  (() => {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
        "Make sure .env exists and is loaded (systemd EnvironmentFile)."
    );
  })();
