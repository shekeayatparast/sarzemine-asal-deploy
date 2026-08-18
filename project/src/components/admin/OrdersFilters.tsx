"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShoppingCart, Store, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toPersianDigits } from "@/lib/format";

type TypeFilter = "all" | "customer" | "agent";

const TYPE_TABS: { key: TypeFilter; label: string; icon: typeof ShoppingCart }[] = [
  { key: "all", label: "همه", icon: ShoppingCart },
  { key: "customer", label: "مشتری", icon: ShoppingCart },
  { key: "agent", label: "نماینده", icon: Store },
];

const ORDER_STATUSES = [
  { value: "awaiting_payment", label: "در انتظار پرداخت" },
  { value: "paid", label: "پرداخت ثبت شد" },
  { value: "confirmed", label: "تأیید مدیریت" },
  { value: "preparing", label: "در حال آماده‌سازی" },
  { value: "shipped", label: "تحویل به پست" },
  { value: "delivered", label: "تحویل داده شد" },
  { value: "cancelled", label: "لغو شد" },
];

const PAYMENT_STATUSES = [
  { value: "pending", label: "در انتظار" },
  { value: "confirmed", label: "تأیید شده" },
];

export function OrdersFilters({
  counts,
}: {
  counts: Record<TypeFilter, number>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currentType = (searchParams.get("orderType") || "all") as TypeFilter;
  const currentOrderStatus = searchParams.get("orderStatus") || "all";
  const currentPaymentStatus = searchParams.get("paymentStatus") || "all";

  const updateParams = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "all" || v === "") params.delete(k);
      else params.set(k, v);
    }
    startTransition(() => {
      router.push(`/admin/orders?${params.toString()}`);
    });
  };

  const hasActiveFilter =
    currentType !== "all" ||
    currentOrderStatus !== "all" ||
    currentPaymentStatus !== "all";

  return (
    <div className="space-y-4">
      {/* Type tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {TYPE_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = currentType === tab.key;
          const count = counts[tab.key] || 0;
          return (
            <Button
              key={tab.key}
              variant={active ? "default" : "outline"}
              size="sm"
              onClick={() => updateParams({ orderType: tab.key })}
              className={cn(
                "gap-1.5",
                active
                  ? "bg-honey-gradient text-primary-foreground hover:opacity-90"
                  : "hover:bg-accent"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                  active
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {toPersianDigits(count)}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Status dropdowns */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="w-3.5 h-3.5" />
          فیلتر پیشرفته:
        </div>

        <Select
          value={currentOrderStatus}
          onValueChange={(v) => updateParams({ orderStatus: v })}
        >
          <SelectTrigger className="w-48 h-9 text-sm" dir="rtl">
            <SelectValue placeholder="وضعیت سفارش" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه وضعیت‌ها</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentPaymentStatus}
          onValueChange={(v) => updateParams({ paymentStatus: v })}
        >
          <SelectTrigger className="w-40 h-9 text-sm" dir="rtl">
            <SelectValue placeholder="وضعیت پرداخت" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه</SelectItem>
            {PAYMENT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateParams({ orderType: null, orderStatus: null, paymentStatus: null })}
            className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
          >
            <X className="w-4 h-4" />
            پاک کردن فیلترها
          </Button>
        )}
      </div>
    </div>
  );
}
