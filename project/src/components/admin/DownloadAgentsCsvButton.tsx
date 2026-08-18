"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { toPersianDigits } from "@/lib/format";

interface AgentRow {
  id: string;
  name: string;
  phone: string;
  storeName: string;
  province: string;
  city: string;
  address: string;
  nationalId: string | null;
  status: string;
  commissionRate: number;
  balance: number;
  totalSales: number;
  totalOrders: number;
  rejectionReason: string | null;
  approvedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

function statusFa(status: string): string {
  const map: Record<string, string> = {
    pending: "در انتظار تأیید",
    active: "فعال",
    blocked: "مسدود",
    rejected: "رد شده",
  };
  return map[status] || status;
}

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatCsvDate(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("fa-IR", { timeZone: "Asia/Tehran" });
  } catch {
    return iso;
  }
}

export function DownloadAgentsCsvButton() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const download = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/agents?limit=500");
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "دریافت فهرست نماینده‌ها ناموفق بود");
        return;
      }
      const agents: AgentRow[] = data.agents || [];
      if (agents.length === 0) {
        toast.error("نماینده‌ای برای صادرات وجود ندارد");
        return;
      }

      const headers = [
        "نام",
        "فروشگاه",
        "تلفن",
        "استان",
        "شهر",
        "آدرس",
        "کد ملی",
        "وضعیت",
        "نرخ پورسانت",
        "موجودی",
        "فروش کل",
        "تعداد سفارش",
        "دلیل رد",
        "تاریخ تأیید",
        "آخرین ورود",
        "تاریخ ثبت",
      ];

      const rows = agents.map((a) =>
        [
          a.name,
          a.storeName,
          a.phone,
          a.province,
          a.city,
          a.address,
          a.nationalId || "",
          statusFa(a.status),
          a.commissionRate,
          a.balance,
          a.totalSales,
          a.totalOrders,
          a.rejectionReason || "",
          formatCsvDate(a.approvedAt),
          formatCsvDate(a.lastLoginAt),
          formatCsvDate(a.createdAt),
        ]
          .map(csvEscape)
          .join(",")
      );

      // BOM at start ensures Excel reads UTF-8 correctly
      const csv = "\uFEFF" + headers.map(csvEscape).join(",") + "\n" + rows.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const today = new Date().toISOString().slice(0, 10);
      link.download = `sarzemine-asal-agents-${today}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDone(true);
      toast.success("فایل CSV با موفقیت دانلود شد", {
        description: `${toPersianDigits(agents.length)} نماینده صادر شد`,
      });
      setTimeout(() => setDone(false), 2500);
    } catch (err) {
      console.error("[csv download] error:", err);
      toast.error("خطای شبکه. لطفاً دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={download} disabled={busy} variant="outline" size="sm">
      {busy ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : done ? (
        <Check className="w-4 h-4 text-emerald-600" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      {busy ? "در حال آماده‌سازی..." : done ? "دانلود شد!" : "خروجی CSV"}
    </Button>
  );
}
