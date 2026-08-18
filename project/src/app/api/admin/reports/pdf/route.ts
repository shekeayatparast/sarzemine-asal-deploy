// GET /api/admin/reports/pdf
// ──────────────────────────────────────────────────────────────────────
// Generate a professional Persian PDF sales report for the admin panel.
// Accepts a `?period=weekly|monthly|yearly` query param (default monthly).
// Returns a `application/pdf` response. Auth required (admin session).

import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { computeAdminStats, type ReportPeriod } from "@/lib/stats";
import { generateReportsPdf } from "@/lib/pdf/reports-pdf";

export const dynamic = "force-dynamic";
// PDF generation can take a second or two with subsetting — give it room.
export const maxDuration = 30;

function parsePeriod(s: string | null): ReportPeriod {
  if (s === "weekly" || s === "monthly" || s === "yearly") return s;
  return "monthly";
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentAdmin();
    if (!user) {
      return NextResponse.json(
        { error: "برای دسترسی باید وارد شوید" },
        { status: 401 }
      );
    }
    const period = parsePeriod(req.nextUrl.searchParams.get("period"));
    const stats = await computeAdminStats({ period });
    const pdfBytes = await generateReportsPdf(stats);
    // Build a Jalali date stamp for the filename
    const now = new Date();
    const datePart = formatStamp(now);
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="sarzemine-asal-report-${datePart}.pdf"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    console.error("[admin/reports/pdf] error:", err);
    return NextResponse.json(
      { error: "خطای سرور در ساخت گزارش PDF" },
      { status: 500 }
    );
  }
}

// Quick YYYYMMDD stamp for the filename (Gregorian, ASCII-safe).
function formatStamp(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}
