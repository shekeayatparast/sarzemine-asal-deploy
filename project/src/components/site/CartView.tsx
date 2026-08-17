"use client";

import { useState } from "react";
import { useCart, useNav } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROVINCES } from "@/lib/locations";
import {
  PAYMENT_CARD_NUMBER,
  PAYMENT_CARD_HOLDER,
  FREE_DELIVERY_CITY,
  BONUS_THRESHOLD_KG,
  BONUS_AMOUNT_KG,
} from "@/lib/products";
import {
  formatToman,
  formatRial,
  toPersianDigits,
} from "@/lib/format";
import {
  Trash2,
  Minus,
  Plus,
  ShoppingBasket,
  Gift,
  Truck,
  Copy,
  Check,
  CreditCard,
  Loader2,
  ShieldCheck,
  Phone,
  User,
  MapPin,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

type Step = "cart" | "payment" | "success";

export function CartView() {
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    totalAmount,
    totalKg,
    bonusKg,
  } = useCart();
  const { navigate } = useNav();

  const [step, setStep] = useState<Step>("cart");
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [orderCopied, setOrderCopied] = useState(false);

  // form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  // order result
  const [orderResult, setOrderResult] = useState<{
    orderNumber: string;
    totalAmount: number;
    uniqueAmount: number;
    finalAmount: number;
    deliveryType: string;
  } | null>(null);

  const subtotal = totalAmount();
  const totalKgVal = totalKg();
  const bonus = bonusKg();
  const isShahrekord = city.trim() === FREE_DELIVERY_CITY;

  const copyCard = () => {
    navigator.clipboard.writeText(PAYMENT_CARD_NUMBER.replace(/\s/g, ""));
    setCopied(true);
    toast.success("شماره کارت کپی شد");
    setTimeout(() => setCopied(false), 2000);
  };

  const copyOrderNumber = () => {
    if (!orderResult) return;
    navigator.clipboard.writeText(orderResult.orderNumber);
    setOrderCopied(true);
    toast.success("شماره سفارش کپی شد");
    setTimeout(() => setOrderCopied(false), 2000);
  };

  const submitOrder = async () => {
    if (!name.trim()) return toast.error("نام و نام خانوادگی را وارد کنید");
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10)
      return toast.error("شماره تماس معتبر وارد کنید");
    if (!province) return toast.error("استان را انتخاب کنید");
    if (!city) return toast.error("شهر را انتخاب کنید");
    if (items.length === 0) return toast.error("سبد خرید خالی است");

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          customerPhone: phone,
          province,
          city,
          address,
          notes,
          items: items.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            containerSize: i.containerSize,
            hasWax: i.hasWax,
            isWholesale: i.isWholesale,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
          totalAmount: subtotal,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در ثبت سفارش");
      setOrderResult(data);
      setStep("payment");
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.success("سفارش شما ثبت شد!");
    } catch (e: any) {
      toast.error(e.message || "خطا در ثبت سفارش");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmPayment = async () => {
    if (!orderResult) return;
    setConfirming(true);
    try {
      const res = await fetch("/api/orders/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: orderResult.orderNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep("success");
      clearCart();
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.success("پرداخت شما با موفقیت ثبت شد");
    } catch (e: any) {
      toast.error(e.message || "خطا در تأیید پرداخت");
    } finally {
      setConfirming(false);
    }
  };

  // ===== Empty cart =====
  if (items.length === 0 && step === "cart") {
    return (
      <div className="bg-cream-gradient min-h-[60vh] flex items-center justify-center py-16">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-honey-light/30 flex items-center justify-center">
            <ShoppingBasket className="w-12 h-12 text-honey" />
          </div>
          <h2 className="text-2xl font-extrabold text-honey-dark mb-2">
            سبد خرید شما خالی است
          </h2>
          <p className="text-muted-foreground mb-6">
            برای شروع خرید، محصولات ما را بررسی کنید و عسل مورد علاقه‌تان را
            انتخاب نمایید.
          </p>
          <Button
            onClick={() => navigate("products")}
            className="bg-honey-gradient text-primary-foreground hover:opacity-90 h-12 px-8 text-base font-bold"
          >
            مشاهده محصولات
          </Button>
        </div>
      </div>
    );
  }

  // ===== Success step =====
  if (step === "success" && orderResult) {
    return (
      <div className="bg-cream-gradient min-h-[60vh] py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="p-8 md:p-10 text-center shadow-lg border-honey/30">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-honey-gradient flex items-center justify-center">
              <Check className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-honey-dark mb-3">
              سفارش شما با موفقیت ثبت شد!
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              از خرید شما سپاسگزاریم. اطلاعیه پرداخت شما برای مدیریت ارسال
              شد. پس از تأیید نهایی، کارشناسان ما با شما تماس خواهند گرفت و
              جزئیات ارسال را هماهنگ می‌کنند.
            </p>
            <div className="bg-muted/50 rounded-xl p-4 mb-6">
              <div className="text-sm text-muted-foreground mb-1">
                شماره سفارش شما
              </div>
              <div className="text-2xl font-extrabold text-honey-dark tracking-wider">
                {toPersianDigits(orderResult.orderNumber)}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                onClick={() => navigate("products")}
                className="bg-honey-gradient text-primary-foreground hover:opacity-90"
              >
                خرید بیشتر
              </Button>
              <Button variant="outline" onClick={() => navigate("home")}>
                بازگشت به خانه
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ===== Payment step =====
  if (step === "payment" && orderResult) {
    return (
      <div className="bg-cream-gradient min-h-[60vh] py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <Button
            variant="ghost"
            onClick={() => setStep("cart")}
            className="mb-4 text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4 ml-1" />
            بازگشت به سبد
          </Button>

          <h1 className="text-2xl md:text-3xl font-extrabold text-honey-dark mb-2">
            پرداخت سفارش
          </h1>
          <p className="text-muted-foreground mb-6">
            سفارش شما ثبت شد. لطفاً مبلغ نهایی را کارت‌به‌کارت کنید و سپس
            دکمه تأیید پرداخت را بزنید.
          </p>

          {/* Order number */}
          <Card className="p-5 mb-6 border-honey/30 bg-honey-light/10">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-sm text-muted-foreground">
                  شماره سفارش
                </div>
                <div className="text-xl font-extrabold text-honey-dark">
                  {toPersianDigits(orderResult.orderNumber)}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={copyOrderNumber}
                className="border-honey text-honey-dark hover:bg-honey hover:text-primary-foreground"
              >
                {orderCopied ? (
                  <Check className="w-4 h-4 ml-1" />
                ) : (
                  <Copy className="w-4 h-4 ml-1" />
                )}
                {orderCopied ? "کپی شد" : "کپی شماره سفارش"}
              </Button>
            </div>
          </Card>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Payment card */}
            <Card className="p-5 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-honey" />
                <h2 className="font-bold text-lg text-honey-dark">
                  اطلاعات پرداخت
                </h2>
              </div>

              <div className="rounded-xl bg-honey-dark text-primary-foreground p-5 mb-4">
                <div className="text-xs text-primary-foreground/70 mb-1">
                  شماره کارت (کارت‌به‌کارت)
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div
                    dir="ltr"
                    className="font-mono text-xl md:text-2xl tracking-wider"
                  >
                    {PAYMENT_CARD_NUMBER}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={copyCard}
                    className="bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground border-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 ml-1" />
                    ) : (
                      <Copy className="w-4 h-4 ml-1" />
                    )}
                    {copied ? "کپی شد" : "کپی"}
                  </Button>
                </div>
                <div className="text-sm text-primary-foreground/80 mt-2">
                  به نام: {PAYMENT_CARD_HOLDER}
                </div>
              </div>

              {/* Itemized breakdown */}
              <div className="space-y-3 text-sm">
                <div className="font-bold text-foreground mb-1">
                  ریز اقلام سفارش
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-2 py-2 border-b border-border/40 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground">
                          {item.productName}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {item.containerLabel}
                          {item.hasWax && " • با موم عسل"}
                          {" • "}
                          {toPersianDigits(item.quantity)} عدد
                          {" • "}
                          {toPersianDigits(item.containerSize * item.quantity)}{" "}
                          کیلو
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <div className="font-bold text-honey-dark">
                          {formatToman(item.unitPrice * item.quantity)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatToman(item.unitPrice)} ×{" "}
                          {toPersianDigits(item.quantity)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-muted-foreground pt-1">
                  <span>جمع کالاها</span>
                  <span>{formatToman(orderResult.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>مبلغ یکتای پیگیری</span>
                  <span className="text-honey-dark font-medium">
                    +{toPersianDigits(orderResult.uniqueAmount)} تومان
                  </span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between items-center bg-accent/50 rounded-lg p-3">
                  <div>
                    <div className="font-bold text-foreground">
                      مبلغ قابل پرداخت
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      به ریال: {formatRial(orderResult.finalAmount)}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="font-extrabold text-xl text-honey-dark">
                      {formatToman(orderResult.finalAmount)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-3 text-xs text-foreground/80">
                <ShieldCheck className="w-4 h-4 text-honey shrink-0 mt-0.5" />
                <span>
                  مبلغ{" "}
                  <b>{toPersianDigits(orderResult.uniqueAmount)} تومان</b>{" "}
                  به صورت یکتا به سفارش شما اضافه شده تا پرداخت شما در
                  صورتحساب بانکی سریعاً قابل پیگیری باشد. این مبلغ کمتر از{" "}
                  {toPersianDigits(1000)} تومان است.
                </span>
              </div>

              {orderResult.deliveryType !== "shahrekord" && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-xs text-foreground/80">
                  <Truck className="w-4 h-4 text-honey shrink-0 mt-0.5" />
                  <span>
                    هزینه پست برای شهر شما جدا از این مبلغ محاسبه می‌شود و
                    هنگام هماهنگی تلفنی به اطلاع شما خواهد رسید. در فاکتور
                    ذکر نمی‌گردد.
                  </span>
                </div>
              )}
            </Card>
          </div>

          {/* Steps */}
          <Card className="p-5 mt-5">
            <h3 className="font-bold mb-3 text-honey-dark">مراحل پرداخت:</h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-bold text-honey">۱.</span>
                مبلغ{" "}
                <b className="text-foreground">
                  {formatToman(orderResult.finalAmount)}
                </b>{" "}
                را به کارت بالا کارت‌به‌کارت کنید.
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-honey">۲.</span>
                پس از انجام تراکنش، دکمه «تأیید پرداخت» را بزنید.
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-honey">۳.</span>
                اطلاعیه پرداخت برای مدیریت ارسال می‌شود و پس از تأیید، با
                شما تماس گرفته می‌شود.
              </li>
            </ol>
          </Card>

          <Button
            onClick={confirmPayment}
            disabled={confirming}
            className="w-full mt-5 bg-honey-gradient text-primary-foreground hover:opacity-90 shadow-md h-14 text-base font-bold"
          >
            {confirming ? (
              <>
                <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                در حال ارسال...
              </>
            ) : (
              <>
                <Check className="w-5 h-5 ml-2" />
                تأیید پرداخت
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ===== Cart step =====
  const selectedProvince = PROVINCES.find((p) => p.name === province);

  return (
    <div className="bg-cream-gradient min-h-[60vh] py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-2xl md:text-3xl font-extrabold text-honey-dark mb-6 flex items-center gap-2">
          <ShoppingBasket className="w-7 h-7" />
          سبد خرید و ثبت سفارش
        </h1>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cart items + form */}
          <div className="lg:col-span-2 space-y-5">
            {/* Items */}
            <Card className="p-4 md:p-5">
              <h2 className="font-bold text-lg mb-4 text-honey-dark">
                اقلام سبد ({toPersianDigits(items.length)})
              </h2>
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 p-3 rounded-xl bg-muted/40 border border-border/50"
                  >
                    <img
                      src={item.image}
                      alt={item.productName}
                      className="w-16 h-16 rounded-lg object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-sm md:text-base text-honey-dark">
                            {item.productName}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {item.containerLabel}
                          </p>
                          {item.hasWax && (
                            <Badge className="mt-1 bg-honey-light/40 text-honey-dark border-0 text-[10px]">
                              با موم
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between mt-2 gap-2">
                        <div className="flex items-center gap-1 bg-background rounded-lg border">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </Button>
                          <span className="w-8 text-center font-bold text-sm">
                            {toPersianDigits(item.quantity)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <div className="text-left">
                          <div className="font-extrabold text-honey-dark text-sm">
                            {formatToman(item.unitPrice * item.quantity)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {formatToman(item.unitPrice)} ×{" "}
                            {toPersianDigits(item.quantity)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {bonus > 0 && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-honey-light/20 border border-honey/30 p-3">
                  <Gift className="w-5 h-5 text-honey-dark shrink-0" />
                  <span className="text-sm text-foreground">
                    🎁 هدیه شما:{" "}
                    <b className="text-honey-dark">
                      {toPersianDigits(bonus)} کیلو عسل
                    </b>{" "}
                    به همراه سفارش ارسال می‌شود!
                  </span>
                </div>
              )}
            </Card>

            {/* Customer info form */}
            <Card className="p-4 md:p-5">
              <h2 className="font-bold text-lg mb-4 text-honey-dark flex items-center gap-2">
                <User className="w-5 h-5" />
                اطلاعات مشتری
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">
                    نام و نام خانوادگی <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثلاً: علی رضایی"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">
                    شماره تماس <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="مثلاً: ۰۹۱۲۳۴۵۶۷۸۹"
                    dir="ltr"
                    inputMode="tel"
                  />
                </div>
              </div>
            </Card>

            {/* Delivery info */}
            <Card className="p-4 md:p-5">
              <h2 className="font-bold text-lg mb-4 text-honey-dark flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                محل تحویل
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>
                    استان <span className="text-destructive">*</span>
                  </Label>
                  <Select value={province} onValueChange={setProvince}>
                    <SelectTrigger>
                      <SelectValue placeholder="انتخاب استان" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {PROVINCES.map((p) => (
                        <SelectItem key={p.name} value={p.name}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>
                    شهر <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={city}
                    onValueChange={setCity}
                    disabled={!selectedProvince}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          selectedProvince
                            ? "انتخاب شهر"
                            : "ابتدا استان را انتخاب کنید"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {selectedProvince?.cities.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                <Label htmlFor="address">آدرس (اختیاری)</Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="آدرس کامل برای ارسال (در صورت نیاز)"
                  rows={2}
                />
              </div>
              <div className="mt-4 space-y-1.5">
                <Label htmlFor="notes">یادداشت (اختیاری)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="هر توضیح تکمیلی که لازم می‌دانید"
                  rows={2}
                />
              </div>

              {/* Delivery note */}
              {city && (
                <div
                  className={`mt-4 flex items-start gap-2 rounded-lg p-3 text-sm ${
                    isShahrekord
                      ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900"
                      : "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900"
                  }`}
                >
                  <Truck className="w-4 h-4 shrink-0 mt-0.5 text-honey" />
                  <span className="text-foreground/80">
                    {isShahrekord ? (
                      <>
                        ✅ تحویل در شهرکرد <b>رایگان</b> است. هزینه ارسال صفر
                        می‌باشد.
                      </>
                    ) : (
                      <>
                        ارسال به شهر شما از طریق پست انجام می‌شود. هزینه پست
                        جدا از فاکتور محاسبه و هنگام تماس تلفنی اعلام
                        می‌گردد.
                      </>
                    )}
                  </span>
                </div>
              )}
            </Card>
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <Card className="p-5 lg:sticky lg:top-24">
              <h2 className="font-bold text-lg mb-4 text-honey-dark">
                خلاصه سفارش
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>تعداد اقلام</span>
                  <span>{toPersianDigits(items.length)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>مجموع وزن</span>
                  <span>{toPersianDigits(totalKgVal)} کیلو</span>
                </div>
                {bonus > 0 && (
                  <div className="flex justify-between text-honey-dark">
                    <span className="flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5" />
                      هدیه
                    </span>
                    <span>{toPersianDigits(bonus)} کیلو عسل</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between items-center">
                  <span className="font-bold">مبلغ کل</span>
                  <span className="font-extrabold text-xl text-honey-dark">
                    {formatToman(subtotal)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground text-left mt-1">
                  معادل {formatRial(subtotal)}
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground leading-relaxed">
                💡 به ازای هر {toPersianDigits(BONUS_THRESHOLD_KG)} کیلو خرید
                غیرعمده، {toPersianDigits(BONUS_AMOUNT_KG)} کیلو عسل هدیه
                می‌گیرید. مبلغ یکتای پیگیری پس از ثبت سفارش نمایش داده
                می‌شود.
              </div>

              <Button
                onClick={submitOrder}
                disabled={submitting}
                className="w-full mt-4 bg-honey-gradient text-primary-foreground hover:opacity-90 shadow-md h-12 text-base font-bold"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                    در حال ثبت...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 ml-2" />
                    ثبت سفارش
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                onClick={() => navigate("products")}
                className="w-full mt-2 text-muted-foreground"
              >
                ادامه خرید
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
