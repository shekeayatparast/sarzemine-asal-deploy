"use client";

// AdminOrderDetail — interactive status management for admins.
//
// Receives the order (with items + agent relations) as a plain JSON-serializable
// shape from the parent server component. Lets the admin:
//   • change order status via a Select
//   • enter a tracking code (required when status → "shipped")
//   • apply the new status with a PATCH to /api/admin/orders/[id]
//   • cancel the order (red, with confirm dialog)
// Toast feedback on success / error, full page reload after success.

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/agent/OrderStatusBadge";
import { CopyButton } from "@/components/agent/CopyButton";
import {
  toPersianDigits,
  formatToman,
  formatRial,
  formatJalaliDateTime,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STEPS,
  statusStepIndex,
} from "@/lib/format";
import {
  PAYMENT_CARD_NUMBER,
  PAYMENT_CARD_HOLDER,
  CONTACT_PHONE_RAW,
} from "@/lib/products";
import {
  ArrowRight,
  Truck,
  CreditCard,
  Hash,
  Package,
  Clock,
  CheckCircle2,
  PackageCheck,
  Mail,
  Home,
  XCircle,
  ExternalLink,
  MapPin,
  User,
  Store,
  Phone,
  CalendarClock,
  Save,
  Loader2,
  XOctagon,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Types ───────────────────────────────────────────────────────────────
// Mirrors the Prisma shape (minus Date objects → ISO strings) for the
// fields we actually use. Kept inline to avoid leaking Prisma types into
// client code.

export interface AdminOrderItem {
  id: string;
  productId: string;
  productName: string;
  containerSize: number;
  hasWax: boolean;
  isWholesale: boolean;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface AdminOrderAgent {
  id: string;
  name: string;
  storeName: string;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  province: string;
  city: string;
  address: string | null;
  totalAmount: number;
  uniqueAmount: number;
  finalAmount: number;
  paymentStatus: string;
  orderStatus: string;
  deliveryType: string;
  trackingCode: string | null;
  notes: string | null;
  orderType: string; // "customer" | "agent"
  agentId: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  items: AdminOrderItem[];
  agent: AdminOrderAgent | null;
}

interface AdminOrderDetailProps {
  order: AdminOrder;
}

// ── Status icon + color mapping (matches the agent page) ──────────────────
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
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-100 dark:bg-sky-950/40",
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

function StatusTracker({ status }: { status: string }) {
  const idx = statusStepIndex(status);
  const isCancelled = status === "cancelled";

  if (isCancelled) {
    const style = STATUS_STYLE.cancelled;
    const Icon = style.icon;
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold",
          style.bg,
          style.color
        )}
      >
        <Icon className="w-4 h-4" />
        {ORDER_STATUS_LABELS.cancelled}
      </div>
    );
  }

  if (idx < 0) {
    return <OrderStatusBadge status={status} />;
  }

  const currentStyle = STATUS_STYLE[status] || STATUS_STYLE.awaiting_payment;
  const CurrentIcon = currentStyle.icon;

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold",
          currentStyle.bg,
          currentStyle.color
        )}
      >
        <CurrentIcon className="w-4 h-4" />
        {ORDER_STATUS_LABELS[status]}
      </div>

      <div className="flex items-center gap-1" dir="ltr">
        {ORDER_STATUS_STEPS.map((step, i) => {
          const done = i <= idx;
          const isCurrent = i === idx;
          return (
            <div
              key={step}
              className="flex items-center flex-1 last:flex-none"
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors",
                  done
                    ? "bg-honey-gradient text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                  isCurrent &&
                    "ring-2 ring-honey ring-offset-2 ring-offset-background"
                )}
              >
                {toPersianDigits(i + 1)}
              </div>
              {i < ORDER_STATUS_STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-1 flex-1 mx-0.5 rounded",
                    i < idx ? "bg-honey" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      <div
        className="flex justify-between text-[9px] text-muted-foreground px-0.5"
        dir="rtl"
      >
        {ORDER_STATUS_STEPS.map((step) => (
          <span key={step} className="text-center w-12 leading-tight">
            {ORDER_STATUS_LABELS[step]}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────
export function AdminOrderDetail({ order }: AdminOrderDetailProps) {
  const isCancelled = order.orderStatus === "cancelled";

  // Status management state
  const [selectedStatus, setSelectedStatus] = useState<string>(
    order.orderStatus
  );
  const [trackingCode, setTrackingCode] = useState<string>(
    order.trackingCode ?? ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // What statuses are legal next-steps from the current one?
  // Going forward in the pipeline is allowed; "cancelled" is always allowed.
  const currentIdx = statusStepIndex(order.orderStatus);
  const availableNextStatuses = useMemo(() => {
    const out: { value: string; label: string; disabled: boolean }[] = [];
    for (const s of ORDER_STATUS_STEPS) {
      const idx = statusStepIndex(s);
      const isCurrent = s === order.orderStatus;
      const isBackwards = currentIdx >= 0 && idx < currentIdx;
      out.push({
        value: s,
        label: `${ORDER_STATUS_LABELS[s]}${isCurrent ? " (فعلی)" : ""}`,
        disabled: isBackwards, // can't go backwards in pipeline
      });
    }
    // cancelled only available as a separate button (kept out of the Select)
    return out;
  }, [order.orderStatus, currentIdx]);

  const isShippedSelected = selectedStatus === "shipped";
  const needsTracking = isShippedSelected && !order.trackingCode;

  const hasStatusChange =
    !isCancelled &&
    (selectedStatus !== order.orderStatus ||
      (isShippedSelected && trackingCode && trackingCode !== (order.trackingCode ?? "")));

  // ── Apply new status ──
  const handleApplyStatus = async () => {
    if (selectedStatus === order.orderStatus && !needsTracking && !trackingCode) {
      toast.info("وضعیت جدیدی برای اعمال انتخاب نشده است.");
      return;
    }
    if (needsTracking && !trackingCode.trim()) {
      toast.error("برای تحویل به پست، کد رهگیری الزامی است.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderStatus: selectedStatus,
          trackingCode: trackingCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "اعمال وضعیت ناموفق بود.");
        return;
      }
      toast.success(data?.message || "وضعیت سفارش به‌روزرسانی شد.");
      // Use full-page reload (more reliable than router.refresh)
      window.location.reload();
    } catch (err) {
      console.error("[AdminOrderDetail] apply status error:", err);
      toast.error("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Cancel order ──
  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancel: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "لغو سفارش ناموفق بود.");
        return;
      }
      toast.success(data?.message || "سفارش لغو شد.");
      window.location.reload();
    } catch (err) {
      console.error("[AdminOrderDetail] cancel error:", err);
      toast.error("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setCancelling(false);
    }
  };

  const isPaymentPending = order.paymentStatus !== "confirmed";
  const showTracking =
    order.trackingCode &&
    ["shipped", "delivered"].includes(order.orderStatus);

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-1">
            <Link href="/admin/orders">
              <ArrowRight className="w-4 h-4 ml-1" />
              بازگشت به سفارش‌ها
            </Link>
          </Button>
          <h1 className="text-2xl font-extrabold text-honey-dark flex items-center gap-2">
            جزئیات سفارش
          </h1>
        </div>
      </div>

      {/* Order header card */}
      <Card className="p-5 gap-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Hash className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">شماره سفارش:</span>
              <span className="font-extrabold text-honey-dark text-lg">
                {order.orderNumber}
              </span>
              <CopyButton value={order.orderNumber} label="شماره سفارش کپی شد" />
              {order.orderType === "agent" ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700">
                  سفارش نماینده
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border">
                  سفارش مشتری
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarClock className="w-3.5 h-3.5" />
              <span>ساخته‌شده: {formatJalaliDateTime(order.createdAt)}</span>
              <span className="text-muted-foreground/60">•</span>
              <span>آخرین به‌روزرسانی: {formatJalaliDateTime(order.updatedAt)}</span>
            </div>
          </div>
          <div className="text-left">
            <div className="text-xs text-muted-foreground">مبلغ نهایی</div>
            <div className="font-extrabold text-honey-dark text-xl">
              {formatToman(order.finalAmount)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              معادل {formatRial(order.finalAmount)}
            </div>
          </div>
        </div>

        <div className="h-px bg-border" />

        <StatusTracker status={order.orderStatus} />
      </Card>

      {/* Status management card — the KEY feature */}
      {!isCancelled ? (
        <Card className="p-5 gap-4 border-2 border-honey/40 bg-honey-light/10">
          <CardHeader className="px-0">
            <CardTitle className="text-base font-bold text-honey-dark flex items-center gap-2">
              <Save className="w-5 h-5" />
              مدیریت وضعیت سفارش
            </CardTitle>
            <CardDescription>
              وضعیت فعلی: <OrderStatusBadge status={order.orderStatus} />
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status select */}
              <div className="space-y-2">
                <Label htmlFor="status-select" className="text-sm font-medium">
                  وضعیت جدید
                </Label>
                <Select
                  value={selectedStatus}
                  onValueChange={(v) => setSelectedStatus(v)}
                >
                  <SelectTrigger id="status-select" className="w-full">
                    <SelectValue placeholder="انتخاب وضعیت جدید" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableNextStatuses.map((s) => (
                      <SelectItem
                        key={s.value}
                        value={s.value}
                        disabled={s.disabled}
                      >
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  بازگشت به وضعیت قبلی مجاز نیست. برای لغو، از دکمهٔ قرمز پایین
                  استفاده کنید.
                </p>
              </div>

              {/* Tracking code input (always visible, prefilled if exists) */}
              <div className="space-y-2">
                <Label htmlFor="tracking-input" className="text-sm font-medium">
                  کد رهگیری پستی{" "}
                  {isShippedSelected && (
                    <span className="text-red-600 font-bold">*</span>
                  )}
                </Label>
                <Input
                  id="tracking-input"
                  dir="ltr"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder={order.trackingCode ? order.trackingCode : "مثال: ۱۲۳۴۵۶۷۸۹۰۱۲۳۴"}
                  className="tracking-wider"
                />
                <p className="text-[11px] text-muted-foreground">
                  هنگام انتقال به «تحویل به پست» این فیلد اجباری است.
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
              <Button
                type="button"
                onClick={handleApplyStatus}
                disabled={submitting || !hasStatusChange}
                className="bg-honey-gradient text-primary-foreground hover:opacity-90"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                    در حال اعمال...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 ml-1" />
                    اعمال وضعیت جدید
                  </>
                )}
              </Button>

              {/* Cancel order with confirm dialog */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={cancelling}
                  >
                    {cancelling ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                        در حال لغو...
                      </>
                    ) : (
                      <>
                        <XOctagon className="w-4 h-4 ml-1" />
                        لغو سفارش
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>لغو این سفارش؟</AlertDialogTitle>
                    <AlertDialogDescription>
                      این عملیات قابل بازگشت نیست. سفارش{" "}
                      <b>{order.orderNumber}</b> به حالت «لغو شد» در می‌آید و
                      امکان بازگرداندن آن به فرآیند وجود نخواهد داشت.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={cancelling}>
                      انصراف
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancel}
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      بله، لغو شود
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-5 gap-3 border-2 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
          <CardHeader className="px-0">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-red-700 dark:text-red-300">
              <XCircle className="w-5 h-5" />
              سفارش لغو شده
            </CardTitle>
            <CardDescription className="text-red-700/80 dark:text-red-300/80">
              این سفارش لغو شده و دیگر قابل تغییر نیست.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Customer / Agent info card */}
      <Card className="p-5 gap-3">
        <CardHeader className="px-0">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            {order.orderType === "agent" ? (
              <>
                <Store className="w-5 h-5 text-honey-dark" />
                اطلاعات نماینده
              </>
            ) : (
              <>
                <User className="w-5 h-5 text-honey-dark" />
                اطلاعات مشتری
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 space-y-2 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">نام</span>
              <span className="font-bold">{order.customerName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">شماره تماس</span>
              <a
                href={`tel:${order.customerPhone}`}
                dir="ltr"
                className="font-bold text-honey-dark hover:underline inline-flex items-center gap-1"
              >
                <Phone className="w-3.5 h-3.5" />
                {toPersianDigits(order.customerPhone)}
              </a>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">استان</span>
              <span className="font-bold">{order.province}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">شهر</span>
              <span className="font-bold">{order.city}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">روش ارسال</span>
              <span className="font-bold inline-flex items-center gap-1">
                <Truck className="w-4 h-4" />
                {order.deliveryType === "shahrekord"
                  ? "تحویل در شهرکرد (رایگان)"
                  : "ارسال پستی"}
              </span>
            </div>
            {order.orderType === "agent" && order.agent && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">فروشگاه</span>
                <span className="font-bold">{order.agent.storeName}</span>
              </div>
            )}
          </div>
          {order.address && (
            <div className="pt-2 border-t">
              <p className="text-muted-foreground mb-1 inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                آدرس:
              </p>
              <p className="font-medium leading-relaxed">{order.address}</p>
            </div>
          )}
          {order.orderType === "agent" && order.agent && (
            <div className="pt-2 border-t">
              <Button asChild size="sm" variant="outline">
                <Link href={`/admin/agents/${order.agent.id}`}>
                  <Store className="w-4 h-4 ml-1" />
                  صفحهٔ نماینده
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items table */}
      <Card className="p-0 gap-0 overflow-hidden">
        <CardHeader className="p-4 border-b">
          <CardTitle className="text-base">اقلام سفارش</CardTitle>
          <CardDescription>
            {toPersianDigits(order.items.length)} قلم کالا
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>محصول</TableHead>
                <TableHead>ظرف</TableHead>
                <TableHead>موم</TableHead>
                <TableHead>تعداد</TableHead>
                <TableHead>قیمت واحد</TableHead>
                <TableHead>جمع</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-bold">
                    {item.productName}
                  </TableCell>
                  <TableCell>
                    {toPersianDigits(item.containerSize)} کیلو
                    {item.isWholesale && (
                      <span className="text-[10px] text-muted-foreground block">
                        عمده
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.hasWax ? (
                      <span className="text-honey-dark">دارد</span>
                    ) : (
                      <span className="text-muted-foreground">ندارد</span>
                    )}
                  </TableCell>
                  <TableCell>{toPersianDigits(item.quantity)}</TableCell>
                  <TableCell dir="ltr" className="whitespace-nowrap text-left">
                    {formatToman(item.unitPrice)}
                  </TableCell>
                  <TableCell
                    dir="ltr"
                    className="font-bold text-honey-dark whitespace-nowrap text-left"
                  >
                    {formatToman(item.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Financial summary + payment info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Financial summary */}
        <Card className="p-5 gap-3">
          <CardHeader className="px-0">
            <CardTitle className="text-base">جزئیات مالی</CardTitle>
          </CardHeader>
          <CardContent className="px-0 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">مبلغ کالاها</span>
              <span className="font-bold" dir="ltr">
                {formatToman(order.totalAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">کد یکتا</span>
              <span className="font-bold text-honey-dark" dir="ltr">
                +{toPersianDigits(order.uniqueAmount)} تومان
              </span>
            </div>
            <div className="h-px bg-border my-1" />
            <div className="flex justify-between items-center">
              <span className="font-bold">مبلغ قابل پرداخت</span>
              <span className="font-extrabold text-lg text-honey-dark" dir="ltr">
                {formatToman(order.finalAmount)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">وضعیت پرداخت</span>
              <PaymentStatusBadge status={order.paymentStatus} />
            </div>
          </CardContent>
        </Card>

        {/* Payment instructions (only if awaiting payment) */}
        {isPaymentPending && !isCancelled ? (
          <Card className="p-5 gap-3 border-2 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
            <CardHeader className="px-0">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-amber-700 dark:text-amber-300">
                <CreditCard className="w-5 h-5" />
                دستورالعمل پرداخت
              </CardTitle>
              <CardDescription className="text-amber-700/80 dark:text-amber-300/80">
                برای تأیید سفارش، مبلغ زیر را به کارت زیر واریز کنید.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl bg-white dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    شماره کارت
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <code
                      dir="ltr"
                      className="text-sm font-bold text-amber-700 dark:text-amber-300 tracking-wider"
                    >
                      {toPersianDigits(PAYMENT_CARD_NUMBER)}
                    </code>
                    <CopyButton
                      value={PAYMENT_CARD_NUMBER.replace(/\s/g, "")}
                      label="شماره کارت کپی شد"
                    />
                  </div>
                </div>
                <div className="rounded-xl bg-white dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    صاحب حساب
                  </p>
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                    {PAYMENT_CARD_HOLDER}
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-honey-gradient text-primary-foreground p-3 text-center">
                <p className="text-xs opacity-90 mb-1">مبلغ قابل پرداخت</p>
                <p className="text-xl font-extrabold" dir="ltr">
                  {formatToman(order.finalAmount)}
                </p>
                <p className="text-[10px] opacity-80 mt-1">
                  (شامل {toPersianDigits(order.uniqueAmount)} تومان کد یکتا برای
                  شناسایی)
                </p>
              </div>
              <div className="rounded-lg bg-amber-100 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                <p className="font-bold mb-1">پس از واریز:</p>
                <p>
                  برای تسریع در تأیید پرداخت، فیش واریزی را به شماره{" "}
                  <b dir="ltr">{toPersianDigits(CONTACT_PHONE_RAW)}</b> در واتساپ
                  یا تلگرام ارسال کنید. شماره سفارش{" "}
                  <b>{order.orderNumber}</b> را یادآوری کنید.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          // When payment is confirmed (or cancelled) show a smaller card with the
          // payment status + contact phone, so the layout stays as a 2-col grid.
          <Card className="p-5 gap-3">
            <CardHeader className="px-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="w-5 h-5 text-honey-dark" />
                پشتیبانی
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">شماره پشتیبانی</span>
                <a
                  href={`tel:${CONTACT_PHONE_RAW}`}
                  dir="ltr"
                  className="font-bold text-honey-dark hover:underline"
                >
                  {toPersianDigits(CONTACT_PHONE_RAW)}
                </a>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">شماره کارت پرداخت</span>
                <code
                  dir="ltr"
                  className="text-sm font-bold tracking-wider"
                >
                  {toPersianDigits(PAYMENT_CARD_NUMBER)}
                </code>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">صاحب حساب</span>
                <span className="font-bold">{PAYMENT_CARD_HOLDER}</span>
              </div>
              <p className="text-[11px] text-muted-foreground pt-2 border-t">
                پرداخت این سفارش تأیید شده است. در صورت نیاز با شماره پشتیبانی
                تماس بگیرید.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tracking info card (if shipped/delivered) */}
      {showTracking && (
        <Card className="p-5 gap-3 border-2 border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/20">
          <CardHeader className="px-0">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-sky-700 dark:text-sky-300">
              <Mail className="w-5 h-5" />
              کد رهگیری پستی
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 space-y-3">
            <div className="flex items-center gap-2">
              <code
                dir="ltr"
                className="flex-1 bg-white dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-lg px-3 py-2 text-base font-bold text-sky-700 dark:text-sky-300 select-all text-center tracking-wider"
              >
                {toPersianDigits(order.trackingCode!)}
              </code>
              <CopyButton
                value={order.trackingCode!}
                label="کد رهگیری کپی شد"
              />
            </div>
            <a
              href="https://tracking.post.ir"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg py-2.5 px-4 transition-colors text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              پیگیری در سامانه پست
            </a>
          </CardContent>
        </Card>
      )}

      {/* Notes (if any) */}
      {order.notes && (
        <Card className="p-5 gap-3 border-dashed">
          <CardHeader className="px-0">
            <CardTitle className="text-base">یادداشت سفارش</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <p className="text-sm font-medium italic leading-relaxed">
              {order.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Footer actions */}
      <div className="flex flex-wrap gap-2 justify-between">
        <Button asChild variant="outline">
          <Link href="/admin/orders">
            <ArrowRight className="w-4 h-4 ml-1" />
            سفارش‌های دیگر
          </Link>
        </Button>
        {order.orderType === "agent" && order.agent && (
          <Button asChild className="bg-honey-gradient text-primary-foreground">
            <Link href={`/admin/agents/${order.agent.id}`}>
              <Store className="w-4 h-4 ml-1" />
              صفحهٔ نماینده
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
