"use client";

// "Download PDF" button for the admin reports page.
// ──────────────────────────────────────────────────────────────────
// Calls /api/admin/reports/pdf?period=<period> and saves the blob as
// `sarzemine-asal-report-<date>.pdf`. The period comes from the URL
// query param so it matches whatever the user has selected on the page.

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { toPersianDigits } from "@/lib/format";
import type { ReportPeriod } from "@/lib/stats";

function getPeriod(sp: URLSearchParams | null): ReportPeriod {
  const v = sp?.get("period");
  if (v === "weekly" || v === "monthly" || v === "yearly") return v;
  return "monthly";
}

export function DownloadReportsPdfButton() {
  const sp = useSearchParams();
  const period = getPeriod(sp);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const download = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const url = `/api/admin/reports/pdf?period=${period}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        let msg = "خطا در دریافت PDF";
        try {
          const j = await res.json();
          msg = j?.error || msg;
        } catch {
          // ignore parse error
        }
        toast.error(msg);
        return;
      }
      const blob = await res.blob();
      if (!blob || blob.size === 0) {
        toast.error("گزارش خالی است");
        return;
      }
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      const today = new Date().toISOString().slice(0, 10);
      link.download = `sarzemine-asal-report-${today}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5_000);

      const kb = Math.max(1, Math.round(blob.size / 1024));
      setDone(true);
      toast.success("گزارش PDF با موفقیت دانلود شد", {
        description: `حجم: ${toPersianDigits(kb)} کیلوبایت`,
      });
      setTimeout(() => setDone(false), 2500);
    } catch (err) {
      console.error("[pdf download] error:", err);
      toast.error("خطای شبکه. لطفاً دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      onClick={download}
      disabled={busy}
      variant="default"
      size="sm"
      className="bg-honey-gradient text-primary-foreground hover:opacity-90"
    >
      {busy ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : done ? (
        <Check className="w-4 h-4" />
      ) : (
        <FileDown className="w-4 h-4" />
      )}
      {busy
        ? "در حال ساخت PDF..."
        : done
        ? "دانلود شد!"
        : "خروجی PDF"}
    </Button>
  );
}
