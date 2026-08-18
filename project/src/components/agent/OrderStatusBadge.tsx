"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<
  string,
  { label: string; className: string }
> = {
  awaiting_payment: {
    label: "در انتظار پرداخت",
    className:
      "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700",
  },
  paid: {
    label: "پرداخت ثبت شد",
    className:
      "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700",
  },
  confirmed: {
    label: "تأیید مدیریت",
    className:
      "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700",
  },
  preparing: {
    label: "در حال آماده‌سازی",
    className:
      "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-700",
  },
  shipped: {
    label: "تحویل به پست",
    className:
      "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/30 dark:text-sky-200 dark:border-sky-700",
  },
  delivered: {
    label: "تحویل داده شد",
    className:
      "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700",
  },
  cancelled: {
    label: "لغو شد",
    className:
      "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700",
  },
};

export function OrderStatusBadge({ status }: { status: string }) {
  const meta = STATUS_STYLES[status] || {
    label: status,
    className: "",
  };
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium px-2.5 py-0.5 rounded-full",
        meta.className
      )}
    >
      {meta.label}
    </Badge>
  );
}

export function PaymentStatusBadge({
  status,
}: {
  status: string;
}) {
  const isPaid = status === "confirmed";
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium px-2.5 py-0.5 rounded-full",
        isPaid
          ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700"
          : "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700"
      )}
    >
      {isPaid ? "تأیید شده" : "در انتظار"}
    </Badge>
  );
}

export function orderStatusLabel(status: string): string {
  return STATUS_STYLES[status]?.label ?? status;
}
