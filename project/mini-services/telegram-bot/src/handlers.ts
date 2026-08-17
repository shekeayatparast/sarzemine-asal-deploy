// All command & callback handlers for the Telegram bot.
// Designed around the admin's real workflow:
//   1. Open bot → check today's orders & pending payment verifications
//   2. Verify payments → confirm → prepare → ship → deliver
//   3. Search for specific orders/customers by phone or order number
//   4. Manage products (price, featured, description)
import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { db, withRetry } from "./db.js";
import { ADMIN_ID } from "./config.js";
import {
  toPersianDigits,
  formatToman,
  statusLabel,
  STATUS_LABELS,
  STATUS_EMOJI,
  escapeHtml,
  normalizeSearchQuery,
  toAsciiDigits,
  startOfTodayIran,
  faDateShort,
} from "./format.js";
import {
  mainMenuKb,
  backKb,
  statusFilterKb,
  orderListKb,
  orderActionsKb,
  orderStatusKb,
  cancelConfirmKb,
  customerListKb,
  customerActionsKb,
  productListKb,
  productActionsKb,
  notifyNewOrderKb,
  notifyPaymentKb,
  editPriceCancelKb,
  trackingEntryKb,
} from "./keyboards.js";
import {
  welcomeMessage,
  statsMessage,
  orderListMessage,
  orderDetailsMessage,
  customerListMessage,
  customerDetailsMessage,
  productListMessage,
  productDetailsMessage,
  searchMessage,
  searchOrders,
} from "./messages.js";

const PAGE_SIZE = 5;

// ── In-memory state for multi-step flows ─────────────────────────────
// Each flow stores { action, payload }. Cleared on any navigation.
type UserState =
  | { action: "edit_price"; slug: string }
  | { action: "edit_desc"; slug: string }
  | { action: "enter_tracking"; orderNumber: string; isEdit?: boolean };

const userState = new Map<number, UserState>();

const clearState = (userId: number) => userState.delete(userId);

// ── Helper: extract callback data from ctx ───────────────────────────
// grammy's ctx.match is a RegExpMatchArray when using regex patterns.
// We need the raw callback_data string instead, which is in ctx.callbackQuery.data.
const cbData = (ctx: Context): string => ctx.callbackQuery?.data || "";

// Extract the "payload" portion of a callback data string (everything after the first colon).
// Example: "o:HN-12345" → "HN-12345"; "oss:HN-12345:confirmed" → "HN-12345:confirmed"
const cbPayload = (ctx: Context): string => {
  const data = cbData(ctx);
  const idx = data.indexOf(":");
  return idx >= 0 ? data.slice(idx + 1) : "";
};

// Extract page number from a paginated callback like "today:0", "all:2", "cust:1"
const cbPage = (ctx: Context): number => {
  const data = cbData(ctx);
  const parts = data.split(":");
  return Number(parts[1] || 0);
};

// ── Helper: show text (edit message if possible, else reply) ─────────
async function show(ctx: Context, text: string, keyboard?: any) {
  const opts: any = {
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  if (keyboard) opts.reply_markup = keyboard;
  try {
    await ctx.editMessageText(text, opts);
  } catch {
    try {
      await ctx.reply(text, opts);
    } catch (e) {
      console.error("show() reply failed:", e);
    }
  }
}

// ── Access control middleware ────────────────────────────────────────
export async function accessControl(ctx: Context, next: () => Promise<void>) {
  if (!ctx.from) return;
  if (ctx.from.id !== ADMIN_ID) {
    try {
      await ctx.reply(
        "⛔ شما دسترسی به این ربات ندارید.\n\n" +
          "این ربات اختصاصاً برای مدیریت فروشگاه «سرزمین عسل» طراحی شده است."
      );
    } catch {}
    return;
  }
  return next();
}

// Auto-answer callback queries to remove loading spinner.
// ALSO: clear any pending multi-step flow state (edit_price / edit_desc) on
// every button click. This prevents a stale state from causing the admin's next
// text message to be misinterpreted as a price/desc edit for the OLD product.
// (Handlers that START a flow — handleProductEditPrice, handleProductEditDesc —
// re-set the state AFTER this middleware clears it, so the flow still works.)
export async function answerCallbacks(ctx: Context, next: () => Promise<void>) {
  if (ctx.callbackQuery) {
    try {
      await ctx.answerCallbackQuery();
    } catch {}
    // Clear any pending edit flow — the admin clicked a button, so they're
    // navigating away from the text-input flow. If they clicked "edit price"
    // or "edit desc", the handler will re-set the state after this clears it.
    if (ctx.from) clearState(ctx.from.id);
  }
  return next();
}

// ── Helper: fetch live counts for the main menu ─────────────────────
// The main menu shows count badges for the two most actionable items:
// today's orders and orders awaiting payment verification.
async function fetchMainMenuStats(): Promise<{ todayCount: number; verifyCount: number }> {
  // "today" is defined as midnight Iran time (Asia/Tehran), NOT server-local UTC.
  const todayStart = startOfTodayIran();
  const [todayCount, verifyCount] = await Promise.all([
    db.order.count({ where: { createdAt: { gte: todayStart } } }),
    db.order.count({ where: { orderStatus: "paid" } }),
  ]);
  return { todayCount, verifyCount };
}

// ── /start, /menu ────────────────────────────────────────────────────
export async function handleStart(ctx: Context) {
  clearState(ctx.from?.id || 0);
  const name = ctx.from?.first_name || "";
  const { todayCount, verifyCount } = await fetchMainMenuStats();
  await ctx.reply(welcomeMessage(name, todayCount, verifyCount), {
    parse_mode: "HTML",
    reply_markup: mainMenuKb(todayCount, verifyCount),
    disable_web_page_preview: true,
  });
}

export async function handleHelp(ctx: Context) {
  clearState(ctx.from?.id || 0);
  const msg =
    `📖 <b>راهنمای ربات مدیریت سرزمین عسل</b>\n\n` +
    `این ربات به شما امکان می‌دهد فروشگاه عسل را به طور کامل مدیریت کنید:\n\n` +
    `📦 <b>سفارش‌های امروز:</b> همه سفارش‌های ثبت‌شده امروز\n` +
    `💳 <b>در انتظار تأیید پرداخت:</b> سفارش‌هایی که مشتری پرداخت را تأیید کرده ولی هنوز از طرف شما بررسی نشده\n` +
    `📋 <b>همه سفارش‌ها:</b> لیست کامل با فیلتر بر اساس وضعیت\n` +
    `📊 <b>آمار:</b> گزارش جامع فروش، درآمد و پرفروش‌ترین محصولات\n` +
    `👥 <b>مشتریان:</b> لیست مشتریان و سوابق خرید\n` +
    `🍯 <b>محصولات:</b> مشاهده، ویرایش قیمت، توضیحات و وضعیت ویژه\n` +
    `🔍 <b>جستجو:</b> یافتن سفارش با شماره سفارش، تلفن، یا نام مشتری\n\n` +
    `💡 <b>جستجوی سریع:</b> کافیست شماره سفارش (مثل <code>12345</code> یا <code>HN-12345</code>)، شماره تلفن مشتری، یا نام مشتری را مستقیماً ارسال کنید. ارقام فارسی هم پشتیبانی می‌شوند.\n\n` +
    `🔔 با ثبت هر سفارش جدید یا تأیید پرداخت توسط مشتری، به طور خودکار به شما اطلاع داده می‌شود.\n\n` +
    `📋 <b>گردش کار پیشنهادی:</b>\n` +
    `۱. مشتری سفارش ثبت می‌کند → به شما اطلاع داده می‌شود\n` +
    `۲. مشتری پرداخت می‌کند و دکمه «تأیید پرداخت» را می‌زند → به شما اطلاع داده می‌شود\n` +
    `۳. شما وجه را در حساب بررسی می‌کنید و «✅ تأیید پرداخت» را می‌زنید\n` +
    `۴. سفارش را آماده کرده و وضعیت را به «📦 در حال آماده‌سازی» تغییر می‌دهید\n` +
    `۵. پس از تحویل بسته به پست، وضعیت را به «📮 تحویل به پست» تغییر می‌دهید و کد رهگیری پستی را وارد می‌کنید\n` +
    `۶. مشتری می‌تواند با کد رهگیری، وضعیت لحظه‌ای بسته را از سامانه پست پیگیری کند\n` +
    `۷. پس از تحویل به مشتری، وضعیت را به «🏁 تحویل داده شد» تغییر می‌دهید`;
  const { todayCount, verifyCount } = await fetchMainMenuStats();
  await ctx.reply(msg, {
    parse_mode: "HTML",
    reply_markup: mainMenuKb(todayCount, verifyCount),
    disable_web_page_preview: true,
  });
}

// ── Back to main menu ────────────────────────────────────────────────
export async function handleBack(ctx: Context) {
  clearState(ctx.from?.id || 0);
  const name = ctx.from?.first_name || "";
  const { todayCount, verifyCount } = await fetchMainMenuStats();
  await show(ctx, welcomeMessage(name, todayCount, verifyCount), mainMenuKb(todayCount, verifyCount));
}

// ── Statistics ───────────────────────────────────────────────────────
export async function handleStats(ctx: Context) {
  clearState(ctx.from?.id || 0);
  try {
    await ctx.editMessageText("⏳ در حال محاسبه آمار...", { parse_mode: "HTML" });
  } catch {}
  try {
    const text = await statsMessage();
    await show(ctx, text, backKb());
  } catch (e) {
    console.error("stats error:", e);
    await show(ctx, "❌ خطا در دریافت آمار. دوباره تلاش کنید.", backKb());
  }
}

// ── Today's orders ───────────────────────────────────────────────────
// Admin's most common view: what happened today.
export async function handleTodayOrders(ctx: Context) {
  clearState(ctx.from?.id || 0);
  const page = cbPage(ctx);
  const now = new Date();
  // "today" = midnight Iran time (Asia/Tehran), not server-local UTC.
  const todayStart = startOfTodayIran();
  const { text, totalPages, orders } = await orderListMessage(
    `📦 <b>سفارش‌های امروز</b>\n📅 ${faDateShort(now)}`,
    { createdAt: { gte: todayStart } },
    page
  );
  const kb = orderListKb(orders, "today", page, totalPages);
  await show(ctx, text, kb);
}

// ── Orders awaiting payment verification (status = "paid") ───────────
// These are orders where the customer clicked "I paid" — admin must
// verify the bank transfer and confirm.
export async function handleVerifyOrders(ctx: Context) {
  clearState(ctx.from?.id || 0);
  const page = cbPage(ctx);
  const { text, totalPages, orders } = await orderListMessage(
    `💳 <b>در انتظار تأیید پرداخت</b>\n\n⚠️ این سفارش‌ها توسط مشتری پرداخت اعلام شده‌اند. لطفاً وجه واریزی را در حساب بانکی بررسی کرده و سپس تأیید کنید.`,
    { orderStatus: "paid" },
    page
  );
  const kb = orderListKb(orders, "verify", page, totalPages);
  await show(ctx, text, kb);
}

// ── Order lists ──────────────────────────────────────────────────────
export async function handleNewOrders(ctx: Context) {
  clearState(ctx.from?.id || 0);
  const page = cbPage(ctx);
  const { text, totalPages, orders } = await orderListMessage(
    `⏳ <b>سفارش‌های در انتظار پرداخت</b>`,
    { orderStatus: "awaiting_payment" },
    page
  );
  const kb = orderListKb(orders, "new", page, totalPages);
  await show(ctx, text, kb);
}

export async function handleAllOrders(ctx: Context) {
  clearState(ctx.from?.id || 0);
  const page = cbPage(ctx);
  const { text, totalPages, orders } = await orderListMessage(
    `📋 <b>همه سفارش‌ها</b>`,
    {},
    page
  );
  const kb = orderListKb(orders, "all", page, totalPages);
  await show(ctx, text, kb);
}

export async function handleStatusFilter(ctx: Context) {
  clearState(ctx.from?.id || 0);
  await show(ctx, "📊 <b>فیلتر سفارش‌ها بر اساس وضعیت</b>\n\nیک وضعیت را انتخاب کنید:", statusFilterKb());
}

export async function handleStatusOrders(ctx: Context) {
  clearState(ctx.from?.id || 0);
  // pattern: st:<status>:<page>
  const parts = cbData(ctx).split(":");
  const status = parts[1] || "awaiting_payment";
  const page = Number(parts[2] || 0);
  const where = { orderStatus: status };
  const { text, totalPages, orders } = await orderListMessage(
    `📋 <b>سفارش‌ها — ${statusLabel(status)}</b>`,
    where,
    page
  );
  const kb = orderListKb(orders, `st:${status}`, page, totalPages);
  await show(ctx, text, kb);
}

// ── Order details ────────────────────────────────────────────────────
export async function handleOrderDetails(ctx: Context) {
  clearState(ctx.from?.id || 0);
  const orderNumber = cbPayload(ctx);
  try {
    await ctx.editMessageText("⏳ در حال بارگذاری...", { parse_mode: "HTML" });
  } catch {}
  const order = await db.order.findUnique({
    where: { orderNumber },
    select: { orderStatus: true, trackingCode: true },
  });
  const text = await orderDetailsMessage(orderNumber);
  if (!text) {
    await show(ctx, "❌ سفارش یافت نشد.", backKb());
    return;
  }
  await show(
    ctx,
    text,
    orderActionsKb(orderNumber, order?.orderStatus || "", !!order?.trackingCode)
  );
}

// ── Order status change menu ─────────────────────────────────────────
export async function handleOrderStatusMenu(ctx: Context) {
  const orderNumber = cbPayload(ctx);
  await show(
    ctx,
    `🔄 <b>تغییر وضعیت سفارش</b>\n\n🔖 <code>${orderNumber}</code>\n\nوضعیت جدید را انتخاب کنید:`,
    orderStatusKb(orderNumber)
  );
}

// ── Set order status ─────────────────────────────────────────────────
// This is the admin's primary manual action — changing an order's status.
// It handles the full status workflow: awaiting_payment → paid → confirmed
// → preparing → shipped → delivered (plus cancelled as a side state).
// When the admin advances to "confirmed" or later, payment is also marked
// as confirmed. When moved back to "awaiting_payment", payment resets to pending.
//
// SPECIAL CASE: When the admin advances to "shipped" (تحویل به پست), the
// bot asks for the post tracking code BEFORE updating the status. The admin
// either sends the code as a text message (which is then saved along with
// the status) OR taps "بدون کد رهگیری" to skip and just set the status.
export async function handleSetOrderStatus(ctx: Context) {
  // pattern: oss:<orderNumber>:<status>  (orderNumber has no colon, so parts[1]=orderNumber, parts[2]=status)
  const parts = cbData(ctx).split(":");
  const orderNumber = parts[1];
  const status = parts[2];

  // Validate the status is a known value
  const validStatuses = [
    "awaiting_payment", "paid", "confirmed", "preparing", "shipped", "delivered", "cancelled",
  ];
  if (!validStatuses.includes(status)) {
    await show(ctx, "❌ وضعیت نامعتبر است.", backKb());
    return;
  }

  try {
    // Show a "processing" indicator so the admin knows the click was received
    try {
      await ctx.editMessageText("⏳ در حال به‌روزرسانی وضعیت...", { parse_mode: "HTML" });
    } catch {}

    const order = await withRetry(
      () => db.order.findUnique({
        where: { orderNumber },
        select: {
          id: true,
          customerName: true,
          orderStatus: true,
          deliveryType: true,
          trackingCode: true,
        },
      }),
      { label: `findOrder(${orderNumber})` }
    );
    if (!order) {
      await show(ctx, "❌ سفارش یافت نشد.", backKb());
      return;
    }

    // If status hasn't changed, no-op (avoid unnecessary writes)
    if (order.orderStatus === status) {
      const text = await orderDetailsMessage(orderNumber);
      await show(
        ctx,
        `ℹ️ وضعیت سفارش از قبل «${statusLabel(status)}» بود.\n\n${text || ""}`,
        orderActionsKb(orderNumber, status, !!order.trackingCode)
      );
      return;
    }

    // SPECIAL CASE: status === "shipped" → prompt for the post tracking code
    // before updating. The admin enters the code (or skips) and the order is
    // updated in the tracking-code handler.
    if (status === "shipped") {
      // Re-set the state AFTER the answerCallbacks middleware cleared it.
      userState.set(ctx.from!.id, { action: "enter_tracking", orderNumber });
      const deliveryHint =
        order.deliveryType === "shahrekord"
          ? "\n\n💡 این سفارش از نوع «تحویل در شهرکرد» است. اگر بسته را حضوری تحویل می‌دهید، می‌توانید بدون کد رهگیری ادامه دهید."
          : "\n\n📦 این سفارش پستی است — لطفاً کد رهگیری را از رسید پست وارد کنید تا مشتری بتواند بسته را در سامانه پست پیگیری کند.";
      await show(
        ctx,
        `📮 <b>تحویل به پست — وارد کردن کد رهگیری</b>\n\n` +
          `🔖 سفارش: <code>${orderNumber}</code>\n` +
          `👤 ${escapeHtml(order.customerName)}\n\n` +
          `لطفاً <b>کد رهگیری پستی</b> را ارسال کنید.\n` +
          `کد رهگیری روی رسید پست نوشته شده است (معمولاً ۱۳ تا ۲۰ رقم).\n\n` +
          `📝 ارقام فارسی هم قابل قبول است.` +
          deliveryHint,
        trackingEntryKb(orderNumber)
      );
      return;
    }

    // Determine the correct paymentStatus for the new order status.
    // Rule:
    //   - awaiting_payment  → payment must be "pending"  (customer hasn't paid)
    //   - paid              → payment must be "confirmed" (customer clicked "I paid")
    //   - confirmed/preparing/shipped/delivered → payment must be "confirmed"
    //   - cancelled         → leave unchanged (preserve for accounting/audit)
    //
    // This guarantees the site's tracking page never shows an impossible
    // combination like "shipped + pending payment" or "awaiting + confirmed".
    let newPaymentStatus: string | undefined;
    if (status === "awaiting_payment") {
      newPaymentStatus = "pending";
    } else if (status === "cancelled") {
      newPaymentStatus = undefined; // preserve existing
    } else {
      // paid, confirmed, preparing, shipped, delivered
      newPaymentStatus = "confirmed";
    }

    await withRetry(
      () => db.order.update({
        where: { id: order.id },
        data: {
          orderStatus: status,
          ...(newPaymentStatus !== undefined
            ? { paymentStatus: newPaymentStatus }
            : {}),
        },
      }),
      { label: `updateOrderStatus(${orderNumber})`, maxRetries: 5, baseDelayMs: 300 }
    );

    console.log(
      `📊 Status change: ${orderNumber} ${order.orderStatus} → ${status}` +
        (newPaymentStatus !== undefined
          ? ` (payment: ${newPaymentStatus})`
          : "")
    );

    const text = await orderDetailsMessage(orderNumber);
    const msg =
      `✅ <b>وضعیت سفارش به‌روزرسانی شد</b>\n\n` +
      `📋 <code>${orderNumber}</code>\n` +
      `👤 ${escapeHtml(order.customerName)}\n` +
      `📊 وضعیت قبلی: ${statusLabel(order.orderStatus)}\n` +
      `📊 وضعیت جدید: ${statusLabel(status)}\n\n` +
      (text || "");
    await show(ctx, msg, orderActionsKb(orderNumber, status, false));
  } catch (e: any) {
    // Log the FULL error details so we can diagnose the root cause
    const errCode = e?.code || e?.errno || "N/A";
    const errMsg = String(e?.message || e).slice(0, 300);
    const errStack = e?.stack ? String(e.stack).split("\n").slice(0, 3).join(" | ") : "";
    console.error(
      `❌ handleSetOrderStatus FAILED for ${orderNumber} → ${status} | ` +
      `code=${errCode} | msg=${errMsg}` +
      (errStack ? ` | stack=${errStack}` : "")
    );
    await show(
      ctx,
      `❌ <b>خطا در به‌روزرسانی وضعیت سفارش</b>\n\n` +
        `📋 سفارش: <code>${orderNumber}</code>\n` +
        `📊 وضعیت هدف: ${statusLabel(status)}\n` +
        `⚠️ خطا: <code>${errCode}</code>\n\n` +
        `لطفاً دوباره تلاش کنید. اگر خطا تکرار شد، چند ثانیه صبر کنید و دوباره امتحان کنید.`,
      backKb()
    );
  }
}

// ── Skip tracking code ───────────────────────────────────────────────
// Called when the admin taps "بدون کد رهگیری" in the tracking-entry prompt.
// Updates the order to "shipped" with trackingCode = null.
// GUARD: Only allow if the order is NOT already delivered/cancelled — we don't
// want to accidentally regress a delivered order back to "shipped".
export async function handleSkipTrackingCode(ctx: Context) {
  // pattern: ossk:<orderNumber>
  const orderNumber = cbData(ctx).split(":")[1];
  try {
    try {
      await ctx.editMessageText("⏳ در حال به‌روزرسانی وضعیت...", { parse_mode: "HTML" });
    } catch {}

    const order = await withRetry(
      () => db.order.findUnique({
        where: { orderNumber },
        select: { id: true, customerName: true, orderStatus: true, trackingCode: true },
      }),
      { label: `findOrderSkip(${orderNumber})` }
    );
    if (!order) {
      await show(ctx, "❌ سفارش یافت نشد.", backKb());
      return;
    }

    // Guard: don't regress delivered/cancelled orders
    if (order.orderStatus === "delivered" || order.orderStatus === "cancelled") {
      const text = await orderDetailsMessage(orderNumber);
      await show(
        ctx,
        `⚠️ این سفارش در وضعیت «${statusLabel(order.orderStatus)}» است و نمی‌توان آن را به پست تحویل داد.\n\n${text || ""}`,
        orderActionsKb(orderNumber, order.orderStatus, !!order.trackingCode)
      );
      return;
    }

    // If already shipped with a tracking code, don't clear it via skip
    if (order.orderStatus === "shipped" && order.trackingCode) {
      const text = await orderDetailsMessage(orderNumber);
      await show(
        ctx,
        `ℹ️ این سفارش قبلاً با کد رهگیری ثبت شده است. برای تغییر کد، از دکمه «📝 ویرایش کد رهگیری» استفاده کنید.\n\n${text || ""}`,
        orderActionsKb(orderNumber, "shipped", true)
      );
      return;
    }

    await withRetry(
      () => db.order.update({
        where: { id: order.id },
        data: {
          orderStatus: "shipped",
          paymentStatus: "confirmed",
          trackingCode: null,
        },
      }),
      { label: `updateOrderStatusSkip(${orderNumber})`, maxRetries: 5, baseDelayMs: 300 }
    );

    console.log(`📊 Status change: ${orderNumber} ${order.orderStatus} → shipped (no tracking code)`);

    const text = await orderDetailsMessage(orderNumber);
    const msg =
      `✅ <b>سفارش به پست تحویل داده شد</b>\n\n` +
      `📋 <code>${orderNumber}</code>\n` +
      `👤 ${escapeHtml(order.customerName)}\n` +
      `📊 وضعیت قبلی: ${statusLabel(order.orderStatus)}\n` +
      `📊 وضعیت جدید: ${statusLabel("shipped")}\n` +
      `⚠️ بدون کد رهگیری — مشتری نمی‌تواند بسته را در سامانه پست پیگیری کند.\n\n` +
      (text || "");
    await show(ctx, msg, orderActionsKb(orderNumber, "shipped", false));
  } catch (e: any) {
    const errCode = e?.code || e?.errno || "N/A";
    const errMsg = String(e?.message || e).slice(0, 300);
    console.error(
      `❌ handleSkipTrackingCode FAILED for ${orderNumber} | ` +
      `code=${errCode} | msg=${errMsg}`
    );
    await show(
      ctx,
      `❌ <b>خطا در به‌روزرسانی وضعیت سفارش</b>\n\n` +
        `📋 سفارش: <code>${orderNumber}</code>\n` +
        `⚠️ خطا: <code>${errCode}</code>\n\n` +
        `لطفاً دوباره تلاش کنید.`,
      backKb()
    );
  }
}

// ── Edit tracking code ───────────────────────────────────────────────
// Called when the admin taps "📝 ویرایش کد رهگیری" or "📮 افزودن کد رهگیری"
// on a shipped/delivered order. Enters the enter_tracking state so the next
// text message from the admin will be treated as the new tracking code.
// This does NOT change the order status — it only updates the tracking code.
export async function handleEditTrackingCode(ctx: Context) {
  // pattern: oetrack:<orderNumber>
  const orderNumber = cbData(ctx).split(":")[1];
  try {
    const order = await withRetry(
      () => db.order.findUnique({
        where: { orderNumber },
        select: {
          id: true,
          customerName: true,
          orderStatus: true,
          trackingCode: true,
          deliveryType: true,
        },
      }),
      { label: `findOrderEditTrack(${orderNumber})` }
    );
    if (!order) {
      await show(ctx, "❌ سفارش یافت نشد.", backKb());
      return;
    }

    // Only allow editing tracking for shipped/delivered orders
    if (order.orderStatus !== "shipped" && order.orderStatus !== "delivered") {
      await show(
        ctx,
        `⚠️ فقط در سفارش‌های «تحویل به پست» یا «تحویل داده شد» می‌توانید کد رهگیری را ویرایش کنید.\n\nوضعیت فعلی: ${statusLabel(order.orderStatus)}`,
        orderActionsKb(orderNumber, order.orderStatus, false)
      );
      return;
    }

    // Re-set the state AFTER the answerCallbacks middleware cleared it.
    // Use isEdit=true so the text handler knows to ONLY update the tracking
    // code (not change the status).
    userState.set(ctx.from!.id, { action: "enter_tracking", orderNumber, isEdit: true });

    const existingCodeMsg = order.trackingCode
      ? `\n📮 کد رهگیری فعلی: <code>${escapeHtml(order.trackingCode)}</code>\n`
      : "\n⚠️ این سفارش هنوز کد رهگیری ندارد.\n";

    const deliveryHint =
      order.deliveryType === "shahrekord"
        ? "\n\n💡 این سفارش از نوع «تحویل در شهرکرد» است."
        : "\n\n📦 این سفارش پستی است — لطفاً کد رهگیری را از رسید پست وارد کنید.";

    await show(
      ctx,
      `📝 <b>ویرایش کد رهگیری پستی</b>\n\n` +
        `🔖 سفارش: <code>${orderNumber}</code>\n` +
        `👤 ${escapeHtml(order.customerName)}\n` +
        `📊 وضعیت: ${statusLabel(order.orderStatus)}` +
        existingCodeMsg +
        `\nلطفاً <b>کد رهگیری پستی جدید</b> را ارسال کنید.\n` +
        `کد رهگیری روی رسید پست نوشته شده است (معمولاً ۱۳ تا ۲۰ رقم).\n\n` +
        `📝 ارقام فارسی هم قابل قبول است.` +
        deliveryHint,
      trackingEntryKb(orderNumber)
    );
  } catch (e: any) {
    console.error(
      `❌ handleEditTrackingCode FAILED for ${orderNumber}:`,
      String(e?.message || e).slice(0, 200)
    );
    await show(ctx, "❌ خطا در بارگذاری. دوباره تلاش کنید.", backKb());
  }
}

// ── Cancel order confirmation ────────────────────────────────────────
export async function handleCancelOrder(ctx: Context) {
  const orderNumber = cbPayload(ctx);
  await show(
    ctx,
    `⚠️ <b>تأیید لغو سفارش</b>\n\n` +
      `🔖 <code>${orderNumber}</code>\n\n` +
      `آیا مطمئن هستید که می‌خواهید این سفارش را لغو کنید؟\n` +
      `این عمل قابل بازگشت نیست (هرچند وضعیت را می‌توانید دوباره تغییر دهید).`,
    cancelConfirmKb(orderNumber)
  );
}

// ── Customers ────────────────────────────────────────────────────────
export async function handleCustomers(ctx: Context) {
  clearState(ctx.from?.id || 0);
  const page = cbPage(ctx);
  const { text, totalPages, customers } = await customerListMessage(page);
  const kb = customerListKb(customers, page, totalPages);
  await show(ctx, text, kb);
}

export async function handleCustomerDetails(ctx: Context) {
  const phone = cbPayload(ctx);
  try {
    await ctx.editMessageText("⏳ در حال بارگذاری...", { parse_mode: "HTML" });
  } catch {}
  const text = await customerDetailsMessage(phone);
  if (!text) {
    await show(ctx, "❌ مشتری یافت نشد.", backKb());
    return;
  }
  await show(ctx, text, customerActionsKb(phone));
}

// Show all orders of a customer (reuses order list view)
export async function handleCustomerOrders(ctx: Context) {
  const phone = cbPayload(ctx);
  const orders = await db.order.findMany({
    where: { customerPhone: phone },
    orderBy: { createdAt: "desc" },
    select: {
      orderNumber: true,
      customerName: true,
      finalAmount: true,
      customerPhone: true,
    },
  });
  if (orders.length === 0) {
    await show(ctx, "❌ سفارشی برای این مشتری یافت نشد.", customerActionsKb(phone));
    return;
  }
  const kb = new InlineKeyboard();
  for (const o of orders) {
    kb.text(`${o.orderNumber} | ${o.customerName}`, `o:${o.orderNumber}`).row();
  }
  kb.text("🔙 بازگشت به مشتری", `c:${phone}`);
  await show(
    ctx,
    `📋 <b>سفارش‌های مشتری</b>\n📱 <code>${toPersianDigits(phone)}</code>\n\n${toPersianDigits(orders.length)} سفارش:`,
    kb
  );
}

// ── Products ─────────────────────────────────────────────────────────
export async function handleProducts(ctx: Context) {
  clearState(ctx.from?.id || 0);
  const page = cbPage(ctx);
  const { text, totalPages, products } = await productListMessage(page);
  const kb = productListKb(products, page, totalPages);
  await show(ctx, text, kb);
}

export async function handleProductDetails(ctx: Context) {
  const slug = cbPayload(ctx);
  try {
    await ctx.editMessageText("⏳ در حال بارگذاری...", { parse_mode: "HTML" });
  } catch {}
  const p = await db.product.findUnique({
    where: { slug },
    select: { slug: true, name: true, featured: true },
  });
  if (!p) {
    await show(ctx, "❌ محصول یافت نشد.", backKb());
    return;
  }
  const text = await productDetailsMessage(slug);
  await show(ctx, text || "❌ خطا در بارگذاری محصول.", productActionsKb(slug, p.featured));
}

// Toggle featured status
export async function handleProductToggleFeatured(ctx: Context) {
  const slug = cbPayload(ctx);
  const p = await withRetry(
    () => db.product.findUnique({
      where: { slug },
      select: { featured: true, name: true },
    }),
    { label: `findProductFeatured(${slug})` }
  );
  if (!p) {
    await show(ctx, "❌ محصول یافت نشد.", backKb());
    return;
  }
  await withRetry(
    () => db.product.update({
      where: { slug },
      data: { featured: !p.featured },
    }),
    { label: `updateProductFeatured(${slug})`, maxRetries: 5, baseDelayMs: 300 }
  );
  const text = await productDetailsMessage(slug);
  await show(
    ctx,
    `✅ محصول «${escapeHtml(p.name)}» ${p.featured ? "از ویژه‌ها حذف شد" : "به ویژه‌ها اضافه شد"}.\n\n🌐 این تغییر بلافاصله در سایت اعمال می‌شود.\n\n${text || ""}`,
    productActionsKb(slug, !p.featured)
  );
  console.log(`⭐ Product featured: ${slug} → ${!p.featured}`);
}

// ── Product price edit ───────────────────────────────────────────────
export async function handleProductEditPrice(ctx: Context) {
  const slug = cbPayload(ctx);
  const product = await db.product.findUnique({
    where: { slug },
    select: { name: true, pricePerKg: true },
  });
  if (!product) {
    await show(ctx, "❌ محصول یافت نشد.", backKb());
    return;
  }
  userState.set(ctx.from!.id, { action: "edit_price", slug });
  await show(
    ctx,
    `✏️ <b>ویرایش قیمت محصول</b>\n\n` +
      `🍯 ${escapeHtml(product.name)}\n` +
      `💰 قیمت فعلی هر کیلو: <b>${formatToman(product.pricePerKg)}</b>\n\n` +
      `قیمت جدید را به <b>تومان</b> وارد کنید (فقط عدد):\n` +
      `مثال: <code>1500000</code>\n\n` +
      `⚠️ ارقام فارسی هم قابل قبول است.\n` +
      `برای لغو، روی دکمه زیر بزنید.`,
    editPriceCancelKb(slug)
  );
}

// ── Product description edit ─────────────────────────────────────────
export async function handleProductEditDesc(ctx: Context) {
  const slug = cbPayload(ctx);
  const product = await db.product.findUnique({
    where: { slug },
    select: { name: true, description: true },
  });
  if (!product) {
    await show(ctx, "❌ محصول یافت نشد.", backKb());
    return;
  }
  userState.set(ctx.from!.id, { action: "edit_desc", slug });
  await show(
    ctx,
    `📝 <b>ویرایش توضیحات محصول</b>\n\n` +
      `🍯 ${escapeHtml(product.name)}\n` +
      `📝 توضیحات فعلی:\n${escapeHtml(product.description)}\n\n` +
      `توضیحات جدید را ارسال کنید:\n\n` +
      `⚠️ برای لغو، روی دکمه زیر بزنید.`,
    new InlineKeyboard().text("❌ لغو", `pd:${slug}`)
  );
}

// ── Search ───────────────────────────────────────────────────────────
export async function handleSearch(ctx: Context) {
  await show(
    ctx,
    `🔍 <b>جستجوی سفارش</b>\n\n` +
      `شماره سفارش، شماره تلفن، یا نام مشتری را ارسال کنید.\n\n` +
      `💡 <b>نمونه‌ها:</b>\n` +
      `• شماره سفارش: <code>12345</code> یا <code>HN-12345</code>\n` +
      `• شماره تلفن: <code>09123456789</code>\n` +
      `• نام مشتری: <code>علی</code>\n\n` +
      `📝 ارقام فارسی هم پشتیبانی می‌شوند.\n` +
      `همچنین می‌توانید مستقیماً متن را ارسال کنید — همیشه به عنوان جستجو در نظر گرفته می‌شود.`,
    backKb()
  );
}

// ── Text message handler (search + price/desc edit) ──────────────────
export async function handleTextMessage(ctx: Context) {
  const text = ctx.message?.text || "";
  const userId = ctx.from!.id;

  // Check if in a multi-step flow
  const state = userState.get(userId);
  if (state && state.action === "edit_price") {
    clearState(userId);
    // Convert Persian/Arabic digits to ASCII, then validate.
    // IMPORTANT: We must reject negative numbers, decimals, and any non-digit
    // characters. The old code used .replace(/[^\d]/g, "") which STRIPPED
    // the minus sign, turning "-100" into "100" (a valid positive price!).
    // Now we require the input to be purely digits (after whitespace removal).
    const asciiText = toAsciiDigits(text).replace(/\s/g, "");
    if (!/^\d+$/.test(asciiText)) {
      await ctx.reply(
        "❌ قیمت نامعتبر است. لطفاً یک عدد صحیح مثبت وارد کنید (فقط ارقام، بدون علامت یا کاما).",
        { reply_markup: productActionsKb(state.slug), parse_mode: "HTML" }
      );
      return;
    }
    const price = parseInt(asciiText, 10);
    if (isNaN(price) || price <= 0) {
      await ctx.reply(
        "❌ قیمت نامعتبر است. لطفاً یک عدد صحیح مثبت وارد کنید.",
        { reply_markup: productActionsKb(state.slug), parse_mode: "HTML" }
      );
      return;
    }
    if (price > 1_000_000_000) {
      await ctx.reply(
        "❌ قیمت بیش از حد بزرگ است. لطفاً مقدار را بررسی کنید.",
        { reply_markup: productActionsKb(state.slug), parse_mode: "HTML" }
      );
      return;
    }
    // Fetch old price for the diff message
    const before = await withRetry(
      () => db.product.findUnique({
        where: { slug: state.slug },
        select: { name: true, pricePerKg: true, featured: true },
      }),
      { label: `findProductPrice(${state.slug})` }
    );
    if (!before) {
      await ctx.reply("❌ محصول یافت نشد.", backKb());
      return;
    }
    await withRetry(
      () => db.product.update({
        where: { slug: state.slug },
        data: { pricePerKg: price },
      }),
      { label: `updateProductPrice(${state.slug})`, maxRetries: 5, baseDelayMs: 300 }
    );
    const detailText = await productDetailsMessage(state.slug);
    const diff = price - (before.pricePerKg || 0);
    const diffStr =
      diff === 0
        ? "بدون تغییر"
        : diff > 0
        ? `🔺 افزایش: +${formatToman(diff)}`
        : `🔻 کاهش: ${formatToman(Math.abs(diff))}`;
    await ctx.reply(
      `✅ <b>قیمت محصول به‌روزرسانی شد</b>\n\n` +
        `🍯 ${escapeHtml(before.name)}\n` +
        `💰 قیمت قبلی: ${formatToman(before.pricePerKg)}\n` +
        `💰 قیمت جدید: <b>${formatToman(price)}</b>\n` +
        `📊 ${diffStr}\n\n` +
        `🌐 این تغییر بلافاصله در سایت اعمال می‌شود.\n\n${detailText || ""}`,
      { parse_mode: "HTML", reply_markup: productActionsKb(state.slug, before.featured) }
    );
    console.log(
      `💰 Product price: ${state.slug} ${before.pricePerKg} → ${price}`
    );
    return;
  }

  if (state && state.action === "edit_desc") {
    clearState(userId);
    if (!text.trim()) {
      await ctx.reply(
        "❌ توضیحات نمی‌تواند خالی باشد.",
        { reply_markup: productActionsKb(state.slug), parse_mode: "HTML" }
      );
      return;
    }
    await withRetry(
      () => db.product.update({
        where: { slug: state.slug },
        data: { description: text.trim() },
      }),
      { label: `updateProductDesc(${state.slug})`, maxRetries: 5, baseDelayMs: 300 }
    );
    const product = await withRetry(
      () => db.product.findUnique({
        where: { slug: state.slug },
        select: { name: true, featured: true },
      }),
      { label: `findProductAfterDesc(${state.slug})` }
    );
    const detailText = await productDetailsMessage(state.slug);
    await ctx.reply(
      `✅ توضیحات محصول «${escapeHtml(product?.name || "")}» به‌روزرسانی شد.\n\n🌐 این تغییر بلافاصله در سایت اعمال می‌شود.\n\n${detailText || ""}`,
      { parse_mode: "HTML", reply_markup: productActionsKb(state.slug, product?.featured || false) }
    );
    console.log(`📝 Product desc updated: ${state.slug}`);
    return;
  }

  // Tracking code entry flow — when admin is setting an order to "shipped"
  // (تحویل به پست), they must enter the post tracking code.
  // Also handles the "edit tracking code" flow (isEdit=true) where the order
  // is already shipped/delivered and only the trackingCode should be updated.
  if (state && state.action === "enter_tracking") {
    const orderNumber = state.orderNumber;
    const isEdit = state.isEdit === true;
    clearState(userId);
    // Normalize: convert Persian/Arabic digits to ASCII, strip whitespace.
    // Tracking codes are typically all digits (13-20 digits for Iran Post),
    // but we also allow letters (some registered post uses letters).
    const normalized = toAsciiDigits(text).replace(/\s+/g, "");
    // Validation: length 8-30, only alphanumeric
    if (!/^[A-Za-z0-9]{8,30}$/.test(normalized)) {
      await ctx.reply(
        "❌ کد رهگیری نامعتبر است.\n\n" +
          "کد رهگیری باید:\n" +
          "• بین ۸ تا ۳۰ نویسه باشد\n" +
          "• فقط شامل ارقام و حروف انگلیسی باشد\n" +
          "• بدون فاصله یا کاراکتر خاص باشد\n\n" +
          "لطفاً کد رهگیری صحیح را ارسال کنید یا روی «بدون کد رهگیری» بزنید.",
        { parse_mode: "HTML", reply_markup: trackingEntryKb(orderNumber) }
      );
      // Re-set state so the next message is treated as another attempt
      // (preserve isEdit flag)
      userState.set(userId, { action: "enter_tracking", orderNumber, isEdit });
      return;
    }
    try {
      const order = await withRetry(
        () => db.order.findUnique({
          where: { orderNumber },
          select: { id: true, customerName: true, orderStatus: true, trackingCode: true },
        }),
        { label: `findOrderTracking(${orderNumber})` }
      );
      if (!order) {
        await ctx.reply("❌ سفارش یافت نشد.", { reply_markup: backKb(), parse_mode: "HTML" });
        return;
      }

      if (isEdit) {
        // EDIT mode: only update the tracking code, don't change orderStatus.
        // Guard: only allow if order is shipped or delivered.
        if (order.orderStatus !== "shipped" && order.orderStatus !== "delivered") {
          await ctx.reply(
            `⚠️ این سفارش در وضعیت «${statusLabel(order.orderStatus)}» است و نمی‌توان کد رهگیری آن را ویرایش کرد.`,
            { parse_mode: "HTML", reply_markup: orderActionsKb(orderNumber, order.orderStatus, !!order.trackingCode) }
          );
          return;
        }
        await withRetry(
          () => db.order.update({
            where: { id: order.id },
            data: { trackingCode: normalized },
          }),
          { label: `updateTrackingEdit(${orderNumber})`, maxRetries: 5, baseDelayMs: 300 }
        );
        console.log(
          `📮 Tracking code updated: ${orderNumber} (was: ${order.trackingCode || "none"} → ${normalized})`
        );
        const detailText = await orderDetailsMessage(orderNumber);
        await ctx.reply(
          `✅ <b>کد رهگیری به‌روزرسانی شد</b>\n\n` +
            `📋 <code>${orderNumber}</code>\n` +
            `👤 ${escapeHtml(order.customerName)}\n` +
            `📊 وضعیت: ${statusLabel(order.orderStatus)}\n` +
            (order.trackingCode
              ? `📮 کد قبلی: <code>${escapeHtml(order.trackingCode)}</code>\n`
              : "") +
            `📮 کد جدید: <code>${escapeHtml(normalized)}</code>\n\n` +
            `🌐 مشتری می‌تواند با این کد رهگیری، وضعیت لحظه‌ای بسته را در سامانه پست پیگیری کند.\n\n` +
            (detailText || ""),
          { parse_mode: "HTML", reply_markup: orderActionsKb(orderNumber, order.orderStatus, true) }
        );
      } else {
        // NEW SHIPMENT mode: set orderStatus to shipped + trackingCode.
        await withRetry(
          () => db.order.update({
            where: { id: order.id },
            data: {
              orderStatus: "shipped",
              paymentStatus: "confirmed",
              trackingCode: normalized,
            },
          }),
          { label: `updateOrderTracking(${orderNumber})`, maxRetries: 5, baseDelayMs: 300 }
        );
        console.log(
          `📊 Status change: ${orderNumber} ${order.orderStatus} → shipped (tracking: ${normalized})`
        );
        const detailText = await orderDetailsMessage(orderNumber);
        await ctx.reply(
          `✅ <b>سفارش به پست تحویل داده شد</b>\n\n` +
            `📋 <code>${orderNumber}</code>\n` +
            `👤 ${escapeHtml(order.customerName)}\n` +
            `📊 وضعیت قبلی: ${statusLabel(order.orderStatus)}\n` +
            `📊 وضعیت جدید: ${statusLabel("shipped")}\n` +
            `📮 کد رهگیری: <code>${escapeHtml(normalized)}</code>\n\n` +
            `🌐 مشتری می‌تواند با این کد رهگیری، وضعیت لحظه‌ای بسته را در سامانه پست پیگیری کند.\n\n` +
            (detailText || ""),
          { parse_mode: "HTML", reply_markup: orderActionsKb(orderNumber, "shipped", true) }
        );
      }
    } catch (e: any) {
      const errCode = e?.code || e?.errno || "N/A";
      const errMsg = String(e?.message || e).slice(0, 300);
      console.error(
        `❌ enter_tracking FAILED for ${orderNumber} (isEdit=${isEdit}) | code=${errCode} | msg=${errMsg}`
      );
      await ctx.reply(
        `❌ خطا در ثبت کد رهگیری.\n\n⚠️ خطا: <code>${errCode}</code>\n\nلطفاً دوباره تلاش کنید.`,
        { parse_mode: "HTML", reply_markup: backKb() }
      );
    }
    return;
  }

  // Default: treat as search
  const query = text.trim();
  if (!query) return;
  try {
    await ctx.reply("⏳ در حال جستجو...", { parse_mode: "HTML" });
  } catch {}
  const msg = await searchMessage(query);
  const orders = await searchOrders(query);
  let kb = backKb();
  if (orders.length > 0) {
    kb = new InlineKeyboard();
    for (const o of orders) {
      kb.text(`${o.orderNumber} | ${o.customerName}`, `o:${o.orderNumber}`).row();
    }
    kb.text("🔙 منوی اصلی", "back");
  }
  await ctx.reply(msg, {
    parse_mode: "HTML",
    reply_markup: kb,
    disable_web_page_preview: true,
  });
}

// ── Noop (for info buttons / pagination indicator) ───────────────────
export async function handleNoop(_ctx: Context) {
  // Do nothing — callback already answered by middleware
}

// Export state for external clearing
export { userState, clearState };
