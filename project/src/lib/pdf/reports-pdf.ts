// PDF report generator for سرزمین عسل admin reports.
// ──────────────────────────────────────────────────────────────────────
// Uses pdf-lib + @pdf-lib/fontkit with an embedded Vazirmatn TTF so that
// Persian text shapes correctly (manual Arabic shaping into presentation
// forms is handled by ./persian-shaping). Generates a professional,
// honey-themed sales report PDF.

import {
  PDFDocument,
  PDFFont,
  PDFPage,
  rgb,
  type RGB,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { promises as fs } from "fs";
import path from "path";
import { shapeAndReverse } from "./persian-shaping";
import {
  toPersianDigits,
  formatToman,
  formatJalaliDate,
  formatJalaliDateTime,
} from "@/lib/format";
import type { AdminStats } from "@/lib/stats";

// ── Colors (honey palette) ───────────────────────────────────────────
const C_HONEY: RGB = rgb(0.70, 0.42, 0.06);
const C_HONEY_DARK: RGB = rgb(0.50, 0.27, 0.04);
const C_HONEY_LIGHT: RGB = rgb(0.99, 0.92, 0.78);
const C_HONEY_BG: RGB = rgb(0.98, 0.95, 0.88);
const C_BG: RGB = rgb(1, 1, 1);
const C_TEXT: RGB = rgb(0.12, 0.08, 0.04);
const C_TEXT_MUTED: RGB = rgb(0.42, 0.36, 0.28);
const C_BORDER: RGB = rgb(0.85, 0.75, 0.55);
const C_TABLE_HEADER_BG: RGB = rgb(0.96, 0.88, 0.70);

// ── Layout constants (A4 portrait, points) ──────────────────────────
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 50;
const MARGIN_Y_TOP = 60;
const MARGIN_Y_BOTTOM = 60;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

// ── Font cache (per-doc) ─────────────────────────────────────────────
interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  medium: PDFFont;
}

async function loadFonts(doc: PDFDocument): Promise<Fonts> {
  const fontsDir = path.join(process.cwd(), "public", "fonts");
  const [regularBytes, boldBytes, mediumBytes] = await Promise.all([
    fs.readFile(path.join(fontsDir, "Vazirmatn-Regular.ttf")),
    fs.readFile(path.join(fontsDir, "Vazirmatn-Bold.ttf")),
    fs.readFile(path.join(fontsDir, "Vazirmatn-Medium.ttf")),
  ]);
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(regularBytes, { subset: true });
  const bold = await doc.embedFont(boldBytes, { subset: true });
  const medium = await doc.embedFont(mediumBytes, { subset: true });
  return { regular, bold, medium };
}

// ── Helpers ──────────────────────────────────────────────────────────
// Width of a Persian string after shaping (used for RTL right-alignment).
function textWidth(s: string, font: PDFFont, size: number): number {
  const shaped = shapeAndReverse(s);
  return font.widthOfTextAtSize(shaped, size);
}

interface DrawTextOpts {
  text: string;
  x: number; // left edge of the text block
  y: number; // baseline
  size: number;
  font: PDFFont;
  color?: RGB;
  maxWidth?: number; // soft wrap if set
  lineHeight?: number;
  align?: "left" | "right" | "center";
}

// Draw Persian text shaped for RTL. The x param is the LEFT edge of the
// text block; if align === "right", text is right-aligned to the
// (x + maxWidth) position. If align === "center", text is centered in
// [x, x + maxWidth]. The default "left" aligns the start of the shaped
// (LTR-rendered) string at x — which visually means the END of the
// Persian text is at x (since shaping reverses glyph order).
function drawText(page: PDFPage, opts: DrawTextOpts) {
  const {
    text,
    x,
    y,
    size,
    font,
    color = C_TEXT,
    maxWidth,
    align = "left",
  } = opts;
  const shaped = shapeAndReverse(text);
  const lineHeight = opts.lineHeight ?? size * 1.4;

  if (!maxWidth) {
    let drawX = x;
    if (align === "right") {
      drawX = x - font.widthOfTextAtSize(shaped, size);
    } else if (align === "center") {
      drawX = x - font.widthOfTextAtSize(shaped, size) / 2;
    }
    page.drawText(shaped, { x: drawX, y, size, font, color });
    return;
  }

  // Word-wrap (we split on spaces; each token's width is measured after
  // shaping the token alone — good enough for short labels).
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    const testShaped = shapeAndReverse(test);
    if (font.widthOfTextAtSize(testShaped, size) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  let curY = y;
  for (const ln of lines) {
    const lnShaped = shapeAndReverse(ln);
    let drawX = x;
    if (align === "right") {
      drawX = x + maxWidth - font.widthOfTextAtSize(lnShaped, size);
    } else if (align === "center") {
      drawX = x + (maxWidth - font.widthOfTextAtSize(lnShaped, size)) / 2;
    }
    page.drawText(lnShaped, {
      x: drawX,
      y: curY,
      size,
      font,
      color,
    });
    curY -= lineHeight;
  }
}

// Draw a horizontal rule.
function drawHr(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  color: RGB = C_BORDER,
  thickness = 1
) {
  page.drawLine({
    start: { x, y },
    end: { x: x + width, y },
    thickness,
    color,
  });
}

// Draw a filled rectangle.
function drawRect(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  color: RGB,
  borderColor?: RGB,
  borderThickness?: number
) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color,
    ...(borderColor
      ? { borderColor, borderWidth: borderThickness ?? 1 }
      : {}),
  });
}

// ── Main PDF generator ────────────────────────────────────────────────
export async function generateReportsPdf(
  stats: AdminStats
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle("گزارش فروش سرزمین عسل");
  doc.setAuthor("سرزمین عسل");
  doc.setCreator("سرزمین عسل");
  doc.setSubject("گزارش فروش و تحلیل");
  doc.setKeywords(["گزارش", "فروش", "سرزمین عسل"]);

  const fonts = await loadFonts(doc);

  // ── Page 1 ──
  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN_Y_TOP;
  const pages: PDFPage[] = [page];

  // ── Header: branding + title + date ──
  // Honey background bar at the top
  drawRect(page, 0, PAGE_H - 110, PAGE_W, 110, C_HONEY_BG);
  drawHr(
    page,
    0,
    PAGE_H - 110,
    PAGE_W,
    C_HONEY,
    2
  );

  // Branding line (top-right): "سرزمین عسل"
  drawText(page, {
    text: "سرزمین عسل",
    x: PAGE_W - MARGIN_X,
    y: PAGE_H - 40,
    size: 22,
    font: fonts.bold,
    color: C_HONEY_DARK,
    align: "right",
    maxWidth: CONTENT_W,
  });
  // Subtitle (top-right, below brand): "گزارش فروش و تحلیل‌ها"
  drawText(page, {
    text: "گزارش فروش و تحلیل‌ها",
    x: PAGE_W - MARGIN_X,
    y: PAGE_H - 62,
    size: 12,
    font: fonts.medium,
    color: C_HONEY,
    align: "right",
    maxWidth: CONTENT_W,
  });
  // Generation date (top-left): "تاریخ گزارش: ..."
  drawText(page, {
    text: "تاریخ گزارش: " + formatJalaliDate(new Date()),
    x: MARGIN_X,
    y: PAGE_H - 40,
    size: 11,
    font: fonts.regular,
    color: C_TEXT_MUTED,
  });
  // Generation datetime (smaller, below date)
  drawText(page, {
    text: formatJalaliDateTime(new Date()),
    x: MARGIN_X,
    y: PAGE_H - 56,
    size: 9,
    font: fonts.regular,
    color: C_TEXT_MUTED,
  });

  y = PAGE_H - 130;

  // ── Title block ──
  drawText(page, {
    text: "گزارش فروش " + stats.periodLabel,
    x: MARGIN_X,
    y,
    size: 18,
    font: fonts.bold,
    color: C_HONEY_DARK,
  });
  y -= 18;
  drawText(page, {
    text:
      `بازه گزارش: ${formatJalaliDate(stats.periodRangeStart)} تا ${formatJalaliDate(stats.periodRangeEnd)}`,
    x: MARGIN_X,
    y,
    size: 10,
    font: fonts.regular,
    color: C_TEXT_MUTED,
  });
  y -= 28;

  // ── Summary stat cards (2x2 grid) ──
  drawText(page, {
    text: "خلاصه وضعیت",
    x: MARGIN_X,
    y,
    size: 13,
    font: fonts.bold,
    color: C_HONEY_DARK,
  });
  y -= 10;
  drawHr(page, MARGIN_X, y, CONTENT_W, C_HONEY_LIGHT, 1);
  y -= 18;

  const cardW = (CONTENT_W - 16) / 2;
  const cardH = 60;
  const cards = [
    {
      label: "درآمد دوره",
      value: formatToman(stats.totalRevenue),
      hint: `${toPersianDigits(stats.periodOrders)} سفارش در دوره`,
    },
    {
      label: "کل سفارش‌ها (تاکنون)",
      value: toPersianDigits(stats.totalOrders) + " سفارش",
      hint:
        `نماینده: ${toPersianDigits(stats.agentOrders)} • ` +
        `مشتری: ${toPersianDigits(stats.customerOrders)}`,
    },
    {
      label: "نماینده‌های فعال",
      value:
        `${toPersianDigits(stats.activeAgents)} از ` +
        `${toPersianDigits(stats.totalAgents)} نفر`,
      hint:
        `در انتظار: ${toPersianDigits(stats.pendingAgents)} • ` +
        `مسدود: ${toPersianDigits(stats.blockedAgents)}`,
    },
    {
      label: "پورسانت پرداختی",
      value: formatToman(stats.totalCommissionPaid),
      hint: "مجموع پورسانت نماینده‌ها",
    },
  ];

  for (let i = 0; i < cards.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = MARGIN_X + col * (cardW + 16);
    const cy = y - row * (cardH + 12) - cardH;
    drawRect(page, cx, cy, cardW, cardH, C_HONEY_BG, C_BORDER, 0.8);
    // Right-aligned label
    drawText(page, {
      text: cards[i].label,
      x: cx + cardW - 12,
      y: cy + cardH - 18,
      size: 10,
      font: fonts.medium,
      color: C_TEXT_MUTED,
      align: "right",
      maxWidth: cardW - 24,
    });
    // Right-aligned value (large)
    drawText(page, {
      text: cards[i].value,
      x: cx + cardW - 12,
      y: cy + cardH - 38,
      size: 14,
      font: fonts.bold,
      color: C_HONEY_DARK,
      align: "right",
      maxWidth: cardW - 24,
    });
    // Right-aligned hint
    drawText(page, {
      text: cards[i].hint,
      x: cx + cardW - 12,
      y: cy + 8,
      size: 8,
      font: fonts.regular,
      color: C_TEXT_MUTED,
      align: "right",
      maxWidth: cardW - 24,
    });
  }
  y -= cardH * 2 + 12 + 12;

  // ── Section helper: ensures enough vertical space, paginates if not ──
  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN_Y_BOTTOM + 30) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      pages.push(page);
      y = PAGE_H - MARGIN_Y_TOP;
    }
  };

  // ── Top products table ──
  ensureSpace(220);
  drawText(page, {
    text: "پرفروش‌ترین محصولات (دوره انتخاب‌شده)",
    x: MARGIN_X,
    y,
    size: 13,
    font: fonts.bold,
    color: C_HONEY_DARK,
  });
  y -= 18;

  // Table header
  const prodCols = [
    { key: "rank", label: "رتبه", w: 40, align: "center" as const },
    { key: "name", label: "محصول", w: 230, align: "right" as const },
    { key: "qty", label: "تعداد", w: 90, align: "center" as const },
    { key: "revenue", label: "درآمد", w: 135, align: "center" as const },
  ];
  const prodTableW = prodCols.reduce((s, c) => s + c.w, 0);
  drawRect(
    page,
    MARGIN_X,
    y - 22,
    prodTableW,
    22,
    C_TABLE_HEADER_BG,
    C_BORDER,
    0.8
  );
  // Column headers — RTL: first column at right
  let cx = PAGE_W - MARGIN_X;
  for (const col of prodCols) {
    const colLeft = cx - col.w;
    drawText(page, {
      text: col.label,
      x: colLeft,
      y: y - 16,
      size: 9,
      font: fonts.bold,
      color: C_HONEY_DARK,
      align: col.align,
      maxWidth: col.w - 8,
    });
    cx -= col.w;
  }
  y -= 24;

  // Table rows
  if (stats.topProducts.length === 0) {
    drawText(page, {
      text: "در این دوره محصولی فروخته نشده است.",
      x: PAGE_W - MARGIN_X,
      y,
      size: 10,
      font: fonts.regular,
      color: C_TEXT_MUTED,
      align: "right",
      maxWidth: prodTableW,
    });
    y -= 20;
  } else {
    stats.topProducts.forEach((p, i) => {
      ensureSpace(28);
      // Alternating row background
      if (i % 2 === 1) {
        drawRect(page, MARGIN_X, y - 18, prodTableW, 18, C_HONEY_LIGHT);
      }
      drawHr(page, MARGIN_X, y - 18, prodTableW, C_BORDER, 0.4);
      const avgPrice = p.quantity > 0 ? Math.round(p.total / p.quantity) : 0;
      const cells = [
        { text: toPersianDigits(i + 1), col: prodCols[0] },
        { text: p.productName, col: prodCols[1] },
        { text: toPersianDigits(p.quantity) + " عدد", col: prodCols[2] },
        { text: formatToman(p.total), col: prodCols[3] },
      ];
      let cx2 = PAGE_W - MARGIN_X;
      for (const cell of cells) {
        const colLeft = cx2 - cell.col.w;
        drawText(page, {
          text: cell.text,
          x: colLeft,
          y: y - 13,
          size: 9,
          font: i === 0 ? fonts.bold : fonts.regular,
          color: i === 0 ? C_HONEY_DARK : C_TEXT,
          align: cell.col.align,
          maxWidth: cell.col.w - 8,
        });
        cx2 -= cell.col.w;
      }
      y -= 20;
      void avgPrice; // (kept for potential future use)
    });
  }
  y -= 18;

  // ── Top agents table ──
  ensureSpace(180);
  drawText(page, {
    text: "برترین نماینده‌ها (دوره انتخاب‌شده)",
    x: MARGIN_X,
    y,
    size: 13,
    font: fonts.bold,
    color: C_HONEY_DARK,
  });
  y -= 18;

  const agentCols = [
    { key: "rank", label: "رتبه", w: 40, align: "center" as const },
    { key: "store", label: "فروشگاه", w: 180, align: "right" as const },
    { key: "name", label: "نام نماینده", w: 145, align: "right" as const },
    { key: "orders", label: "سفارش", w: 60, align: "center" as const },
    { key: "sales", label: "فروش", w: 70, align: "center" as const },
  ];
  const agentTableW = agentCols.reduce((s, c) => s + c.w, 0);
  drawRect(
    page,
    MARGIN_X,
    y - 22,
    agentTableW,
    22,
    C_TABLE_HEADER_BG,
    C_BORDER,
    0.8
  );
  cx = PAGE_W - MARGIN_X;
  for (const col of agentCols) {
    const colLeft = cx - col.w;
    drawText(page, {
      text: col.label,
      x: colLeft,
      y: y - 16,
      size: 9,
      font: fonts.bold,
      color: C_HONEY_DARK,
      align: col.align,
      maxWidth: col.w - 8,
    });
    cx -= col.w;
  }
  y -= 24;

  if (stats.topAgents.length === 0) {
    drawText(page, {
      text: "هنوز نماینده‌ای ثبت‌نام نکرده است.",
      x: PAGE_W - MARGIN_X,
      y,
      size: 10,
      font: fonts.regular,
      color: C_TEXT_MUTED,
      align: "right",
      maxWidth: agentTableW,
    });
    y -= 20;
  } else {
    stats.topAgents.forEach((a, i) => {
      ensureSpace(28);
      if (i % 2 === 1) {
        drawRect(page, MARGIN_X, y - 18, agentTableW, 18, C_HONEY_LIGHT);
      }
      drawHr(page, MARGIN_X, y - 18, agentTableW, C_BORDER, 0.4);
      const cells = [
        { text: toPersianDigits(i + 1), col: agentCols[0] },
        { text: a.storeName || "—", col: agentCols[1] },
        { text: a.name, col: agentCols[2] },
        { text: toPersianDigits(a.totalOrders), col: agentCols[3] },
        {
          text: formatToman(a.totalSales),
          col: agentCols[4],
        },
      ];
      let cx2 = PAGE_W - MARGIN_X;
      for (const cell of cells) {
        const colLeft = cx2 - cell.col.w;
        drawText(page, {
          text: cell.text,
          x: colLeft,
          y: y - 13,
          size: 9,
          font: i === 0 ? fonts.bold : fonts.regular,
          color: i === 0 ? C_HONEY_DARK : C_TEXT,
          align: cell.col.align,
          maxWidth: cell.col.w - 8,
        });
        cx2 -= cell.col.w;
      }
      y -= 20;
    });
  }
  y -= 16;

  // ── Order status distribution (compact summary) ──
  ensureSpace(140);
  drawText(page, {
    text: "توزیع وضعیت سفارش‌ها (دوره انتخاب‌شده)",
    x: MARGIN_X,
    y,
    size: 13,
    font: fonts.bold,
    color: C_HONEY_DARK,
  });
  y -= 18;

  if (stats.orderStatusDistribution.length === 0) {
    drawText(page, {
      text: "در این دوره سفارشی ثبت نشده است.",
      x: MARGIN_X,
      y,
      size: 10,
      font: fonts.regular,
      color: C_TEXT_MUTED,
    });
    y -= 16;
  } else {
    // Render as two-column "status — count" rows inside a single card.
    const statusBoxH =
      Math.ceil(stats.orderStatusDistribution.length / 2) * 18 + 18;
    drawRect(page, MARGIN_X, y - statusBoxH, CONTENT_W, statusBoxH, C_BG, C_BORDER, 0.8);
    const cellW = CONTENT_W / 2;
    stats.orderStatusDistribution.forEach((s, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cellX = MARGIN_X + col * cellW;
      const cellY = y - 18 - row * 18;
      drawText(page, {
        text: s.status + ":",
        x: cellX + 8,
        y: cellY,
        size: 10,
        font: fonts.regular,
        color: C_TEXT,
      });
      drawText(page, {
        text: toPersianDigits(s.count) + " سفارش",
        x: cellX + cellW - 8,
        y: cellY,
        size: 10,
        font: fonts.bold,
        color: C_HONEY_DARK,
        align: "right",
        maxWidth: cellW - 16,
      });
    });
    y -= statusBoxH + 14;
  }

  // ── Footer with page numbers ──
  const totalPages = pages.length;
  pages.forEach((p, i) => {
    // Bottom rule
    drawHr(p, MARGIN_X, MARGIN_Y_BOTTOM - 8, CONTENT_W, C_BORDER, 0.5);
    // Right: "صفحه X از Y"
    drawText(p, {
      text:
        "صفحه " + toPersianDigits(i + 1) + " از " + toPersianDigits(totalPages),
      x: PAGE_W - MARGIN_X,
      y: MARGIN_Y_BOTTOM - 22,
      size: 9,
      font: fonts.regular,
      color: C_TEXT_MUTED,
      align: "right",
      maxWidth: CONTENT_W,
    });
    // Left: "سرزمین عسل | گزارش فروش"
    drawText(p, {
      text: "سرزمین عسل | گزارش فروش",
      x: MARGIN_X,
      y: MARGIN_Y_BOTTOM - 22,
      size: 9,
      font: fonts.regular,
      color: C_TEXT_MUTED,
    });
  });

  return await doc.save({ useObjectStreams: false });
}
