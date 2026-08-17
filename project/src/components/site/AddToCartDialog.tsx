"use client";

import { useState, useMemo } from "react";
import { Product } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CONTAINERS, BONUS_THRESHOLD_KG, BONUS_AMOUNT_KG } from "@/lib/products";
import { useCart, useNav } from "@/lib/store";
import { containerPrice, formatToman, toPersianDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Check, Minus, Plus, Gift, Info, ShoppingBasket } from "lucide-react";
import { toast } from "sonner";

export function AddToCartDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [size, setSize] = useState<number>(1);
  const [hasWax, setHasWax] = useState(false);
  const [qty, setQty] = useState(1);
  const addItem = useCart((s) => s.addItem);
  const { navigate } = useNav();

  const container = useMemo(
    () => CONTAINERS.find((c) => c.size === size) ?? CONTAINERS[1],
    [size]
  );

  const unitPrice = useMemo(
    () => (product ? containerPrice(product.pricePerKg, size) : 0),
    [product, size]
  );

  const total = unitPrice * qty;

  // Reset wax when size changes away from 1kg
  const handleSizeChange = (newSize: number) => {
    setSize(newSize);
    const c = CONTAINERS.find((x) => x.size === newSize);
    if (!c?.canWax) setHasWax(false);
  };

  const handleAdd = () => {
    if (!product) return;
    addItem({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      pricePerKg: product.pricePerKg,
      containerSize: size,
      containerLabel: container.label,
      hasWax: container.canWax ? hasWax : false,
      isWholesale: container.isWholesale,
      quantity: qty,
      unitPrice,
      image: product.image,
    });
    // Reset dialog state
    setQty(1);
    setHasWax(false);
    onOpenChange(false);
    // ✅ Immediately navigate to the cart so the customer can finalize payment
    toast.success(`${product.name} به سبد خرید اضافه شد`, {
      description: "در حال انتقال به سبد خرید...",
    });
    // Small delay so the toast + dialog close animation are visible before nav
    setTimeout(() => navigate("cart"), 250);
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold text-honey-dark flex items-center gap-2">
            <img
              src={product.image}
              alt={product.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            {product.name}
          </DialogTitle>
          <DialogDescription className="text-right">
            انتخاب ظرف و تعداد مورد نظر شما
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Container selection */}
          <div className="space-y-2">
            <Label className="text-sm font-bold text-foreground">
              انتخاب ظرف
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CONTAINERS.map((c) => (
                <button
                  key={c.size}
                  onClick={() => handleSizeChange(c.size)}
                  className={cn(
                    "relative px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all text-center",
                    size === c.size
                      ? "border-honey bg-accent text-accent-foreground shadow-sm"
                      : "border-border bg-card hover:border-honey/40 hover:bg-accent/50"
                  )}
                >
                  {size === c.size && (
                    <Check className="absolute top-1.5 left-1.5 w-3.5 h-3.5 text-honey" />
                  )}
                  <div className="font-bold">
                    {toPersianDigits(c.size)} کیلو
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {c.isWholesale ? "عمده" : "ظرف"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Wax option — only for 1kg */}
          <div
            className={cn(
              "rounded-xl border-2 p-3 transition-all",
              container.canWax
                ? "border-honey/40 bg-accent/30"
                : "border-border bg-muted/40 opacity-60"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1">
                <Label
                  htmlFor="wax-switch"
                  className="text-sm font-bold cursor-pointer flex items-center gap-1.5"
                >
                  با موم عسل
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {container.canWax
                    ? "عسل به همراه موم طبیعی عرضه می‌شود"
                    : "تنها ظرف ۱ کیلویی قابلیت انتخاب موم دارد"}
                </p>
              </div>
              <Switch
                id="wax-switch"
                checked={hasWax}
                onCheckedChange={setHasWax}
                disabled={!container.canWax}
              />
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label className="text-sm font-bold text-foreground">تعداد</Label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9 rounded-lg hover:bg-background"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-12 text-center font-bold text-lg">
                  {toPersianDigits(qty)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9 rounded-lg hover:bg-background"
                  onClick={() => setQty((q) => Math.min(99, q + 1))}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <span className="text-sm text-muted-foreground">
                {toPersianDigits(size * qty)} کیلو مجموع
              </span>
            </div>
          </div>

          {/* Bonus hint */}
          {!container.isWholesale && size * qty >= BONUS_THRESHOLD_KG && (
            <div className="flex items-start gap-2 rounded-xl bg-honey-light/30 border border-honey/30 p-3 text-sm">
              <Gift className="w-5 h-5 text-honey-dark shrink-0 mt-0.5" />
              <span className="text-foreground">
                با این خرید،{" "}
                <b>
                  {toPersianDigits(
                    Math.floor((size * qty) / BONUS_THRESHOLD_KG) *
                      BONUS_AMOUNT_KG
                  )}{" "}
                  کیلو عسل
                </b>{" "}
                به عنوان هدیه دریافت می‌کنید! 🎁
              </span>
            </div>
          )}

          {!container.isWholesale && size * qty < BONUS_THRESHOLD_KG && (
            <div className="flex items-start gap-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                با خرید هر {toPersianDigits(BONUS_THRESHOLD_KG)} کیلو (غیر
                عمده)، {toPersianDigits(BONUS_AMOUNT_KG)} کیلو عسل هدیه دریافت
                می‌کنید.
              </span>
            </div>
          )}

          {/* Price summary */}
          <div className="rounded-xl bg-card border border-border p-4 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>قیمت واحد ظرف</span>
              <span>{formatToman(unitPrice)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>تعداد</span>
              <span>{toPersianDigits(qty)} عدد</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex justify-between items-center">
              <span className="font-bold">مبلغ قابل پرداخت</span>
              <span className="font-extrabold text-lg text-honey-dark">
                {formatToman(total)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleAdd}
            className="w-full bg-honey-gradient text-primary-foreground hover:opacity-90 shadow-md h-12 text-base font-bold"
          >
            <ShoppingBasket className="w-5 h-5 ml-1.5" />
            افزودن به سبد و ادامه
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
