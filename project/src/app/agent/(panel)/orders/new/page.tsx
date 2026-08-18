"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgentCart } from "@/lib/agent-cart-store";
import {
  CONTAINERS,
  BONUS_THRESHOLD_KG,
  BONUS_AMOUNT_KG,
} from "@/lib/products";
import { PROVINCES } from "@/lib/locations";
import {
  containerPrice,
  formatToman,
  toPersianDigits,
} from "@/lib/format";
import { toast } from "sonner";
import {
  PackagePlus,
  Minus,
  Plus,
  Check,
  ShoppingBasket,
  Trash2,
  Gift,
  MapPin,
  Loader2,
  Send,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  slug: string;
  pricePerKg: number;
  image: string | null;
}

interface AgentProfile {
  province: string;
  city: string;
  address: string;
  storeName: string;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delivery info — pre-filled from agent profile
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  // Per-product selection state (productId → {size, hasWax, qty})
  const [selections, setSelections] = useState<
    Record<string, { size: number; hasWax: boolean; qty: number }>
  >({});

  const items = useAgentCart((s) => s.items);
  const addItem = useAgentCart((s) => s.addItem);
  const updateQuantity = useAgentCart((s) => s.updateQuantity);
  const removeItem = useAgentCart((s) => s.removeItem);
  const clearCart = useAgentCart((s) => s.clear);
  const totalAmount = useAgentCart((s) => s.totalAmount());
  const totalKg = useAgentCart((s) => s.totalKg());

  // Bonus calculation (only for non-wholesale items)
  const nonWholesaleKg = items
    .filter((i) => !i.isWholesale)
    .reduce((s, i) => s + i.containerSize * i.quantity, 0);
  const bonusKg = Math.floor(nonWholesaleKg / BONUS_THRESHOLD_KG) * BONUS_AMOUNT_KG;

  // Load products + profile on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [prodRes, profileRes] = await Promise.all([
          fetch("/api/products", { cache: "no-store" }),
          fetch("/api/agent/me", { cache: "no-store" }),
        ]);
        const prodData = await prodRes.json();
        const profileData = await profileRes.json();
        if (!mounted) return;
        if (Array.isArray(prodData.products)) {
          setProducts(prodData.products);
        }
        if (profileData.agent) {
          setProfile(profileData.agent);
          setProvince(profileData.agent.province || "");
          setCity(profileData.agent.city || "");
          setAddress(profileData.agent.address || "");
        }
        // Initialize selections with defaults for each product
        if (Array.isArray(prodData.products)) {
          const init: Record<string, { size: number; hasWax: boolean; qty: number }> = {};
          for (const p of prodData.products) {
            init[p.id] = { size: 1, hasWax: false, qty: 1 };
          }
          setSelections(init);
        }
      } catch (err) {
        console.error("[agent/orders/new] load error:", err);
        toast.error("خطا در دریافت اطلاعات");
      } finally {
        if (mounted) setLoadingProducts(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const cities = PROVINCES.find((p) => p.name === province)?.cities || [];

  // Reset city if province changes
  useEffect(() => {
    if (profile && province === profile.province) return; // skip initial
    setCity("");
  }, [province, profile]);

  const handleSizeChange = (productId: string, newSize: number) => {
    setSelections((prev) => {
      const c = CONTAINERS.find((x) => x.size === newSize);
      const cur = prev[productId] || { size: 1, hasWax: false, qty: 1 };
      return {
        ...prev,
        [productId]: {
          ...cur,
          size: newSize,
          hasWax: c?.canWax ? cur.hasWax : false,
        },
      };
    });
  };

  const handleQtyChange = (productId: string, delta: number) => {
    setSelections((prev) => {
      const cur = prev[productId] || { size: 1, hasWax: false, qty: 1 };
      return {
        ...prev,
        [productId]: {
          ...cur,
          qty: Math.max(1, Math.min(99, cur.qty + delta)),
        },
      };
    });
  };

  const handleWaxChange = (productId: string, checked: boolean) => {
    setSelections((prev) => {
      const cur = prev[productId] || { size: 1, hasWax: false, qty: 1 };
      return { ...prev, [productId]: { ...cur, hasWax: checked } };
    });
  };

  const handleAddToCart = (product: Product) => {
    const sel = selections[product.id] || { size: 1, hasWax: false, qty: 1 };
    const container = CONTAINERS.find((c) => c.size === sel.size) ?? CONTAINERS[1];
    const unitPrice = containerPrice(product.pricePerKg, sel.size);
    addItem({
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      pricePerKg: product.pricePerKg,
      containerSize: sel.size,
      containerLabel: container.label,
      hasWax: container.canWax ? sel.hasWax : false,
      isWholesale: container.isWholesale,
      quantity: sel.qty,
      unitPrice,
    });
    toast.success(`${product.name} به سفارش اضافه شد`, {
      description: `${toPersianDigits(sel.qty)} عدد × ظرف ${toPersianDigits(sel.size)} کیلو`,
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (items.length === 0) {
      toast.error("سبد سفارش خالی است. حداقل یک محصول اضافه کنید.");
      return;
    }
    if (!province) {
      toast.error("استان را انتخاب کنید");
      return;
    }
    if (!city) {
      toast.error("شهر را انتخاب کنید");
      return;
    }
    if (address.trim().length < 5) {
      toast.error("آدرس کامل را وارد کنید");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/agent/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          province,
          city,
          address: address.trim(),
          notes: notes.trim() || undefined,
          items: items.map((i) => ({
            productId: i.productId,
            containerSize: i.containerSize,
            hasWax: i.hasWax,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "ثبت سفارش ناموفق بود");
        return;
      }
      toast.success("سفارش شما با موفقیت ثبت شد!", {
        description: `شماره سفارش: ${data.order.orderNumber}`,
      });
      clearCart();
      router.push("/agent/orders");
      router.refresh();
    } catch (err) {
      console.error("[agent/orders/new] submit error:", err);
      toast.error("خطای شبکه. لطفاً دوباره تلاش کنید.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-honey-dark flex items-center gap-2">
            <PackagePlus className="w-6 h-6" />
            ثبت سفارش جدید
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            محصول مورد نظر را انتخاب کرده و به سفارش اضافه کنید
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/agent/orders">
            <ArrowLeft className="w-4 h-4 ml-1" />
            بازگشت به سفارش‌ها
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Products list (left/main) */}
        <div className="lg:col-span-2 space-y-4">
          {loadingProducts ? (
            <Card className="p-5 gap-3">
              <Skeleton className="h-6 w-40" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </div>
            </Card>
          ) : products.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              محصولی برای سفارش وجود ندارد.
            </Card>
          ) : (
            products.map((product) => {
              const sel = selections[product.id] || {
                size: 1,
                hasWax: false,
                qty: 1,
              };
              const container =
                CONTAINERS.find((c) => c.size === sel.size) ?? CONTAINERS[1];
              const unitPrice = containerPrice(
                product.pricePerKg,
                sel.size
              );
              const total = unitPrice * sel.qty;
              return (
                <Card key={product.id} className="p-4 sm:p-5 gap-4">
                  {/* Product header */}
                  <div className="flex items-start gap-3">
                    {product.image && (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-14 h-14 rounded-xl object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base text-foreground">
                        {product.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        قیمت هر کیلو: {formatToman(product.pricePerKg)}
                      </p>
                    </div>
                  </div>

                  {/* Container size grid */}
                  <div>
                    <Label className="text-xs font-bold mb-2 block">
                      انتخاب ظرف
                    </Label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                      {CONTAINERS.map((c) => (
                        <button
                          key={c.size}
                          type="button"
                          onClick={() => handleSizeChange(product.id, c.size)}
                          className={cn(
                            "relative px-2 py-2 rounded-lg border-2 text-xs font-medium transition-all text-center",
                            sel.size === c.size
                              ? "border-honey bg-accent text-accent-foreground shadow-sm"
                              : "border-border bg-card hover:border-honey/40"
                          )}
                        >
                          {sel.size === c.size && (
                            <Check className="absolute top-1 left-1 w-3 h-3 text-honey" />
                          )}
                          <div className="font-bold">
                            {toPersianDigits(c.size)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {c.isWholesale ? "عمده" : "کیلو"}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Wax option */}
                  <div
                    className={cn(
                      "rounded-lg border p-2.5",
                      container.canWax
                        ? "border-honey/40 bg-accent/30"
                        : "border-border bg-muted/40 opacity-60"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Label
                        htmlFor={`wax-${product.id}`}
                        className="text-xs font-bold cursor-pointer"
                      >
                        با موم عسل
                      </Label>
                      <Switch
                        id={`wax-${product.id}`}
                        checked={sel.hasWax}
                        onCheckedChange={(v) =>
                          handleWaxChange(product.id, v)
                        }
                        disabled={!container.canWax}
                      />
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs font-bold">تعداد</Label>
                    <div className="flex items-center gap-1.5 bg-muted rounded-lg p-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 rounded-md hover:bg-background"
                        onClick={() => handleQtyChange(product.id, -1)}
                        disabled={sel.qty <= 1}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </Button>
                      <span className="w-8 text-center font-bold text-sm">
                        {toPersianDigits(sel.qty)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 rounded-md hover:bg-background"
                        onClick={() => handleQtyChange(product.id, 1)}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Add to cart */}
                  <Button
                    type="button"
                    onClick={() => handleAddToCart(product)}
                    className="w-full bg-honey-gradient text-primary-foreground hover:opacity-90 shadow-sm h-10"
                  >
                    <ShoppingBasket className="w-4 h-4 ml-1.5" />
                    افزودن به سفارش — {formatToman(total)}
                  </Button>
                </Card>
              );
            })
          )}
        </div>

        {/* Cart + delivery (sticky) */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="space-y-4 lg:sticky lg:top-24">
            {/* Cart */}
            <Card className="p-4 gap-3">
              <CardHeader className="px-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingBasket className="w-5 h-5 text-honey-dark" />
                  خلاصه سفارش
                </CardTitle>
                <CardDescription className="text-xs">
                  {items.length === 0
                    ? "سبد خالی است"
                    : `${toPersianDigits(items.length)} نوع کالا`}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 space-y-2">
                {items.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <ShoppingBasket className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    هنوز کالایی اضافه نکرده‌اید
                  </div>
                ) : (
                  <>
                    {items.map((i) => (
                      <div
                        key={i.id}
                        className="rounded-lg bg-muted/40 p-2.5 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold truncate">
                              {i.productName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {i.containerLabel}
                              {i.hasWax ? " + موم" : ""} ×{" "}
                              {toPersianDigits(i.quantity)} عدد
                            </p>
                          </div>
                          <div className="text-left shrink-0">
                            <p className="font-bold text-honey-dark">
                              {formatToman(i.unitPrice * i.quantity)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 rounded"
                              onClick={() =>
                                updateQuantity(i.id, i.quantity - 1)
                              }
                              disabled={i.quantity <= 1}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-6 text-center text-xs font-bold">
                              {toPersianDigits(i.quantity)}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 rounded"
                              onClick={() =>
                                updateQuantity(i.id, i.quantity + 1)
                              }
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 rounded text-red-600 hover:bg-red-50"
                            onClick={() => removeItem(i.id)}
                            aria-label="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Bonus hint */}
                    {bonusKg > 0 && (
                      <div className="flex items-start gap-2 rounded-lg bg-honey-light/30 border border-honey/30 p-2.5 text-xs">
                        <Gift className="w-4 h-4 text-honey-dark shrink-0 mt-0.5" />
                        <span>
                          با این خرید{" "}
                          <b>{toPersianDigits(bonusKg)} کیلو</b> عسل
                          هدیه دریافت می‌کنید!
                        </span>
                      </div>
                    )}

                    <div className="h-px bg-border my-1" />
                    <div className="flex justify-between items-center font-bold">
                      <span>مبلغ کل:</span>
                      <span className="text-lg text-honey-dark">
                        {formatToman(totalAmount)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      مجموع: {toPersianDigits(totalKg)} کیلو عسل
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Delivery info */}
            <Card className="p-4 gap-3">
              <CardHeader className="px-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-honey-dark" />
                  اطلاعات تحویل
                </CardTitle>
                <CardDescription className="text-xs">
                  از پروفایل شما پر شده است
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">استان</Label>
                    <Select
                      value={province}
                      onValueChange={(v) => setProvince(v)}
                      disabled={submitting}
                    >
                      <SelectTrigger className="w-full h-9 text-sm">
                        <SelectValue placeholder="انتخاب" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVINCES.map((p) => (
                          <SelectItem key={p.name} value={p.name}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">شهر</Label>
                    <Select
                      value={city}
                      onValueChange={(v) => setCity(v)}
                      disabled={submitting || !province}
                    >
                      <SelectTrigger className="w-full h-9 text-sm">
                        <SelectValue placeholder="انتخاب" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-xs font-bold">
                    آدرس کامل
                  </Label>
                  <Textarea
                    id="address"
                    rows={3}
                    placeholder="استان، شهر، خیابان، کوچه، پلاک..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={submitting}
                    maxLength={500}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs font-bold">
                    یادداشت (اختیاری)
                  </Label>
                  <Textarea
                    id="notes"
                    rows={2}
                    placeholder="یادداشت برای فروشنده..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={submitting}
                    maxLength={500}
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <Button
              type="submit"
              disabled={submitting || items.length === 0}
              className="w-full bg-honey-gradient text-primary-foreground hover:opacity-90 shadow-md h-12 text-base"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {submitting
                ? "در حال ثبت سفارش..."
                : `ثبت سفارش — ${formatToman(totalAmount)}`}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
