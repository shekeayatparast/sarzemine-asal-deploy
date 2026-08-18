"use client";

// ProductManager — combined inventory (B10) + product CRUD (B13) client UI.
//
// Receives the full product list (incl. stockKg + agentPricePerKg) from the
// admin server page. Renders:
//   • a search + "add product" toolbar
//   • a product table with image, name, slug, customer/agent prices, stock,
//     featured toggle, low-stock indicator and per-row actions
//   • an inline stock editor (B10) — type a number, click "ذخیره"
//   • a full create/edit dialog (B13) with all fields + image upload (data URL)
//   • a delete confirm dialog (B13)
// Toast feedback (sonner) + router.refresh() after every mutation.

import { useMemo, useState, useEffect, useRef, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Save,
  AlertTriangle,
  Image as ImageIcon,
  Loader2,
  Search,
  Star,
  X,
  Boxes,
  TrendingDown,
} from "lucide-react";
import {
  formatToman,
  toPersianDigits,
  formatJalaliDateTime,
} from "@/lib/format";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────────
// Mirrors the Prisma Product shape (dates → ISO strings) so the server page
// can pass the raw Prisma objects straight through (just map Date → iso).

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  pricePerKg: number;
  agentPricePerKg: number;
  stockKg: number;
  color: string;
  origin: string;
  benefits: string;
  image: string | null;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

const LOW_STOCK_THRESHOLD = 5;

// ── Helpers ─────────────────────────────────────────────────────────────
// Persian (۰-۹) and Arabic-Indic (٠-٩) digit tables
const FA_DIGITS_ARR = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const AR_DIGITS_ARR = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/** Convert Persian/Arabic digits in a string to ASCII digits. */
function toEnglishDigits(input: string): string {
  let out = input;
  for (let i = 0; i < 10; i++) {
    out = out.replace(new RegExp(FA_DIGITS_ARR[i], "g"), String(i));
    out = out.replace(new RegExp(AR_DIGITS_ARR[i], "g"), String(i));
  }
  return out;
}

/** Convert a Persian-style number input to a JS number. Returns NaN if empty. */
function parseNumberInput(s: string): number {
  const cleaned = toEnglishDigits(s).replace(/[,٬\s]/g, "");
  if (cleaned === "") return NaN;
  return Number(cleaned);
}

/** Auto-suggest a slug from a Persian name — fallback to "product-<n>". */
function slugify(name: string): string {
  // Persian → ASCII-ish slug. We just lowercase, replace spaces/duplicates
  // with dashes, strip non a-z0-9-. The user can edit it manually anyway.
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "product";
}

// ── Sub-component: ProductFormDialog ────────────────────────────────────
// Re-used for both create and edit. When `product` is null → create mode.

interface FormState {
  name: string;
  slug: string;
  description: string;
  benefits: string;
  pricePerKg: string; // keep as string for input control
  agentPricePerKg: string;
  stockKg: string;
  color: string;
  origin: string;
  image: string | null; // data URL or path
  featured: boolean;
}

function ProductFormDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: AdminProduct | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Hydrate form when dialog opens or product changes
  useEffect(() => {
    if (!open) return;
    setSlugTouched(false);
    setImgError(null);
    if (product) {
      setForm({
        name: product.name,
        slug: product.slug,
        description: product.description,
        benefits: product.benefits || "",
        pricePerKg: String(product.pricePerKg),
        agentPricePerKg: String(product.agentPricePerKg),
        stockKg: String(product.stockKg),
        color: product.color || "",
        origin: product.origin || "",
        image: product.image ?? null,
        featured: product.featured,
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, product]);

  function emptyForm(): FormState {
    return {
      name: "",
      slug: "",
      description: "",
      benefits: "",
      pricePerKg: "",
      agentPricePerKg: "0",
      stockKg: "0",
      color: "",
      origin: "",
      image: null,
      featured: false,
    };
  }

  const onField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const onNameChange = (v: string) => {
    setForm((f) => ({
      ...f,
      name: v,
      // Auto-update slug only if user hasn't manually edited it
      slug: slugTouched ? f.slug : slugify(v),
    }));
  };

  const onSlugChange = (v: string) => {
    setSlugTouched(true);
    // Strip invalid chars live so user gets instant feedback
    const cleaned = v
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
    onField("slug", cleaned);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgError(null);
    setImgBusy(true);
    try {
      if (file.size > 1_500_000) {
        // ~1.5MB cap — anything bigger gets too heavy for SQLite
        setImgError(
          "حجم تصویر باید کمتر از ۱.۵ مگابایت باشد. لطفاً تصویر کوچکتری انتخاب کنید."
        );
        setImgBusy(false);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        // reader.result is a data URL — store as-is
        onField("image", typeof reader.result === "string" ? reader.result : null);
        setImgBusy(false);
      };
      reader.onerror = () => {
        setImgError("خطا در خواندن فایل تصویر");
        setImgBusy(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("[ProductForm image read] error:", err);
      setImgError("خطای غیرمنتظره در خواندن تصویر");
      setImgBusy(false);
    }
  };

  const clearImage = () => {
    onField("image", null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setImgError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;

    // Client-side validation (mirror server Zod)
    const name = form.name.trim();
    if (name.length < 2) {
      toast.error("نام محصول باید حداقل ۲ کاراکتر باشد");
      return;
    }
    const slug = form.slug.trim();
    if (!/^[a-z0-9-]+$/.test(slug) || slug.length < 2) {
      toast.error("اسلاگ نامعتبر است — فقط حروف انگلیسی کوچک، اعداد و خط تیره");
      return;
    }
    const description = form.description.trim();
    if (description.length < 5) {
      toast.error("توضیحات محصول را کاملتر بنویسید (حداقل ۵ کاراکتر)");
      return;
    }
    const pricePerKg = parseNumberInput(form.pricePerKg);
    if (isNaN(pricePerKg) || pricePerKg < 0 || !Number.isInteger(pricePerKg)) {
      toast.error("قیمت هر کیلو (مشتری) باید عدد صحیح مثبت باشد");
      return;
    }
    const agentPricePerKg = parseNumberInput(form.agentPricePerKg || "0") || 0;
    if (agentPricePerKg < 0 || !Number.isInteger(agentPricePerKg)) {
      toast.error("قیمت نماینده باید عدد صحیح مثبت یا ۰ باشد");
      return;
    }
    const stockKg = parseNumberInput(form.stockKg || "0") || 0;
    if (isNaN(stockKg) || stockKg < 0) {
      toast.error("موجودی باید عدد مثبت باشد");
      return;
    }

    const body = {
      name,
      slug,
      description,
      benefits: form.benefits.trim(),
      pricePerKg,
      agentPricePerKg,
      stockKg,
      color: form.color.trim(),
      origin: form.origin.trim(),
      image: form.image,
      featured: form.featured,
    };

    setSaving(true);
    try {
      const url = product
        ? `/api/admin/products/${product.id}`
        : "/api/admin/products";
      const method = product ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "ذخیره ناموفق بود");
        return;
      }
      toast.success(data.message || "محصول ذخیره شد");
      onOpenChange(false);
      // Give the dialog close animation a tick, then refresh server data
      setTimeout(() => router.refresh(), 250);
    } catch (err) {
      console.error("[ProductForm submit] error:", err);
      toast.error("خطای شبکه. لطفاً دوباره تلاش کنید.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[92vh] overflow-y-auto"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold text-honey-dark flex items-center gap-2">
            {product ? (
              <Pencil className="w-5 h-5" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            {product ? "ویرایش محصول" : "افزودن محصول جدید"}
          </DialogTitle>
          <DialogDescription className="text-right">
            {product
              ? `در حال ویرایش «${product.name}»`
              : "یک محصول جدید به سرزمین عسل اضافه کنید"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image */}
          <div className="space-y-2">
            <Label className="text-sm font-bold">تصویر محصول</Label>
            <div className="flex items-start gap-3">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-honey/40 bg-honey-light/20 flex items-center justify-center overflow-hidden shrink-0">
                {form.image ? (
                  <img
                    src={form.image}
                    alt="پیش‌نمایش"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-honey-dark/60">
                    <Package className="w-8 h-8" />
                    <span className="text-[10px]">بدون تصویر</span>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={onFileChange}
                  disabled={imgBusy || saving}
                  className="hidden"
                  id="product-image-input"
                />
                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imgBusy || saving}
                  >
                    {imgBusy ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ImageIcon className="w-4 h-4" />
                    )}
                    انتخاب فایل
                  </Button>
                  {form.image && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={clearImage}
                      disabled={imgBusy || saving}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                      پاک کردن عکس
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  فرمت PNG/JPG/WebP — حداکثر ۱.۵ مگابایت
                </p>
                {imgError && (
                  <p className="text-[11px] text-red-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {imgError}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Name + Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-name" className="text-sm font-bold">
                نام محصول <span className="text-red-500">*</span>
              </Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => onNameChange(e.target.value)}
                maxLength={120}
                disabled={saving}
                placeholder="عسل گون"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-slug" className="text-sm font-bold">
                اسلاگ (URL) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="p-slug"
                value={form.slug}
                onChange={(e) => onSlugChange(e.target.value)}
                maxLength={80}
                disabled={saving}
                dir="ltr"
                placeholder="gon"
                className="text-left"
              />
              <p className="text-[11px] text-muted-foreground">
                فقط حروف انگلیسی کوچک، اعداد و خط تیره
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="p-desc" className="text-sm font-bold">
              توضیحات <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="p-desc"
              value={form.description}
              onChange={(e) => onField("description", e.target.value)}
              rows={3}
              maxLength={2000}
              disabled={saving}
              placeholder="توضیحات محصول..."
            />
          </div>

          {/* Benefits */}
          <div className="space-y-1.5">
            <Label htmlFor="p-benefits" className="text-sm font-bold">
              خواص
            </Label>
            <Textarea
              id="p-benefits"
              value={form.benefits}
              onChange={(e) => onField("benefits", e.target.value)}
              rows={2}
              maxLength={2000}
              disabled={saving}
              placeholder="خواص درمانی و تغذیه‌ای..."
            />
          </div>

          {/* Prices */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-price" className="text-sm font-bold">
                قیمت هر کیلو (مشتری) — تومان{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="p-price"
                value={form.pricePerKg}
                onChange={(e) => onField("pricePerKg", e.target.value)}
                disabled={saving}
                dir="ltr"
                inputMode="numeric"
                className="text-left"
                placeholder="۱۴۰۰۰۰۰"
              />
              <p className="text-[11px] text-muted-foreground">
                {parseNumberInput(form.pricePerKg) >= 0 &&
                  !isNaN(parseNumberInput(form.pricePerKg)) && (
                    <>{formatToman(parseNumberInput(form.pricePerKg))}</>
                  )}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-agent-price" className="text-sm font-bold">
                قیمت نماینده — تومان
              </Label>
              <Input
                id="p-agent-price"
                value={form.agentPricePerKg}
                onChange={(e) => onField("agentPricePerKg", e.target.value)}
                disabled={saving}
                dir="ltr"
                inputMode="numeric"
                className="text-left"
                placeholder="۰ (استفاده از قیمت مشتری)"
              />
              <p className="text-[11px] text-muted-foreground">
                {(() => {
                  const v = parseNumberInput(form.agentPricePerKg);
                  return v > 0
                    ? formatToman(v)
                    : "۰ = همان قیمت مشتری استفاده می‌شود";
                })()}
              </p>
            </div>
          </div>

          {/* Stock + Color + Origin */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-stock" className="text-sm font-bold">
                موجودی (کیلوگرم)
              </Label>
              <Input
                id="p-stock"
                value={form.stockKg}
                onChange={(e) => onField("stockKg", e.target.value)}
                disabled={saving}
                dir="ltr"
                inputMode="decimal"
                className="text-left"
                placeholder="۰"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-color" className="text-sm font-bold">
                رنگ
              </Label>
              <Input
                id="p-color"
                value={form.color}
                onChange={(e) => onField("color", e.target.value)}
                maxLength={60}
                disabled={saving}
                placeholder="کهربایی روشن"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-origin" className="text-sm font-bold">
                منطقه جمع‌آوری
              </Label>
              <Input
                id="p-origin"
                value={form.origin}
                onChange={(e) => onField("origin", e.target.value)}
                maxLength={120}
                disabled={saving}
                placeholder="زاگرس"
              />
            </div>
          </div>

          {/* Featured */}
          <div className="flex items-center justify-between rounded-xl border border-honey/30 bg-honey-light/20 p-3">
            <div className="flex-1">
              <Label
                htmlFor="p-featured"
                className="text-sm font-bold cursor-pointer flex items-center gap-1.5"
              >
                <Star className="w-4 h-4 text-honey-dark" />
                محصول ویژه
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                محصولات ویژه در صفحه اصلی نمایش داده می‌شوند
              </p>
            </div>
            <Switch
              id="p-featured"
              checked={form.featured}
              onCheckedChange={(v) => onField("featured", v)}
              disabled={saving}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-honey-gradient text-primary-foreground hover:opacity-90 shadow-md"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {product ? "ذخیره تغییرات" : "ایجاد محصول"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Sub-component: StockEditor (inline, B10) ────────────────────────────
function StockEditor({
  product,
  onSaved,
}: {
  product: AdminProduct;
  onSaved?: () => void;
}) {
  const [value, setValue] = useState<string>(String(product.stockKg));
  const [saving, setSaving] = useState(false);

  // Keep local value in sync if the product row updates from server refresh
  useEffect(() => {
    setValue(String(product.stockKg));
  }, [product.stockKg]);

  const stock = parseNumberInput(value);
  const dirty = !isNaN(stock) && stock !== product.stockKg;
  const low = !isNaN(stock) && stock < LOW_STOCK_THRESHOLD;

  const save = async () => {
    if (saving || !dirty) return;
    if (isNaN(stock) || stock < 0) {
      toast.error("موجودی باید عدد مثبت باشد");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockKg: stock }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "ذخیره ناموفق بود");
        return;
      }
      toast.success(`موجودی «${product.name}» به‌روزرسانی شد`);
      onSaved?.();
    } catch (err) {
      console.error("[StockEditor save] error:", err);
      toast.error("خطای شبکه. لطفاً دوباره تلاش کنید.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5" dir="ltr">
      <Input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={saving}
        className={cn(
          "h-8 w-20 text-center text-sm",
          low ? "text-red-600 border-red-300" : ""
        )}
        title="موجودی به کیلوگرم"
      />
      <span className="text-[10px] text-muted-foreground">کیلو</span>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={cn(
          "h-7 w-7",
          dirty
            ? "bg-honey-light/40 text-honey-dark hover:bg-honey-light/60"
            : "opacity-40"
        )}
        onClick={save}
        disabled={saving || !dirty}
        title="ذخیره موجودی"
      >
        {saving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Save className="w-3.5 h-3.5" />
        )}
      </Button>
    </div>
  );
}

// ── Sub-component: Delete confirm dialog (B13) ─────────────────────────
function DeleteDialog({
  product,
  open,
  onOpenChange,
  onDone,
}: {
  product: AdminProduct | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone?: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!product || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "حذف ناموفق بود");
        return;
      }
      toast.success(`محصول «${product.name}» حذف شد`);
      onOpenChange(false);
      onDone?.();
    } catch (err) {
      console.error("[DeleteDialog] error:", err);
      toast.error("خطای شبکه. لطفاً دوباره تلاش کنید.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            حذف محصول
          </AlertDialogTitle>
          <AlertDialogDescription>
            آیا از حذف «<b>{product?.name}</b>» مطمئن هستید؟ این عملیات
            غیرقابل بازگشت است.
            <br />
            <span className="text-[12px] text-muted-foreground mt-1 block">
              توجه: اگر این محصول قبلاً در سفارش‌ها استفاده شده باشد، حذف آن
              ممکن است ناممکن باشد. در آن صورت می‌توانید موجودی آن را به صفر
              برسانید یا آن را از حالت ویژه خارج کنید.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>انصراف</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className={cn(
              "bg-red-600 hover:bg-red-700 text-white",
              deleting && "opacity-70 cursor-wait"
            )}
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            حذف محصول
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Main component: ProductManager ──────────────────────────────────────
export function ProductManager({
  products,
}: {
  products: AdminProduct[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [deleting, setDeleting] = useState<AdminProduct | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return products;
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.origin.toLowerCase().includes(q) ||
        p.color.toLowerCase().includes(q)
    );
  }, [products, query]);

  // Stats summary
  const stats = useMemo(() => {
    const total = products.length;
    const featured = products.filter((p) => p.featured).length;
    const lowStock = products.filter(
      (p) => p.stockKg < LOW_STOCK_THRESHOLD
    ).length;
    const outOfStock = products.filter((p) => p.stockKg <= 0).length;
    return { total, featured, lowStock, outOfStock };
  }, [products]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (p: AdminProduct) => {
    setEditing(p);
    setFormOpen(true);
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-honey-dark flex items-center gap-2">
            <Boxes className="w-6 h-6" />
            مدیریت محصولات و موجودی
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            مجموع {toPersianDigits(stats.total)} محصول ·{" "}
            {toPersianDigits(stats.featured)} ویژه ·{" "}
            <span
              className={cn(
                stats.lowStock > 0
                  ? "text-amber-700 font-bold"
                  : "text-muted-foreground"
              )}
            >
              {toPersianDigits(stats.lowStock)} با موجودی کم
            </span>{" "}
            ·{" "}
            <span
              className={cn(
                stats.outOfStock > 0
                  ? "text-red-600 font-bold"
                  : "text-muted-foreground"
              )}
            >
              {toPersianDigits(stats.outOfStock)} ناموجود
            </span>
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-honey-gradient text-primary-foreground hover:opacity-90 shadow-md"
        >
          <Plus className="w-4 h-4 ml-1" />
          افزودن محصول جدید
        </Button>
      </div>

      {/* Quick stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          icon={<Boxes className="w-5 h-5" />}
          label="کل محصولات"
          value={toPersianDigits(stats.total)}
          tint="honey"
        />
        <StatTile
          icon={<Star className="w-5 h-5" />}
          label="محصولات ویژه"
          value={toPersianDigits(stats.featured)}
          tint="honey"
        />
        <StatTile
          icon={<TrendingDown className="w-5 h-5" />}
          label="موجودی کم (زیر ۵ کیلو)"
          value={toPersianDigits(stats.lowStock)}
          tint={stats.lowStock > 0 ? "warn" : "neutral"}
        />
        <StatTile
          icon={<AlertTriangle className="w-5 h-5" />}
          label="ناموجود (۰ کیلو)"
          value={toPersianDigits(stats.outOfStock)}
          tint={stats.outOfStock > 0 ? "danger" : "neutral"}
        />
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجو بر اساس نام، اسلاگ، رنگ یا منطقه..."
          className="pr-10"
          dir="rtl"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="پاک کردن"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Products table */}
      <Card className="gap-0 p-0 overflow-hidden">
        <CardHeader className="p-4 border-b bg-muted/30">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4 text-honey-dark" />
            فهرست محصولات
          </CardTitle>
          <CardDescription className="text-xs">
            {filtered.length === products.length
              ? `نمایش همه ${toPersianDigits(products.length)} محصول`
              : `${toPersianDigits(filtered.length)} محصول یافت شد`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Package className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">
                {products.length === 0
                  ? "هنوز محصولی تعریف نشده است."
                  : "محصولی با این فیلترها پیدا نشد."}
              </p>
              {products.length === 0 && (
                <Button
                  onClick={openCreate}
                  className="bg-honey-gradient text-primary-foreground"
                >
                  <Plus className="w-4 h-4 ml-1" />
                  افزودن اولین محصول
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">تصویر</TableHead>
                      <TableHead>نام</TableHead>
                      <TableHead>اسلاگ</TableHead>
                      <TableHead>قیمت مشتری/کیلو</TableHead>
                      <TableHead>قیمت نماینده/کیلو</TableHead>
                      <TableHead>موجودی</TableHead>
                      <TableHead className="text-center">ویژه</TableHead>
                      <TableHead className="text-left">عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-honey-light/30 flex items-center justify-center shrink-0">
                            {p.image ? (
                              <img
                                src={p.image}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-5 h-5 text-honey-dark/40" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-bold text-foreground">
                            {p.name}
                          </p>
                          {p.origin && (
                            <p className="text-[11px] text-muted-foreground">
                              {p.origin}
                            </p>
                          )}
                        </TableCell>
                        <TableCell dir="ltr" className="text-left text-xs text-muted-foreground">
                          {p.slug}
                        </TableCell>
                        <TableCell className="font-bold whitespace-nowrap">
                          {formatToman(p.pricePerKg)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "whitespace-nowrap",
                            p.agentPricePerKg > 0
                              ? "font-bold text-honey-dark"
                              : "text-muted-foreground italic"
                          )}
                        >
                          {p.agentPricePerKg > 0
                            ? formatToman(p.agentPricePerKg)
                            : "همان مشتری"}
                        </TableCell>
                        <TableCell>
                          <StockEditor
                            product={p}
                            onSaved={() => router.refresh()}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          {p.featured ? (
                            <Badge className="bg-honey-light/40 text-honey-dark border-honey/20">
                              <Star className="w-3 h-3 ml-1" />
                              ویژه
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEdit(p)}
                              className="h-8 w-8 text-honey-dark hover:bg-honey-light/40"
                              title="ویرایش"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleting(p)}
                              className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden divide-y">
                {filtered.map((p) => (
                  <div key={p.id} className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-honey-light/30 flex items-center justify-center shrink-0">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-honey-dark/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-foreground">{p.name}</p>
                          {p.featured && (
                            <Badge className="bg-honey-light/40 text-honey-dark border-honey/20 text-[10px]">
                              <Star className="w-3 h-3 ml-1" />
                              ویژه
                            </Badge>
                          )}
                        </div>
                        <p
                          dir="ltr"
                          className="text-[11px] text-muted-foreground text-left"
                        >
                          {p.slug}
                        </p>
                        {p.origin && (
                          <p className="text-[11px] text-muted-foreground">
                            {p.origin}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">قیمت مشتری/کیلو</p>
                        <p className="font-bold">
                          {formatToman(p.pricePerKg)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          قیمت نماینده/کیلو
                        </p>
                        <p
                          className={cn(
                            "font-bold",
                            p.agentPricePerKg > 0
                              ? "text-honey-dark"
                              : "text-muted-foreground italic"
                          )}
                        >
                          {p.agentPricePerKg > 0
                            ? formatToman(p.agentPricePerKg)
                            : "همان مشتری"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[11px] text-muted-foreground mb-1">
                          موجودی
                        </p>
                        <StockEditor
                          product={p}
                          onSaved={() => router.refresh()}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(p)}
                          className="h-8 w-8 text-honey-dark hover:bg-honey-light/40"
                          title="ویرایش"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleting(p)}
                          className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Last updated info */}
      <p className="text-[11px] text-muted-foreground text-center">
        آخرین به‌روزرسانی:{" "}
        {products[0]?.updatedAt
          ? formatJalaliDateTime(products[0].updatedAt)
          : "—"}
        {products.length > 1 && (
          <span className="mr-2">
            · نمایش {toPersianDigits(filtered.length)} از{" "}
            {toPersianDigits(products.length)} محصول
          </span>
        )}
      </p>

      {/* Create/Edit dialog */}
      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
      />

      {/* Delete dialog */}
      <DeleteDialog
        product={deleting}
        open={deleting !== null}
        onOpenChange={(v) => !v && setDeleting(null)}
        onDone={() => router.refresh()}
      />
    </div>
  );
}

// ── Small stat tile for the summary row ──────────────────────────────────
function StatTile({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tint: "honey" | "warn" | "danger" | "neutral";
}) {
  const tintClass =
    tint === "honey"
      ? "bg-honey-light/30 border-honey/30 text-honey-dark"
      : tint === "warn"
      ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200"
      : tint === "danger"
      ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
      : "bg-muted/30 border-border text-muted-foreground";
  return (
    <div
      className={cn(
        "rounded-xl border p-3 flex items-center gap-3",
        tintClass
      )}
    >
      <div className="w-9 h-9 rounded-lg bg-background/60 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] truncate">{label}</p>
        <p className="text-lg font-extrabold leading-tight">{value}</p>
      </div>
    </div>
  );
}
