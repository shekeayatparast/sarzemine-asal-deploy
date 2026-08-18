import { db } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AgentStatusManager } from "@/components/admin/AgentStatusManager";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/agent/OrderStatusBadge";
import {
  ArrowRight,
  User,
  Phone,
  Store,
  MapPin,
  CreditCard,
  Wallet,
  ShoppingCart,
  Coins,
  Calendar,
  Clock,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import {
  toPersianDigits,
  formatToman,
  formatJalaliDateTime,
  formatJalaliDate,
} from "@/lib/format";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminAgentDetailsPage({ params }: PageProps) {
  const user = await getCurrentAdmin();
  if (!user) redirect("/admin/login");

  const { id } = await params;

  const agent = await db.agent.findUnique({
    where: { id },
    include: {
      orders: {
        select: {
          id: true,
          orderNumber: true,
          finalAmount: true,
          orderStatus: true,
          paymentStatus: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!agent) {
    notFound();
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Breadcrumb + header */}
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-mr-2">
          <Link href="/admin/agents">
            <ArrowRight className="w-4 h-4 ml-1" />
            بازگشت به فهرست
          </Link>
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-honey-gradient flex items-center justify-center text-primary-foreground text-lg font-bold shrink-0">
              {agent.name?.charAt(0) || "?"}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-honey-dark">
                {agent.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {agent.storeName}
              </p>
            </div>
          </div>
          <StatusBadge status={agent.status} />
        </div>
      </div>

      {/* Rejection reason banner */}
      {agent.status === "rejected" && agent.rejectionReason && (
        <Card className="p-4 bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800">
          <div className="flex items-start gap-3 text-sm">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-700 dark:text-rose-300 mb-1">
                دلیل رد درخواست:
              </p>
              <p className="text-rose-600 dark:text-rose-400">
                {agent.rejectionReason}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Approval banner */}
      {agent.status === "active" && agent.approvedAt && (
        <Card className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-emerald-700 dark:text-emerald-300">
              این نماینده در تاریخ{" "}
              <b>{formatJalaliDate(agent.approvedAt)}</b> تأیید شده است.
            </p>
          </div>
        </Card>
      )}

      {/* Action buttons */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-foreground">
              مدیریت وضعیت نماینده
            </p>
            <p className="text-xs text-muted-foreground">
              با دکمه‌های زیر می‌توانید نماینده را تأیید، مسدود یا رد کنید
            </p>
          </div>
          <AgentStatusManager
            agent={{
              id: agent.id,
              name: agent.name,
              status: agent.status,
              commissionRate: agent.commissionRate,
            }}
          />
        </div>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat
          icon={<ShoppingCart className="w-5 h-5" />}
          label="کل سفارش‌ها"
          value={toPersianDigits(agent.totalOrders)}
          color="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
        />
        <MiniStat
          icon={<Coins className="w-5 h-5" />}
          label="فروش کل"
          value={formatToman(agent.totalSales)}
          color="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
        />
        <MiniStat
          icon={<Wallet className="w-5 h-5" />}
          label="موجودی"
          value={formatToman(agent.balance)}
          color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
        />
        <MiniStat
          icon={<PercentIcon />}
          label="نرخ پورسانت"
          value={`${toPersianDigits(agent.commissionRate)}٪`}
          color="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Profile info (2 cols) */}
        <Card className="lg:col-span-2 gap-4 p-5">
          <CardHeader className="px-0">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <User className="w-5 h-5 text-honey-dark" />
              اطلاعات نماینده
            </CardTitle>
            <CardDescription>اطلاعات شخصی و فروشگاه</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={<User className="w-4 h-4" />} label="نام و نام خانوادگی" value={agent.name} />
              <InfoRow icon={<Store className="w-4 h-4" />} label="نام فروشگاه" value={agent.storeName} />
              <InfoRow icon={<Phone className="w-4 h-4" />} label="شماره موبایل" value={toPersianDigits(agent.phone)} dir="ltr" />
              <InfoRow
                icon={<CreditCard className="w-4 h-4" />}
                label="کد ملی"
                value={agent.nationalId ? toPersianDigits(agent.nationalId) : "—"}
                dir="ltr"
              />
              <InfoRow
                icon={<MapPin className="w-4 h-4" />}
                label="استان / شهر"
                value={`${agent.province} / ${agent.city}`}
              />
              <InfoRow
                icon={<Calendar className="w-4 h-4" />}
                label="تاریخ ثبت‌نام"
                value={formatJalaliDate(agent.createdAt)}
              />
              <InfoRow
                icon={<Clock className="w-4 h-4" />}
                label="آخرین ورود"
                value={
                  agent.lastLoginAt
                    ? formatJalaliDateTime(agent.lastLoginAt)
                    : "بدون ورود"
                }
              />
              <InfoRow
                icon={<CheckCircle2 className="w-4 h-4" />}
                label="تاریخ تأیید"
                value={agent.approvedAt ? formatJalaliDate(agent.approvedAt) : "—"}
              />
            </div>

            <Separator className="my-4" />

            <div>
              <p className="text-xs text-muted-foreground mb-1">آدرس کامل</p>
              <p className="text-sm text-foreground leading-relaxed">
                {agent.address}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Financial summary (1 col) */}
        <Card className="gap-4 p-5 bg-cream-gradient">
          <CardHeader className="px-0">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Wallet className="w-5 h-5 text-honey-dark" />
              خلاصه مالی
            </CardTitle>
            <CardDescription>وضعیت حساب و درآمد</CardDescription>
          </CardHeader>
          <CardContent className="px-0 space-y-3">
            <FinancialRow
              label="فروش کل"
              value={formatToman(agent.totalSales)}
            />
            <FinancialRow
              label="موجودی حساب"
              value={formatToman(agent.balance)}
              positive
            />
            <FinancialRow
              label="نرخ پورسانت"
              value={`${toPersianDigits(agent.commissionRate)}٪`}
            />
            <FinancialRow
              label="پورسانت تقریبی"
              value={formatToman(
                Math.round((agent.totalSales * agent.commissionRate) / 100)
              )}
            />
            <Separator />
            <FinancialRow
              label="تعداد سفارش"
              value={toPersianDigits(agent.totalOrders) + " سفارش"}
            />
          </CardContent>
        </Card>
      </div>

      {/* Order history */}
      <Card className="gap-4 p-5">
        <CardHeader className="px-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-honey-dark" />
                تاریخچه سفارش‌ها
              </CardTitle>
              <CardDescription>
                {toPersianDigits(agent.orders.length)} سفارش اخیر این نماینده
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {agent.orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <ShoppingCart className="w-12 h-12 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">
                هنوز سفارشی ثبت نکرده است.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>شماره سفارش</TableHead>
                    <TableHead>تاریخ</TableHead>
                    <TableHead>مبلغ</TableHead>
                    <TableHead>پرداخت</TableHead>
                    <TableHead>وضعیت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agent.orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <span className="font-bold text-honey-dark">
                          {o.orderNumber}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatJalaliDateTime(o.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm font-bold">
                        {formatToman(o.finalAmount)}
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={o.paymentStatus} />
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={o.orderStatus} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment history */}
      <Card className="gap-4 p-5">
        <CardHeader className="px-0">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Wallet className="w-5 h-5 text-honey-dark" />
            تاریخچه تراکنش‌ها
          </CardTitle>
          <CardDescription>
            {toPersianDigits(agent.payments.length)} تراکنش اخیر (پورسانت/پرداخت)
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {agent.payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <Wallet className="w-12 h-12 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">
                هنوز تراکنشی برای این نماینده ثبت نشده است.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>تاریخ</TableHead>
                    <TableHead>نوع</TableHead>
                    <TableHead>مبلغ</TableHead>
                    <TableHead>توضیحات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agent.payments.map((p) => {
                    const isCredit = p.amount >= 0;
                    const typeLabel: Record<string, string> = {
                      commission: "پورسانت",
                      payment_out: "پرداخت به نماینده",
                      adjustment: "تعدیل",
                      bonus: "پاداش",
                    };
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatJalaliDateTime(p.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              isCredit
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                                : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                            }
                          >
                            {typeLabel[p.type] || p.type}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={`text-sm font-bold ${
                            isCredit
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-orange-700 dark:text-orange-300"
                          }`}
                        >
                          {isCredit ? "+" : "-"}
                          {formatToman(Math.abs(p.amount))}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.description || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card className="p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-bold text-foreground truncate">{value}</p>
      </div>
    </Card>
  );
}

function InfoRow({
  icon,
  label,
  value,
  dir,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className="text-sm font-bold text-foreground" dir={dir}>
        {value}
      </p>
    </div>
  );
}

function FinancialRow({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`font-bold ${
          positive
            ? "text-emerald-700 dark:text-emerald-300"
            : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function PercentIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}
