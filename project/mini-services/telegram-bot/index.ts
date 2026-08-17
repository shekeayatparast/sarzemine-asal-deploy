// سرزمین عسل — Telegram admin bot entry point
// Starts: (1) custom long-polling loop for interactive commands (avoids grammy's
// internal 409-retry conflicts), (2) HTTP server for receiving new-order /
// payment-confirmed notifications from the Next.js app.
import { Bot } from "grammy";
import { BOT_TOKEN, ADMIN_ID, PORT } from "./src/config.js";
import {
  accessControl,
  answerCallbacks,
  handleStart,
  handleHelp,
  handleBack,
  handleStats,
  handleSearch,
  handleNoop,
  handleNewOrders,
  handleAllOrders,
  handleTodayOrders,
  handleVerifyOrders,
  handleStatusFilter,
  handleStatusOrders,
  handleOrderDetails,
  handleOrderStatusMenu,
  handleSetOrderStatus,
  handleSkipTrackingCode,
  handleEditTrackingCode,
  handleCancelOrder,
  handleCustomers,
  handleCustomerDetails,
  handleCustomerOrders,
  handleProducts,
  handleProductDetails,
  handleProductEditPrice,
  handleProductEditDesc,
  handleProductToggleFeatured,
  handleTextMessage,
} from "./src/handlers.js";
import { notifyNewOrderKb, notifyPaymentKb } from "./src/keyboards.js";
import {
  newOrderNotificationMessage,
  paymentConfirmedMessage,
} from "./src/messages.js";

// ── Global error handlers (prevent silent crashes) ───────────────────
process.on("uncaughtException", (e) => {
  console.error("💥 UNCAUGHT EXCEPTION:", e);
});
process.on("unhandledRejection", (e) => {
  console.error("💥 UNHANDLED REJECTION:", e);
});

// ── Create bot ───────────────────────────────────────────────────────
const bot = new Bot(BOT_TOKEN);

// Middlewares
bot.use(accessControl);
bot.use(answerCallbacks);

// Commands
bot.command("start", handleStart);
bot.command("menu", handleStart);
bot.command("help", handleHelp);

// Callback queries — simple navigation
bot.callbackQuery("back", handleBack);
bot.callbackQuery("stats", handleStats);
bot.callbackQuery("search", handleSearch);
bot.callbackQuery("noop", handleNoop);

// Callback queries — order lists
bot.callbackQuery(/^today:(\d+)$/, handleTodayOrders);
bot.callbackQuery(/^verify:(\d+)$/, handleVerifyOrders);
bot.callbackQuery(/^new:(\d+)$/, handleNewOrders);
bot.callbackQuery(/^all:(\d+)$/, handleAllOrders);
bot.callbackQuery(/^st:([^:]+):(\d+)$/, handleStatusOrders);

// Callback queries — order details & status
bot.callbackQuery(/^o:(.+)$/, handleOrderDetails);
bot.callbackQuery(/^os:(.+)$/, handleOrderStatusMenu);
bot.callbackQuery(/^oss:([^:]+):(.+)$/, handleSetOrderStatus);
bot.callbackQuery(/^ossk:([^:]+)$/, handleSkipTrackingCode);
bot.callbackQuery(/^oetrack:([^:]+)$/, handleEditTrackingCode);
bot.callbackQuery(/^ocancel:(.+)$/, handleCancelOrder);

// Callback queries — customers
bot.callbackQuery(/^cust:(\d+)$/, handleCustomers);
bot.callbackQuery(/^c:(.+)$/, handleCustomerDetails);
bot.callbackQuery(/^corders:(.+)$/, handleCustomerOrders);

// Callback queries — products
bot.callbackQuery(/^p:(\d+)$/, handleProducts);
bot.callbackQuery(/^pd:(.+)$/, handleProductDetails);
bot.callbackQuery(/^pe:(.+)$/, handleProductEditPrice);
bot.callbackQuery(/^pdesc:(.+)$/, handleProductEditDesc);
bot.callbackQuery(/^pf:(.+)$/, handleProductToggleFeatured);

// Text messages (search + price/desc edit)
bot.on("message:text", handleTextMessage);

// Error handler — catches errors thrown inside handlers
bot.catch((err) => {
  console.error("❌ Bot handler error:", err.error);
});

// ── Notification sender ──────────────────────────────────────────────
async function sendNotification(text: string, keyboard: any) {
  try {
    await bot.api.sendMessage(ADMIN_ID, text, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: keyboard,
    });
    console.log("✅ Notification sent to admin");
  } catch (e) {
    console.error("❌ Failed to send notification:", e);
  }
}

async function notifyNewOrder(orderNumber: string) {
  console.log(`📨 New order notification: ${orderNumber}`);
  const text = await newOrderNotificationMessage(orderNumber);
  if (!text) {
    console.error("Order not found for notification:", orderNumber);
    return;
  }
  await sendNotification(text, notifyNewOrderKb(orderNumber));
}

async function notifyPaymentConfirmed(orderNumber: string) {
  console.log(`💳 Payment confirmed notification: ${orderNumber}`);
  const text = await paymentConfirmedMessage(orderNumber);
  if (!text) {
    console.error("Order not found for notification:", orderNumber);
    return;
  }
  await sendNotification(text, notifyPaymentKb(orderNumber));
}

// ── HTTP server for notifications from Next.js ───────────────────────
const httpServer = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Health check — includes polling status
    if (req.method === "GET" && url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "telegram-bot",
        port: PORT,
        polling: pollingAlive,
        uptimeSec: Math.floor(process.uptime()),
        crashCount,
        lastPollAt: lastPollAt ? new Date(lastPollAt).toISOString() : null,
      });
    }

    // New order notification
    if (req.method === "POST" && url.pathname === "/notify/new-order") {
      try {
        const body = await req.json();
        const orderNumber = body?.orderNumber;
        if (!orderNumber) {
          return Response.json({ error: "orderNumber required" }, { status: 400 });
        }
        notifyNewOrder(orderNumber).catch((e) =>
          console.error("notifyNewOrder failed:", e)
        );
        return Response.json({ ok: true, queued: true });
      } catch (e) {
        console.error("new-order notify error:", e);
        return Response.json({ error: "bad request" }, { status: 400 });
      }
    }

    // Payment confirmed notification
    if (req.method === "POST" && url.pathname === "/notify/payment-confirmed") {
      try {
        const body = await req.json();
        const orderNumber = body?.orderNumber;
        if (!orderNumber) {
          return Response.json({ error: "orderNumber required" }, { status: 400 });
        }
        notifyPaymentConfirmed(orderNumber).catch((e) =>
          console.error("notifyPaymentConfirmed failed:", e)
        );
        return Response.json({ ok: true, queued: true });
      } catch (e) {
        console.error("payment-confirmed notify error:", e);
        return Response.json({ error: "bad request" }, { status: 400 });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`🌐 Notification HTTP server running on port ${PORT}`);
console.log(`   POST /notify/new-order        — new order alert`);
console.log(`   POST /notify/payment-confirmed — payment confirmed alert`);
console.log(`   GET  /health                   — health check (includes polling status)`);

// ── Custom long-polling loop ─────────────────────────────────────────
// Why custom (not bot.start())? Grammy's bot.start() + our watchdog created
// conflicting getUpdates requests on 409 errors. This custom loop gives us
// full control: exactly ONE getUpdates in-flight at any time, proper offset
// tracking, and clean retry semantics.
//
// The 409 "Conflict" error means another getUpdates is in-flight. With this
// loop, that can ONLY happen if a previous request from THIS loop is still
// pending. We ensure it's not by awaiting each getUpdates before sending the
// next one.
let pollingAlive = false;
let pollingRunning = true;
let crashCount = 0;
let lastPollAt = 0;
let lastUpdateId = 0; // offset tracking — only advance on successful processing

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Adaptive polling: uses long-poll (efficient) when possible, falls back to
// short-poll (timeout=0) when a 409 conflict is detected. This handles the case
// where another bot instance is polling the same token from a different server.
// Every ~60s in short-poll mode, we retry long-poll to detect when the conflict clears.
let useShortPoll = false; // true = timeout=0 mode (409 fallback)
let shortPollSince = 0; // timestamp when we entered short-poll mode
const SHORT_POLL_INTERVAL_MS = 2000; // poll every 2s in short-poll mode
const SHORT_POLL_RETRY_LONG_AFTER_MS = 60000; // retry long-poll after 60s in short mode

async function startPollingLoop() {
  // Clean state: ensure no webhook is set (would conflict with polling)
  try {
    await bot.api.deleteWebhook({ drop_pending_updates: false });
    console.log("✅ Webhook cleared (clean polling state)");
  } catch (e: any) {
    console.warn("⚠️ deleteWebhook failed (continuing):", String(e?.message || e).slice(0, 150));
  }

  // Initialize bot info (needed for bot.handleUpdate)
  try {
    await bot.init();
    console.log(
      `🤖 Telegram bot connected: @${bot.botInfo.username} (id: ${bot.botInfo.id})`
    );
    console.log(`👤 Admin ID: ${ADMIN_ID}`);
  } catch (e: any) {
    console.error("❌ bot.init() failed:", String(e?.message || e).slice(0, 200));
  }

  console.log("✅ Bot polling loop starting (adaptive: long-poll + 409 short-poll fallback)...");

  while (pollingRunning) {
    try {
      pollingAlive = true;
      const offset = lastUpdateId + 1;

      // Decide poll timeout: long-poll (30s) normally, short-poll (0s) on 409 fallback
      const pollTimeout = useShortPoll ? 0 : 30;

      const updates = await bot.api.getUpdates({
        offset,
        limit: 100,
        timeout: pollTimeout,
        allowed_updates: ["message", "callback_query"],
      });
      lastPollAt = Date.now();

      // If we were in short-poll mode and this succeeded, periodically try long-poll again
      if (useShortPoll && Date.now() - shortPollSince > SHORT_POLL_RETRY_LONG_AFTER_MS) {
        console.log("🔄 Retrying long-poll mode (60s elapsed in short-poll fallback)...");
        useShortPoll = false;
      }

      if (updates.length > 0) {
        lastUpdateId = updates[updates.length - 1].update_id;
        for (const update of updates) {
          try {
            await bot.handleUpdate(update);
          } catch (e: any) {
            console.error(
              `❌ handleUpdate failed for update ${update.update_id}:`,
              String(e?.message || e).slice(0, 200)
            );
          }
        }
      }

      if (crashCount > 0) {
        console.log(`✅ Polling recovered after ${crashCount} errors.`);
        crashCount = 0;
      }

      // In short-poll mode, sleep between polls (long-poll mode blocks on the request itself)
      if (useShortPoll) {
        await sleep(SHORT_POLL_INTERVAL_MS);
      }
    } catch (e: any) {
      pollingAlive = false;
      crashCount++;
      const errMsg = String(e?.message || e);
      const errCode = e?.error_code || "N/A";
      const is409 = errCode === 409 || errMsg.includes("409") || errMsg.includes("Conflict");
      const isNetwork =
        errMsg.includes("fetch") ||
        errMsg.includes("network") ||
        errMsg.includes("ETIMEDOUT") ||
        errMsg.includes("ECONNRESET") ||
        errMsg.includes("ECONNREFUSED");
      const is429 = errCode === 429;
      const retryAfter = e?.parameters?.retry_after;

      if (is429 && typeof retryAfter === "number") {
        console.log(`⏳ Rate limited. Waiting ${retryAfter}s (Telegram retry_after)...`);
        await sleep(retryAfter * 1000);
      } else if (is409) {
        // 409 means another bot instance is polling with long-poll. Switch to
        // short-poll mode (timeout=0) which doesn't conflict. This lets our bot
        // coexist with the other instance (we'll get some updates, they'll get some).
        if (!useShortPoll) {
          console.log(
            "⚠️ 409 conflict detected — switching to short-poll mode (timeout=0). " +
              "This means ANOTHER bot instance is polling this token (possibly on another server). " +
              "Short-poll mode will work but is less efficient. Will retry long-poll in 60s."
          );
          useShortPoll = true;
          shortPollSince = Date.now();
        }
        // In short-poll mode, don't sleep extra — the loop will sleep SHORT_POLL_INTERVAL_MS
        if (useShortPoll) {
          await sleep(SHORT_POLL_INTERVAL_MS);
        } else {
          await sleep(5000);
        }
      } else if (isNetwork) {
        console.log("⏳ Network error — waiting 5s before retry...");
        await sleep(5000);
      } else {
        console.error(
          `❌ Polling error #${crashCount} (code=${errCode}):`,
          errMsg.slice(0, 200)
        );
        await sleep(3000);
      }
    }
  }
  pollingAlive = false;
  console.log("ℹ️ Polling loop stopped.");
}

// Start polling in the background
startPollingLoop().catch((e) => {
  console.error("💥 Polling loop crashed unexpectedly:", e);
});

console.log("🍯 سرزمین عسل — Telegram admin bot initializing...");

// ── Graceful shutdown ────────────────────────────────────────────────
let shuttingDown = false;
const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} received, shutting down...`);
  pollingRunning = false;
  try {
    httpServer.stop();
  } catch {}
  // Give the in-flight getUpdates a moment to return, then exit
  setTimeout(() => process.exit(0), 1000);
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
