// Inline keyboards for the Telegram bot
// Organized around the admin's daily workflow:
//   today → pending payments → all → customers → products → stats → search
// Main menu shows LIVE count badges so the admin sees actionable items at a glance.
import { InlineKeyboard } from "grammy";
import {
  toPersianDigits,
  ALL_STATUSES,
  STATUS_EMOJI,
  STATUS_LABELS,
  FORWARD_STATUSES,
  nextStatus,
} from "./format.js";

// ── Main menu ────────────────────────────────────────────────────────
// The two most actionable items (today's orders, pending payment verifications)
// show live count badges so the admin instantly knows what needs attention.
export const mainMenuKb = (todayCount = 0, verifyCount = 0) => {
  const todayBadge = todayCount > 0 ? ` (${toPersianDigits(todayCount)})` : "";
  const verifyBadge = verifyCount > 0 ? ` (${toPersianDigits(verifyCount)})` : "";
  return new InlineKeyboard()
    .text(`📦 سفارش‌های امروز${todayBadge}`, "today:0").row()
    .text(`💳 در انتظار تأیید پرداخت${verifyBadge}`, "verify:0").row()
    .text("📋 همه سفارش‌ها", "all:0").row()
    .text("📊 آمار و گزارش‌ها", "stats").row()
    .text("👥 مشتریان", "cust:0").row()
    .text("🍯 محصولات", "p:0").row()
    .text("🔍 جستجو", "search");
};

// Back-to-main button
export const backKb = () => new InlineKeyboard().text("🔙 منوی اصلی", "back");

// ── Status filter keyboard ───────────────────────────────────────────
export const statusFilterKb = () => {
  const kb = new InlineKeyboard();
  for (const s of ALL_STATUSES) {
    kb.text(`${STATUS_EMOJI[s]} ${STATUS_LABELS[s]}`, `st:${s}:0`).row();
  }
  kb.text("🔙 منوی اصلی", "back");
  return kb;
};

// ── Pagination row ───────────────────────────────────────────────────
// The page indicator (e.g. "۱ / ۳") doubles as a refresh button —
// clicking it re-fetches the current page. No extra button needed.
export const addPagination = (
  kb: InlineKeyboard,
  prefix: string,
  page: number,
  totalPages: number
): void => {
  if (totalPages <= 1) return;
  if (page > 0) kb.text("◀️ قبلی", `${prefix}:${page - 1}`);
  // Page indicator = refresh (callback data re-runs the list handler for this page)
  kb.text(`🔄 ${toPersianDigits(page + 1)} / ${toPersianDigits(totalPages)}`, `${prefix}:${page}`);
  if (page < totalPages - 1) kb.text("بعدی ▶️", `${prefix}:${page + 1}`);
  kb.row();
};

// ── Order list keyboard ──────────────────────────────────────────────
// Each order is a row button; below: pagination + back.
export const orderListKb = (
  orders: { orderNumber: string; customerName: string; finalAmount: number }[],
  listPrefix: string,
  page: number,
  totalPages: number
) => {
  const kb = new InlineKeyboard();
  for (const o of orders) {
    kb.text(
      `${o.orderNumber} | ${o.customerName}`,
      `o:${o.orderNumber}`
    ).row();
  }
  addPagination(kb, listPrefix, page, totalPages);
  kb.text("🔙 منوی اصلی", "back");
  return kb;
};

// ── Order detail action buttons ──────────────────────────────────────
// Context-aware: the primary action is always the NEXT logical status.
// Quick-nav to the payment-verification queue is always available
// (the admin's most frequent loop: confirm one → go to next).
// Destructive actions (cancel) are separated with a confirmation step.
// For shipped/delivered orders, an "edit tracking code" button is shown
// so the admin can fix a typo or add a code that was previously skipped.
export const orderActionsKb = (
  orderNumber: string,
  currentStatus: string,
  hasTrackingCode: boolean = false
) => {
  const kb = new InlineKeyboard();
  const nxt = nextStatus(currentStatus);

  // Primary action: advance to next status
  if (nxt) {
    kb.text(nextActionLabel(nxt), `oss:${orderNumber}:${nxt}`).row();
  }

  // Secondary: full status menu (for corrections / jumps)
  kb.text("🔄 تغییر وضعیت (همه)", `os:${orderNumber}`).row();

  // Edit tracking code — only for shipped/delivered orders
  if (currentStatus === "shipped" || currentStatus === "delivered") {
    kb.text(
      hasTrackingCode ? "📝 ویرایش کد رهگیری" : "📮 افزودن کد رهگیری",
      `oetrack:${orderNumber}`
    ).row();
  }

  // Cancel (destructive) — only if not already terminal
  if (currentStatus !== "cancelled" && currentStatus !== "delivered") {
    kb.text("❌ لغو سفارش", `ocancel:${orderNumber}`).row();
  }

  // Quick-nav to payment verification queue (admin's most common loop)
  kb.text("💳 در انتظار تأیید پرداخت", "verify:0").row();

  // Navigation
  kb.text("🔙 منوی اصلی", "back");
  return kb;
};

/** Human label for the "advance to next status" primary action button. */
function nextActionLabel(nextStatus: string): string {
  switch (nextStatus) {
    case "paid": return "💳 مشتری پرداخت کرد";
    case "confirmed": return "✅ تأیید پرداخت";
    case "preparing": return "📦 شروع آماده‌سازی";
    case "shipped": return "📮 تحویل به پست";
    case "delivered": return "🏁 تحویل داده شد";
    default: return `➡️ ${STATUS_LABELS[nextStatus] || nextStatus}`;
  }
}

// ── Status change keyboard ───────────────────────────────────────────
// Shows ALL statuses so the admin can correct mistakes or jump statuses.
// Forward statuses first, then cancel last.
export const orderStatusKb = (orderNumber: string) => {
  const kb = new InlineKeyboard();
  for (const s of FORWARD_STATUSES) {
    kb.text(`${STATUS_EMOJI[s]} ${STATUS_LABELS[s]}`, `oss:${orderNumber}:${s}`).row();
  }
  kb.text(`${STATUS_EMOJI.cancelled} ${STATUS_LABELS.cancelled}`, `oss:${orderNumber}:cancelled`).row();
  kb.text("🔙 بازگشت به سفارش", `o:${orderNumber}`);
  return kb;
};

// ── Cancel confirmation keyboard ─────────────────────────────────────
export const cancelConfirmKb = (orderNumber: string) =>
  new InlineKeyboard()
    .text("❌ بله، لغو شود", `oss:${orderNumber}:cancelled`).row()
    .text("🔙 بازگشت به سفارش", `o:${orderNumber}`);

// ── Customer list keyboard ───────────────────────────────────────────
export const customerListKb = (
  customers: { phone: string; name: string; count: number }[],
  page: number,
  totalPages: number
) => {
  const kb = new InlineKeyboard();
  for (const c of customers) {
    kb.text(`${c.name} (${toPersianDigits(c.count)} سفارش)`, `c:${c.phone}`).row();
  }
  addPagination(kb, "cust", page, totalPages);
  kb.text("🔍 جستجوی مشتری", "search").row();
  kb.text("🔙 منوی اصلی", "back");
  return kb;
};

// ── Customer detail actions ──────────────────────────────────────────
// The phone number is shown in the message body inside <code> tags so the
// admin can tap-to-copy it. Telegram inline keyboards don't support tel:
// URLs, so there's no direct "call" button — copy + dial is the flow.
export const customerActionsKb = (phone: string) =>
  new InlineKeyboard()
    .text("📋 سفارش‌های این مشتری", `corders:${phone}`).row()
    .text("👥 لیست مشتریان", "cust:0").row()
    .text("🔍 جستجوی سفارش", "search").row()
    .text("🔙 منوی اصلی", "back");

// ── Product list keyboard ────────────────────────────────────────────
export const productListKb = (
  products: { slug: string; name: string; pricePerKg: number }[],
  page: number,
  totalPages: number
) => {
  const kb = new InlineKeyboard();
  for (const p of products) {
    kb.text(`${p.name}`, `pd:${p.slug}`).row();
  }
  addPagination(kb, "p", page, totalPages);
  kb.text("🔙 منوی اصلی", "back");
  return kb;
};

// ── Product detail actions ───────────────────────────────────────────
export const productActionsKb = (slug: string, featured: boolean = false) =>
  new InlineKeyboard()
    .text("✏️ ویرایش قیمت", `pe:${slug}`).row()
    .text(featured ? "⭐ حذف از ویژه‌ها" : "⭐ افزودن به ویژه‌ها", `pf:${slug}`).row()
    .text("📝 ویرایش توضیحات", `pdesc:${slug}`).row()
    .text("🔙 بازگشت به محصولات", `p:0`).row()
    .text("🔙 منوی اصلی", "back");

// ── Notification action buttons ──────────────────────────────────────
// For new-order alerts: the customer hasn't paid yet, so the admin can
// only view the order details.
export const notifyNewOrderKb = (orderNumber: string) =>
  new InlineKeyboard()
    .text("👁️ مشاهده سفارش", `o:${orderNumber}`).row()
    .text("🔙 منوی اصلی", "back");

// For payment-confirmed alerts: the admin can verify the payment in one tap.
// "✅ تأیید پرداخت" advances the order from "paid" → "confirmed".
export const notifyPaymentKb = (orderNumber: string) =>
  new InlineKeyboard()
    .text("✅ تأیید پرداخت", `oss:${orderNumber}:confirmed`).row()
    .text("👁️ مشاهده سفارش", `o:${orderNumber}`).row()
    .text("🔙 منوی اصلی", "back");

// ── Edit price confirmation keyboard ─────────────────────────────────
export const editPriceCancelKb = (slug: string) =>
  new InlineKeyboard()
    .text("❌ لغو", `pd:${slug}`);

// ── Tracking code entry keyboard ─────────────────────────────────────
// Shown when the admin advances an order to "shipped" (تحویل به پست).
// Provides a way to skip the tracking code if needed (e.g., hand delivery).
export const trackingEntryKb = (orderNumber: string) =>
  new InlineKeyboard()
    .text("⏭️ بدون کد رهگیری", `ossk:${orderNumber}`).row()
    .text("❌ لغو", `o:${orderNumber}`);
