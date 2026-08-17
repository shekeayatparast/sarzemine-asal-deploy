// Server-side helper to notify the Telegram bot service of new orders and
// payment confirmations. The bot service runs on its own port (3003) and
// forwards rich notifications to the admin's Telegram.

const BOT_SERVICE_URL =
  process.env.BOT_SERVICE_URL || "http://localhost:3003";

/**
 * Notify the Telegram bot that a new order was just placed.
 * Fire-and-forget: never blocks or fails the order creation.
 */
export function notifyBotNewOrder(orderNumber: string) {
  fetch(`${BOT_SERVICE_URL}/notify/new-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderNumber }),
  }).catch((e) => {
    console.error("[notify-bot] new-order notification failed:", e);
  });
}

/**
 * Notify the Telegram bot that a customer confirmed their card-to-card payment.
 * Fire-and-forget: never blocks or fails the confirmation.
 */
export function notifyBotPaymentConfirmed(orderNumber: string) {
  fetch(`${BOT_SERVICE_URL}/notify/payment-confirmed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderNumber }),
  }).catch((e) => {
    console.error("[notify-bot] payment-confirmed notification failed:", e);
  });
}
