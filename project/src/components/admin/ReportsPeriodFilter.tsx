"use client";

// Period filter (weekly / monthly / yearly) for the admin reports page.
// ──────────────────────────────────────────────────────────────────
// Updates the URL `?period=` query param; the server component reads it
// and recomputes stats. Uses next/navigation's `useRouter().replace`
// to avoid a full page reload.

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CalendarClock } from "lucide-react";
import type { ReportPeriod } from "@/lib/stats";

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: "weekly", label: "هفتگی" },
  { value: "monthly", label: "ماهیانه" },
  { value: "yearly", label: "سالیانه" },
];

export function ReportsPeriodFilter() {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [hovering, setHovering] = useState<ReportPeriod | null>(null);

  const current: ReportPeriod =
    sp?.get("period") === "weekly" ||
    sp?.get("period") === "monthly" ||
    sp?.get("period") === "yearly"
      ? (sp.get("period") as ReportPeriod)
      : "monthly";

  const setPeriod = (p: ReportPeriod) => {
    if (p === current) return;
    const params = new URLSearchParams(sp?.toString() || "");
    if (p === "monthly") {
      params.delete("period"); // default — keep URL clean
    } else {
      params.set("period", p);
    }
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/admin/reports?${qs}` : "/admin/reports", {
        scroll: false,
      });
    });
  };

  return (
    <div
      className="inline-flex items-center gap-1 p-1 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20"
      role="group"
      aria-label="فیلتر بازه گزارش"
      dir="rtl"
    >
      <CalendarClock className="w-4 h-4 text-honey-dark mx-1.5 shrink-0" />
      {PERIODS.map((p) => {
        const active = p.value === current;
        const isHover = hovering === p.value;
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => setPeriod(p.value)}
            onMouseEnter={() => setHovering(p.value)}
            onMouseLeave={() => setHovering(null)}
            disabled={pending}
            aria-pressed={active}
            className={[
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              active
                ? "bg-honey-gradient text-primary-foreground shadow-sm"
                : isHover
                ? "bg-amber-100 dark:bg-amber-900/40 text-honey-dark"
                : "text-muted-foreground hover:text-honey-dark",
            ].join(" ")}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
