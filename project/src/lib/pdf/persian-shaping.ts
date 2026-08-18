// Persian/Arabic text shaping for pdf-lib
// ──────────────────────────────────────────────────────────────────────
// pdf-lib does not perform OpenType shaping, so Persian/Arabic letters
// would render as disconnected glyphs (isolated forms only) and the
// LTR layout would also reverse the visual order of RTL text.
//
// To fix both issues, we:
//  1) Shape each Arabic/Persian letter into its contextual
//     presentation form (isolated / initial / medial / final) using
//     the Unicode Arabic Presentation Forms-A & B blocks.
//  2) Re-shuffle the string so that when pdf-lib lays it out
//     left-to-right, the visual result reads right-to-left.

// Per-letter presentation forms. Order: [isolated, final, initial, medial]
// Letters with only isolated+final use the first two slots and leave the
// last two as `null` to indicate "not available".
type FormTuple = [string, string, string | null, string | null];

// Non-joining letters — these connect to the PREVIOUS letter but NOT to
// the next letter, so they only have isolated and final forms.
const NON_JOINERS = new Set([
  "\u0621", // ء hamza
  "\u0622", // آ alef madda
  "\u0623", // أ alef hamza above
  "\u0625", // إ alef hamza below
  "\u0627", // ا alef
  "\u0629", // ة ta marbuta
  "\u062F", // د dal
  "\u0630", // ذ dhal
  "\u0631", // ر reh
  "\u0632", // ز zain
  "\u0648", // و waw
  "\u0671", // ٱ alef wasla
  "\u0672", // ٲ alef wavy hamza above
  "\u0673", // ٳ alef wavy hamza below
  "\u0675", // ٵ high hamza alef
  "\u0676", // ٶ high hamza waw
  "\u0677", // ٷ high hamza waw with damma
  "\u0688", // ڀ ddal (Persian)
  "\u0689",
  "\u068A",
  "\u068B",
  "\u068C",
  "\u068D",
  "\u068E",
  "\u068F",
  "\u0690",
  "\u0691",
  "\u0692",
  "\u0693",
  "\u0694",
  "\u0695",
  "\u0696",
  "\u0697",
  "\u0698", // ژ zheh (Persian)
  "\u0699",
  "\u06EE",
  "\u06EF",
  "\u06FF",
]);

// Lookup table: Persian/Arabic letter → 4 presentation forms.
// Source: Unicode charts for Arabic Presentation Forms-A (FB50–FDFF)
// and Forms-B (FE70–FEFF).
const FORMS: Record<string, FormTuple> = {
  // ── Forms-B (FE70–FEFF) — standard 4-form letters ──
  "\u0621": ["\uFE80", "\uFE80", null, null], // ء hamza (no joins)
  "\u0622": ["\uFE81", "\uFE82", null, null], // آ
  "\u0623": ["\uFE83", "\uFE84", null, null], // أ
  "\u0624": ["\uFE85", "\uFE86", null, null], // ؤ
  "\u0625": ["\uFE87", "\uFE88", null, null], // إ
  "\u0626": ["\uFE89", "\uFE8A", "\uFE8B", "\uFE8C"], // ئ
  "\u0627": ["\uFE8E", "\uFE8E", null, null], // ا alef
  "\u0628": ["\uFE8F", "\uFE90", "\uFE91", "\uFE92"], // ب
  "\u0629": ["\uFE93", "\uFE94", null, null], // ة
  "\u062A": ["\uFE95", "\uFE96", "\uFE97", "\uFE98"], // ت
  "\u062B": ["\uFE99", "\uFE9A", "\uFE9B", "\uFE9C"], // ث
  "\u062C": ["\uFE9D", "\uFE9E", "\uFE9F", "\uFEA0"], // ج
  "\u062D": ["\uFEA1", "\uFEA2", "\uFEA3", "\uFEA4"], // ح
  "\u062E": ["\uFEA5", "\uFEA6", "\uFEA7", "\uFEA8"], // خ
  "\u062F": ["\uFEA9", "\uFEAA", null, null], // د
  "\u0630": ["\uFEAB", "\uFEAC", null, null], // ذ
  "\u0631": ["\uFEAD", "\uFEAE", null, null], // ر
  "\u0632": ["\uFEAF", "\uFEB0", null, null], // ز
  "\u0633": ["\uFEB1", "\uFEB2", "\uFEB3", "\uFEB4"], // س
  "\u0634": ["\uFEB5", "\uFEB6", "\uFEB7", "\uFEB8"], // ش
  "\u0635": ["\uFEB9", "\uFEBA", "\uFEBB", "\uFEBC"], // ص
  "\u0636": ["\uFEBD", "\uFEBE", "\uFEBF", "\uFEC0"], // ض
  "\u0637": ["\uFEC1", "\uFEC2", "\uFEC3", "\uFEC4"], // ط
  "\u0638": ["\uFEC5", "\uFEC6", "\uFEC7", "\uFEC8"], // ظ
  "\u0639": ["\uFEC9", "\uFECA", "\uFECB", "\uFECC"], // ع
  "\u063A": ["\uFECD", "\uFECE", "\uFECF", "\uFED0"], // غ
  "\u0641": ["\uFED1", "\uFED2", "\uFED3", "\uFED4"], // ف
  "\u0642": ["\uFED5", "\uFED6", "\uFED7", "\uFED8"], // ق
  "\u0643": ["\uFED9", "\uFEDA", "\uFEDB", "\uFEDC"], // ک (Arabic kaf)
  "\u0644": ["\uFEDD", "\uFEDE", "\uFEDF", "\uFEE0"], // ل
  "\u0645": ["\uFEE1", "\uFEE2", "\uFEE3", "\uFEE4"], // م
  "\u0646": ["\uFEE5", "\uFEE6", "\uFEE7", "\uFEE8"], // ن
  "\u0647": ["\uFEE9", "\uFEEA", "\uFEEB", "\uFEEC"], // ه
  "\u0648": ["\uFEED", "\uFEEE", null, null], // و
  "\u0649": ["\uFEEF", "\uFEF0", "\uFEEF", "\uFEF0"], // ی (alef maksura, treat as joining for Persian ی)
  "\u064A": ["\uFEF1", "\uFEF2", "\uFEF3", "\uFEF4"], // ي (Arabic yeh)
  // ── Forms-A (FB50–FDFF) — Persian-specific letters ──
  "\u067E": ["\uFB56", "\uFB57", "\uFB58", "\uFB59"], // پ
  "\u0686": ["\uFB7A", "\uFB7B", "\uFB7C", "\uFB7D"], // چ
  "\u0698": ["\uFB8A", "\uFB8B", null, null], // ژ
  "\u06A9": ["\uFB8E", "\uFB8F", "\uFB90", "\uFB91"], // ک (Persian keheh)
  "\u06AF": ["\uFB92", "\uFB93", "\uFB94", "\uFB95"], // گ
  "\u06CC": ["\uFBFC", "\uFBFD", "\uFBFE", "\uFBFF"], // ی (Persian yeh)
  // diacritics are passed through unchanged
};

// Characters that are "joiners" in a logical sense (act as Arabic letters
// for the purpose of determining context).
function isArabicLetter(ch: string): boolean {
  // Arabic block (0x0600–0x06FF), excluding diacritics & non-letters
  if (!ch) return false;
  const code = ch.codePointAt(0);
  if (code === undefined) return false;
  if (code < 0x0620 || code > 0x06ff) return false;
  // Skip tashkeel (harakat) — U+064B–U+065F, U+0670, tatweel U+0640
  if (code >= 0x064b && code <= 0x065f) return false;
  if (code === 0x0640) return false; // tatweel ─ ignored
  if (code === 0x0670) return false; // superscript alef
  return true;
}

// Shape a single Arabic/Persian word into presentation-form glyphs.
function shapeWord(word: string): string {
  const chars = Array.from(word).filter((c) => c !== "\u0640"); // strip tatweel
  if (chars.length === 0) return "";
  if (chars.length === 1) {
    const f = FORMS[chars[0]];
    return f ? f[0] : chars[0];
  }
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const forms = FORMS[ch];
    if (!forms) {
      out += ch; // pass-through (digits, punctuation, Latin, etc.)
      continue;
    }
    const prevIsLetter = i > 0 && isArabicLetter(chars[i - 1]);
    const nextIsLetter = i < chars.length - 1 && isArabicLetter(chars[i + 1]);
    // Does the previous letter connect to this one? The prev letter must
    // be a joining letter (not in NON_JOINERS).
    const prevConnects = prevIsLetter && !NON_JOINERS.has(chars[i - 1]);
    // Does this letter connect to the next? This letter must be a joining
    // letter (not in NON_JOINERS).
    const thisConnects = !NON_JOINERS.has(ch);
    const nextConnects = thisConnects && nextIsLetter;

    let form: string | null;
    if (!prevConnects && !nextConnects) {
      form = forms[0]; // isolated
    } else if (!prevConnects && nextConnects) {
      form = forms[2]; // initial
    } else if (prevConnects && nextConnects) {
      form = forms[3]; // medial
    } else {
      form = forms[1]; // final
    }
    if (form === null) {
      // Fallback: this letter doesn't have the requested form. Use isolated
      // if no previous connection, otherwise final.
      form = prevConnects ? forms[1] : forms[0];
    }
    out += form;
  }
  return out;
}

// Split text into "letter/whitespace" tokens (preserving whitespace).
// Letters & punctuation get shaped; whitespace & non-Arabic chars are
// passed through but identified so we can reverse properly.
function shapeText(text: string): string {
  if (!text) return "";
  const result: string[] = [];
  let buf = "";
  let inArabic = false;
  const flush = () => {
    if (buf) {
      result.push(shapeWord(buf));
      buf = "";
    }
  };
  for (const ch of Array.from(text)) {
    const isLetter = isArabicLetter(ch);
    if (isLetter === inArabic) {
      buf += ch;
    } else {
      flush();
      inArabic = isLetter;
      buf = ch;
    }
  }
  flush();
  return result.join("");
}

// Tokenize a string into bidi segments: "digit-run" vs "other".
// A "digit run" is a maximal sequence of digits possibly separated by
// `/`, `-`, `:`, `.`, `,`, `،` (Persian comma), spaces. This way
// things like "1403/01/01" or "1,200,000" stay LTR-ordered.
type Segment = { kind: "digit" | "other"; text: string };

const DIGIT_CHARS = new Set([
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
  "۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹",
  "٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩",
]);
const DIGIT_SEPARATORS = new Set(["/", "-", ":", ".", ",", "،", " "]);

function tokenize(text: string): Segment[] {
  const segs: Segment[] = [];
  let buf = "";
  let bufKind: "digit" | "other" | null = null;
  const flush = () => {
    if (buf && bufKind) {
      segs.push({ kind: bufKind, text: buf });
    }
    buf = "";
    bufKind = null;
  };
  for (const ch of Array.from(text)) {
    let kind: "digit" | "other";
    if (DIGIT_CHARS.has(ch)) {
      kind = "digit";
    } else if (DIGIT_SEPARATORS.has(ch) && bufKind === "digit") {
      // A separator joins a digit run only if we're already in a digit run
      kind = "digit";
    } else {
      kind = "other";
    }
    if (bufKind === null) {
      bufKind = kind;
      buf = ch;
    } else if (bufKind === kind) {
      buf += ch;
    } else {
      flush();
      bufKind = kind;
      buf = ch;
    }
  }
  flush();
  return segs;
}

// Final shaping + RTL reordering so pdf-lib's LTR drawText produces the
// correct visual result for Persian text mixed with digits/Latin.
export function shapeAndReverse(text: string): string {
  if (!text) return "";
  // 1) Shape Persian letters into presentation forms
  const shaped = shapeText(text);
  // 2) Tokenize into digit/other runs
  const segs = tokenize(shaped);
  // 3) Reverse the order of segments, and within non-digit segments
  //    reverse the character order too. Digit runs stay as-is.
  const out: string[] = [];
  for (let i = segs.length - 1; i >= 0; i--) {
    const seg = segs[i];
    if (seg.kind === "digit") {
      out.push(seg.text);
    } else {
      out.push(Array.from(seg.text).reverse().join(""));
    }
  }
  return out.join("");
}
