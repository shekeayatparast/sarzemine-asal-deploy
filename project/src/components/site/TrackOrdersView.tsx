"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useNav } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Order,
  OrderItem,
} from "@prisma/client";
import {
  formatToman,
  formatRial,
  toPersianDigits,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STEPS,
  statusStepIndex,
  formatJalaliDateTime,
  formatJalaliTime,
} from "@/lib/format";
import {
  Search,
  Package,
  Loader2,
  CheckCircle2,
  Clock,
  PackageCheck,
  Truck,
  Home,
  XCircle,
  Copy,
  Check,
  ArrowLeft,
  RefreshCw,
  Mail,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

type OrderWithItems = Order & { items: OrderItem[] };

// Status icon + color mapping
const STATUS_STYLE: Record<
  string,
  { icon: any; color: string; bg: string }
> = {
  awaiting_payment: {
    icon: Clock,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-950/40",
  },
  paid: {
    icon: CheckCircle2,
    color: "text-honey-dark",
    bg: "bg-honey-light/40",
  },
  confirmed: {
    icon: PackageCheck,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-950/40",
  },
  preparing: {
    icon: Package,
    color: "text-honey-dark",
    bg: "bg-honey-light/40",
  },
  shipped: {
    icon: Mail,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-950/40",
  },
  delivered: {
    icon: Home,
    color: "text-green-700 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-950/40",
  },
  cancelled: {
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-950/40",
  },
};

function formatDate(d: Date | string): string {
  return formatJalaliDateTime(d);
}

function StatusTracker({ status }: { status: string }) {
  const idx = statusStepIndex(status);
  const isCancelled = status === "cancelled";

  if (isCancelled) {
    const style = STATUS_STYLE.cancelled;
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${style.bg} ${style.color}`}
      >
        <XCircle className="w-4 h-4" />
        {ORDER_STATUS_LABELS.cancelled}
      </div>
    );
  }

  if (idx < 0) {
    return (
      <Badge className="bg-muted text-foreground border-0">
        {ORDER_STATUS_LABELS[status] || status}
      </Badge>
    );
  }

  return (
    <div className="space-y-2">
      {/* Current status badge */}
      <div className="flex items-center gap-2 flex-wrap">
        {(() => {
          const style = STATUS_STYLE[status] || STATUS_STYLE.awaiting_payment;
          const Icon = style.icon;
          return (
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${style.bg} ${style.color}`}
            >
              <Icon className="w-4 h-4" />
              {ORDER_STATUS_LABELS[status]}
            </div>
          );
        })()}
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-1">
        {ORDER_STATUS_STEPS.map((step, i) => {
          const done = i <= idx;
          const isCurrent = i === idx;
          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                  done
                    ? "bg-honey-gradient text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                } ${isCurrent ? "ring-2 ring-honey ring-offset-2 ring-offset-background" : ""}`}
              >
                {toPersianDigits(i + 1)}
              </div>
              {i < ORDER_STATUS_STEPS.length - 1 && (
                <div
                  className={`h-1 flex-1 mx-0.5 rounded ${
                    i < idx ? "bg-honey" : "bg-muted"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground px-0.5">
        {ORDER_STATUS_STEPS.map((step) => (
          <span key={step} className="text-center w-12 leading-tight">
            {ORDER_STATUS_LABELS[step]}
          </span>
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: OrderWithItems }) {
  const [copied, setCopied] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const copyNumber = () => {
    navigator.clipboard.writeText(order.orderNumber);
    setCopied(true);
    toast.success("شماره سفارش کپی شد");
    setTimeout(() => setCopied(false), 2000);
  };
  const copyTracking = () => {
    if (!order.trackingCode) return;
    navigator.clipboard.writeText(order.trackingCode);
    setCopiedTracking(true);
    toast.success("کد رهگیری کپی شد");
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  // Show the tracking code section when the order is shipped or delivered AND
  // a tracking code is present.
  const showTracking =
    order.trackingCode &&
    ["shipped", "delivered"].includes(order.orderStatus);
  // Iran Post tracking URL — opens in new tab so the customer stays on our site
  const postTrackingUrl = order.trackingCode
    ? `https://tracking.post.ir`
    : null;

  return (
    <Card className="p-5 border-border/60 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-muted-foreground">شماره سفارش:</span>
            <span className="font-extrabold text-honey-dark">
              {toPersianDigits(order.orderNumber)}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="w-7 h-7 text-muted-foreground hover:text-honey-dark"
              onClick={copyNumber}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDate(order.createdAt)}
          </div>
        </div>
        <div className="text-left">
          <div className="text-xs text-muted-foreground">مبلغ نهایی</div>
          <div className="font-extrabold text-honey-dark">
            {formatToman(order.finalAmount)}
          </div>
        </div>
      </div>

      <Separator className="mb-4" />

      {/* Status tracker */}
      <StatusTracker status={order.orderStatus} />

      {/* Post tracking section — shown when shipped/delivered with a tracking code */}
      {showTracking && (
        <div className="mt-4 rounded-xl border-2 border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-blue-700 dark:text-blue-300">
              کد رهگیری پستی
            </h3>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <code
              dir="ltr"
              className="flex-1 bg-white dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2 text-base font-bold text-blue-700 dark:text-blue-300 select-all text-center tracking-wider"
            >
              {toPersianDigits(order.trackingCode!)}
            </code>
            <Button
              size="icon"
              variant="outline"
              className="shrink-0 border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/50"
              onClick={copyTracking}
              title="کپی کد رهگیری"
            >
              {copiedTracking ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-300 mb-3 leading-relaxed">
            📦 بسته شما به پست تحویل داده شده است. می‌توانید وضعیت لحظه‌ای
            بسته را از طریق کد رهگیری فوق در سامانه رسمی شرکت پست جمهوری
            اسلامی ایران پیگیری کنید.
          </p>
          {postTrackingUrl && (
            <a
              href={postTrackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg py-2.5 px-4 transition-colors text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              پیگیری در سامانه پست
            </a>
          )}
        </div>
      )}

      {/* Items */}
      <div className="mt-4 space-y-2">
        <div className="text-xs font-bold text-muted-foreground">
          اقلام سفارش
        </div>
        {order.items.map((item) => (
          <div
            key={item.id}
            className="flex justify-between gap-2 text-sm py-1.5 border-b border-border/30 last:border-0"
          >
            <div className="flex-1 min-w-0">
              <span className="font-medium">{item.productName}</span>
              <span className="text-muted-foreground text-xs mr-2">
                • {toPersianDigits(item.containerSize)} کیلو
                {item.hasWax && " • با موم عسل"}
                {" • "}
                {toPersianDigits(item.quantity)} عدد
              </span>
            </div>
            <span className="text-honey-dark font-medium shrink-0">
              {formatToman(item.total)}
            </span>
          </div>
        ))}
      </div>

      <Separator className="my-3" />

      {/* Delivery + total */}
      <div className="flex justify-between items-center text-sm">
        <div className="text-muted-foreground">
          {order.deliveryType === "shahrekord"
            ? "تحویل در شهرکرد"
            : `ارسال به ${order.city}`}
        </div>
        <div className="text-xs text-muted-foreground">
          معادل {formatRial(order.finalAmount)}
        </div>
      </div>
    </Card>
  );
}

export function TrackOrdersView({
  initialOrderNumber,
  initialPhone,
}: {
  initialOrderNumber?: string;
  initialPhone?: string;
} = {}) {
  const { navigate } = useNav();
  const [phone, setPhone] = useState(initialPhone || "");
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber || "");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searched, setSearched] = useState(false);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSearchedRef = useRef(false);

  // Build the search params from current inputs (with cache-buster).
  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (orderNumber.trim()) params.set("orderNumber", orderNumber.trim());
    if (phone.trim()) params.set("phone", phone.trim());
    // Cache-buster: forces the browser to always hit the network
    params.set("_t", String(Date.now()));
    return params;
  }, [orderNumber, phone]);

  // Core fetch — `silent` controls loading spinner + toast (used for polling).
  const doSearch = useCallback(
    async (silent: boolean) => {
      if (!phone.trim() && !orderNumber.trim()) {
        if (!silent) toast.error("شماره تماس یا شماره سفارش را وارد کنید");
        return;
      }
      if (silent) setRefreshing(true);
      else setLoading(true);
      setSearched(true);
      try {
        const params = buildParams();
        // cache: 'no-store' guarantees a fresh network request every time
        const res = await fetch(`/api/orders/track?${params}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        const newOrders: OrderWithItems[] = data.orders || [];

        if (silent) {
          // Compare snapshot — only update if something changed (avoid flicker)
          const snap = (arr: OrderWithItems[]) =>
            JSON.stringify(
              arr.map((o) => ({
                n: o.orderNumber,
                s: o.orderStatus,
                p: o.paymentStatus,
                u: o.updatedAt,
              }))
            );
          if (snap(orders) !== snap(newOrders)) {
            setOrders(newOrders);
            setLastUpdated(new Date());
            toast.success("وضعیت سفارش شما به‌روزرسانی شد", {
              description: "تغییرات جدید نمایش داده شد",
            });
          }
        } else {
          setOrders(newOrders);
          setLastUpdated(new Date());
          if (newOrders.length === 0) {
            toast.info("سفارشی با این اطلاعات یافت نشد");
          } else {
            toast.success(`${toPersianDigits(newOrders.length)} سفارش یافت شد`);
          }
        }
      } catch (e: any) {
        if (!silent) {
          toast.error(e.message || "خطا در پیگیری سفارش");
          setOrders([]);
        }
      } finally {
        if (silent) setRefreshing(false);
        else setLoading(false);
      }
    },
    [buildParams, phone, orderNumber, orders]
  );

  const search = () => doSearch(false);
  const refresh = () => doSearch(true);

  // Auto-search on mount if initial values were passed (e.g. /track?orderNumber=HN-12345)
  useEffect(() => {
    if (autoSearchedRef.current) return;
    if ((initialOrderNumber || "").trim() || (initialPhone || "").trim()) {
      autoSearchedRef.current = true;
      doSearch(false);
    }
  }, []);

  // Auto-poll every 15 seconds while results are displayed so the customer
  // sees admin status changes in real time without manually re-searching.
  useEffect(() => {
    if (!searched || orders.length === 0) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    pollRef.current = setInterval(() => {
      doSearch(true);
    }, 15000);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [searched, orders.length, doSearch]);

  return (
    <div className="bg-cream-gradient min-h-[60vh]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-honey-dark text-primary-foreground py-14 md:py-20">
        <div className="absolute inset-0 opacity-20">
          <img
            src="/images/honeycomb-texture.png"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative container mx-auto px-4 text-center">
          <Badge className="bg-honey-light/30 text-primary-foreground border-0 mb-4">
            پیگیری سفارش
          </Badge>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3 drop-shadow">
            وضعیت سفارش خود را بررسی کنید
          </h1>
          <p className="text-primary-foreground/90 max-w-xl mx-auto">
            با وارد کردن شماره تماس یا شماره سفارش، می‌توانید وضعیت سفارش‌های
            خود را مشاهده کنید.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10 md:py-14 max-w-3xl">
        {/* Search form */}
        <Card className="p-5 md:p-6 mb-6 shadow-sm">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="track-phone">شماره تماس</Label>
              <Input
                id="track-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="شماره‌ای که هنگام سفارش وارد کرده‌اید"
                dir="ltr"
                inputMode="tel"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px bg-border flex-1" />
              <span className="text-xs text-muted-foreground">یا</span>
              <div className="h-px bg-border flex-1" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="track-order">شماره سفارش</Label>
              <Input
                id="track-order"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="مثلاً: 12345 یا HN-12345"
                dir="ltr"
              />
            </div>

            <Button
              onClick={search}
              disabled={loading}
              className="w-full bg-honey-gradient text-primary-foreground hover:opacity-90 shadow-md h-12 text-base font-bold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                  در حال جستجو...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5 ml-2" />
                  پیگیری سفارش
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Results */}
        {searched && !loading && (
          <div className="space-y-4">
            {/* Live status bar — auto-refresh indicator + manual refresh button */}
            {orders.length > 0 && (
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground bg-honey-light/15 border border-honey/20 rounded-lg px-3 py-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-600"></span>
                  </span>
                  <span className="shrink-0">به‌روزرسانی خودکار هر ۱۵ ثانیه</span>
                  {lastUpdated && (
                    <span className="text-muted-foreground/70 truncate">
                      • آخرین به‌روزرسانی:{" "}
                      {formatJalaliTime(lastUpdated)}
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={refresh}
                  disabled={refreshing}
                  className="h-7 px-2 text-xs text-honey-dark hover:bg-honey-light/30 shrink-0"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ml-1 ${refreshing ? "animate-spin" : ""}`}
                  />
                  به‌روزرسانی
                </Button>
              </div>
            )}
            {orders.length === 0 ? (
              <Card className="p-8 text-center">
                <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  سفارشی با این اطلاعات یافت نشد.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  لطفاً شماره تماس یا شماره سفارش را بررسی کنید.
                </p>
              </Card>
            ) : (
              orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))
            )}
          </div>
        )}

        {/* Helper note */}
        {!searched && (
          <Card className="p-5 bg-honey-light/15 border-honey/30">
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-honey-dark shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground leading-relaxed">
                <p className="font-bold text-honey-dark mb-1">
                  راهنمای پیگیری
                </p>
                <p>
                  پس از ثبت سفارش، شماره سفارش به شما نمایش داده می‌شود. با
                  وارد کردن شماره تماس، تمام سفارش‌های شما نمایش داده
                  می‌شود. وضعیت سفارش توسط مدیریت به‌روزرسانی می‌شود.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => {
                    const style = STATUS_STYLE[key] || {};
                    return (
                      <span
                        key={key}
                        className={`text-xs px-2 py-1 rounded-full ${style.bg || "bg-muted"} ${style.color || "text-muted-foreground"}`}
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* CTA */}
        <div className="mt-8 text-center">
          <Button
            variant="outline"
            onClick={() => navigate("products")}
            className="border-honey text-honey-dark hover:bg-honey hover:text-primary-foreground"
          >
            <ArrowLeft className="w-4 h-4 ml-1" />
            ادامه خرید
          </Button>
        </div>
      </div>
    </div>
  );
}
