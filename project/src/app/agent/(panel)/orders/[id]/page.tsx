import { redirect } from "next/navigation";
import { getCurrentAgent } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
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
  MapPin,
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
} from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Status icon + color mapping (matches the customer site)
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
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold",
          style.bg,
          style.color
        )}
      >
        <XCircle className="w-4 h-4" />
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

export default async function AgentOrderDetailPage({
  params,
}: PageProps) {
  const user = await getCurrentAgent();
  if (!user) redirect("/agent/login");

  const { id } = await params;

  const order = await db.order.findFirst({
    where: { id, agentId: user.id },
    include: { items: true },
  });

  if (!order) {
    notFound();
  }

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
            <Link href="/agent/orders">
              <ArrowRight className="w-4 h-4 ml-1" />
              بازگشت به سفارش‌ها
            </Link>
          </Button>
          <h1 className="text-2xl font-extrabold text-honey-dark flex items-center gap-2">
            جزئیات سفارش
          </h1>
        </div>
      </div>

      {/* Order summary card */}
      <Card className="p-5 gap-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Hash className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                شماره سفارش:
              </span>
              <span className="font-extrabold text-honey-dark text-lg">
                {order.orderNumber}
              </span>
              <CopyButton value={order.orderNumber} label="شماره سفارش کپی شد" />
            </div>
            <div className="text-xs text-muted-foreground">
              {formatJalaliDateTime(order.createdAt)}
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

      {/* Payment instructions (if pending) */}
      {isPaymentPending && order.orderStatus !== "cancelled" && (
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
              <div className="rounded-xl bg-white dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4">
                <p className="text-xs text-muted-foreground mb-1">
                  شماره کارت
                </p>
                <div className="flex items-center justify-between gap-2">
                  <code
                    dir="ltr"
                    className="text-base font-bold text-amber-700 dark:text-amber-300 tracking-wider"
                  >
                    {toPersianDigits(PAYMENT_CARD_NUMBER)}
                  </code>
                  <CopyButton
                    value={PAYMENT_CARD_NUMBER.replace(/\s/g, "")}
                    label="شماره کارت کپی شد"
                  />
                </div>
              </div>
              <div className="rounded-xl bg-white dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4">
                <p className="text-xs text-muted-foreground mb-1">
                  صاحب حساب
                </p>
                <p className="text-base font-bold text-amber-700 dark:text-amber-300">
                  {PAYMENT_CARD_HOLDER}
                </p>
              </div>
            </div>
            <div className="rounded-xl bg-honey-gradient text-primary-foreground p-4 text-center">
              <p className="text-sm opacity-90 mb-1">مبلغ قابل پرداخت</p>
              <p className="text-2xl font-extrabold">
                {formatToman(order.finalAmount)}
              </p>
              <p className="text-xs opacity-80 mt-1">
                (شامل {toPersianDigits(order.uniqueAmount)} تومان کد یکتا برای
                شناسایی)
              </p>
            </div>
            <div className="rounded-lg bg-amber-100 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
              <p className="font-bold mb-1">پس از واریز:</p>
              <p>
                برای تسریع در تأیید پرداخت، فیش واریزی را به شماره{" "}
                <b dir="ltr">{toPersianDigits(CONTACT_PHONE_RAW)}</b> در واتساپ
                یا تلگرام ارسال کنید یا در صورت تماس اطلاع دهید. شماره سفارش{" "}
                <b>{order.orderNumber}</b> را یادآوری کنید.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tracking code (if shipped) */}
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
                  <TableCell>{formatToman(item.unitPrice)}</TableCell>
                  <TableCell className="font-bold text-honey-dark">
                    {formatToman(item.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Totals + delivery info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Totals */}
        <Card className="p-5 gap-3">
          <CardHeader className="px-0">
            <CardTitle className="text-base">جزئیات مالی</CardTitle>
          </CardHeader>
          <CardContent className="px-0 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">مبلغ کالاها</span>
              <span className="font-bold">
                {formatToman(order.totalAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">کد یکتا</span>
              <span className="font-bold text-honey-dark">
                +{toPersianDigits(order.uniqueAmount)} تومان
              </span>
            </div>
            <div className="h-px bg-border my-1" />
            <div className="flex justify-between items-center">
              <span className="font-bold">مبلغ قابل پرداخت</span>
              <span className="font-extrabold text-lg text-honey-dark">
                {formatToman(order.finalAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">پرداخت</span>
              <PaymentStatusBadge status={order.paymentStatus} />
            </div>
          </CardContent>
        </Card>

        {/* Delivery info */}
        <Card className="p-5 gap-3">
          <CardHeader className="px-0">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-5 h-5 text-honey-dark" />
              اطلاعات تحویل
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">استان</span>
              <span className="font-bold">{order.province}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">شهر</span>
              <span className="font-bold">{order.city}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">روش ارسال</span>
              <span className="font-bold flex items-center gap-1">
                <Truck className="w-4 h-4" />
                {order.deliveryType === "shahrekord"
                  ? "تحویل در شهرکرد (رایگان)"
                  : "ارسال پستی"}
              </span>
            </div>
            {order.address && (
              <div className="pt-2 border-t">
                <p className="text-muted-foreground mb-1">آدرس:</p>
                <p className="font-medium leading-relaxed">
                  {order.address}
                </p>
              </div>
            )}
            {order.notes && (
              <div className="pt-2 border-t">
                <p className="text-muted-foreground mb-1">یادداشت:</p>
                <p className="font-medium italic">{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer actions */}
      <div className="flex flex-wrap gap-2 justify-between">
        <Button asChild variant="outline">
          <Link href="/agent/orders">سفارش‌های دیگر</Link>
        </Button>
        <Button asChild className="bg-honey-gradient text-primary-foreground">
          <Link href="/agent/orders/new">سفارش جدید</Link>
        </Button>
      </div>
    </div>
  );
}
