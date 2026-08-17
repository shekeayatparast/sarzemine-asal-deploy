// Helper functions for سرزمین عسل

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

// Convert english digits to Persian
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

// Format number with thousands separator (Persian style)
export function formatNumber(n: number): string {
  return toPersianDigits(n.toLocaleString("en-US"));
}

// Format as Toman currency
export function formatToman(n: number): string {
  return `${formatNumber(n)} تومان`;
}

// Format as Rial currency
export function formatRial(n: number): string {
  return `${formatNumber(n * 10)} ریال`;
}

// Generate a unique extra amount between 1 and UNIQUE_AMOUNT_MAX (999)
// for tracking each order in bank statement
export function generateUniqueAmount(): number {
  return Math.floor(Math.random() * 999) + 1;
}

// Generate a human-readable order number like HN-10245
export function generateOrderNumber(): string {
  const num = Math.floor(10000 + Math.random() * 89999);
  return `HN-${num}`;
}

// Calculate price for a container of honey
export function containerPrice(pricePerKg: number, sizeKg: number): number {
  return Math.round(pricePerKg * sizeKg);
}

// Order status labels (Persian)
export const ORDER_STATUS_LABELS: Record<string, string> = {
  awaiting_payment: "در انتظار پرداخت",
  paid: "پرداخت ثبت شد",
  confirmed: "تأیید مدیریت",
  preparing: "در حال آماده‌سازی",
  shipped: "تحویل به پست",
  delivered: "تحویل داده شد",
  cancelled: "لغو شد",
};

// Order status → step index (for progress display)
export const ORDER_STATUS_STEPS = [
  "awaiting_payment",
  "paid",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
] as const;

export function statusStepIndex(status: string): number {
  const idx = ORDER_STATUS_STEPS.indexOf(status as any);
  return idx >= 0 ? idx : -1; // -1 = cancelled or unknown
}

// ── Date / time (Iran timezone + Jalali calendar) ────────────────────
// The site may be viewed from any timezone, but ALL dates must be shown
// in Iran Standard Time (Asia/Tehran, UTC+03:30, no DST since 2022)
// using the Persian (Jalali / Shamsi) calendar — never the viewer's
// local time, never the Gregorian calendar.
export const IRAN_TZ = "Asia/Tehran";

/** Format a Date as a Persian (Jalali) date-time string in Iran time. */
export function formatJalaliDateTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      timeZone: IRAN_TZ,
      calendar: "persian",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return date.toLocaleString("fa-IR", { timeZone: IRAN_TZ });
  }
}

/** Format a Date as a Persian (Jalali) date only (no time) in Iran time. */
export function formatJalaliDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      timeZone: IRAN_TZ,
      calendar: "persian",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  } catch {
    return date.toLocaleDateString("fa-IR", { timeZone: IRAN_TZ });
  }
}

/** Format a Date as Persian time-only (HH:MM:SS) in Iran time. */
export function formatJalaliTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      timeZone: IRAN_TZ,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return date.toLocaleTimeString("fa-IR", { timeZone: IRAN_TZ });
  }
}

/** Returns the current Jalali (Shamsi) year as a Persian-digit string, e.g. "۱۴۰۳". */
export function currentJalaliYear(): string {
  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: IRAN_TZ,
    calendar: "persian",
    year: "numeric",
  }).format(new Date());
}
