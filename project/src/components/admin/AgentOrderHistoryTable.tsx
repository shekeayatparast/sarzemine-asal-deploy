"use client";

import * as React from "react";
import Link from "next/link";
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
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/agent/OrderStatusBadge";
import {
  ChevronDown,
  ChevronUp,
  Package,
  ShoppingCart,
  ExternalLink,
  Droplet,
} from "lucide-react";
import {
  toPersianDigits,
  formatToman,
  formatJalaliDateTime,
} from "@/lib/format";

/**
 * Shape of an order row as passed from the admin agent-details page.
 * The parent (server component) selects exactly these fields via Prisma
 * `include` so we type them explicitly here.
 */
export type AgentOrderItem = {
  id: string;
  productId: string;
  productName: string;
  containerSize: number;
  hasWax: boolean;
  isWholesale: boolean;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type AgentOrderWithItems = {
  id: string;
  orderNumber: string;
  finalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  createdAt: Date | string;
  items: AgentOrderItem[];
};

export function AgentOrderHistoryTable({
  orders,
}: {
  orders: AgentOrderWithItems[];
}) {
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const toggle = React.useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <ShoppingCart className="w-12 h-12 text-muted-foreground opacity-30" />
        <p className="text-sm text-muted-foreground">
          هنوز سفارشی ثبت نکرده است.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">شماره سفارش</TableHead>
            <TableHead className="text-right">تاریخ</TableHead>
            <TableHead className="text-left">مبلغ</TableHead>
            <TableHead className="text-center">پرداخت</TableHead>
            <TableHead className="text-center">وضعیت</TableHead>
            <TableHead className="text-center">جزئیات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o) => {
            const isOpen = expanded.has(o.id);
            const itemCount = o.items.length;
            const totalQty = o.items.reduce((s, i) => s + i.quantity, 0);

            return (
              <React.Fragment key={o.id}>
                <TableRow
                  className={
                    isOpen
                      ? "bg-honey-light/30 hover:bg-honey-light/40"
                      : undefined
                  }
                >
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-bold text-honey-dark hover:underline inline-flex items-center gap-1.5"
                    >
                      <span>{o.orderNumber}</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                    </Link>
                  </TableCell>
                  <TableCell
                    className="text-right text-sm text-muted-foreground whitespace-nowrap"
                  >
                    {formatJalaliDateTime(o.createdAt)}
                  </TableCell>
                  <TableCell
                    className="text-left text-sm font-bold whitespace-nowrap"
                    dir="ltr"
                  >
                    {formatToman(o.finalAmount)}
                  </TableCell>
                  <TableCell className="text-center">
                    <PaymentStatusBadge status={o.paymentStatus} />
                  </TableCell>
                  <TableCell className="text-center">
                    <OrderStatusBadge status={o.orderStatus} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      variant={isOpen ? "secondary" : "ghost"}
                      className="h-8 gap-1.5 px-2"
                      onClick={() => toggle(o.id)}
                      aria-expanded={isOpen}
                      aria-label={
                        isOpen ? "بستن جزئیات سفارش" : "نمایش جزئیات سفارش"
                      }
                    >
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                      <span className="text-xs">
                        {toPersianDigits(itemCount)} قلم
                      </span>
                    </Button>
                  </TableCell>
                </TableRow>
                {isOpen && (
                  <TableRow className="bg-honey-light/20 hover:bg-honey-light/20">
                    <TableCell colSpan={6} className="p-4">
                      <OrderItemsSubTable items={o.items} />
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>
                          تعداد اقلام:{" "}
                          <b className="text-foreground">
                            {toPersianDigits(itemCount)}
                          </b>{" "}
                          • مجموع تعداد کالا:{" "}
                          <b className="text-foreground">
                            {toPersianDigits(totalQty)} عدد
                          </b>
                        </span>
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-8"
                        >
                          <Link href={`/admin/orders/${o.id}`}>
                            <ExternalLink className="w-3.5 h-3.5 ml-1" />
                            مشاهده صفحه کامل سفارش
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function OrderItemsSubTable({
  items,
}: {
  items: AgentOrderItem[];
}) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
        <Package className="w-4 h-4 opacity-60" />
        <span>هیچ قلمی برای این سفارش ثبت نشده است.</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-honey-light/40 dark:bg-honey-dark/20 hover:bg-honey-light/40">
            <TableHead className="text-right h-9">محصول</TableHead>
            <TableHead className="text-center h-9">ظرف</TableHead>
            <TableHead className="text-center h-9">موم</TableHead>
            <TableHead className="text-center h-9">تعداد</TableHead>
            <TableHead className="text-left h-9">قیمت واحد</TableHead>
            <TableHead className="text-left h-9">جمع قلم</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((it) => (
            <TableRow key={it.id}>
              <TableCell className="text-right font-medium">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-honey-dark shrink-0" />
                  <span>{it.productName}</span>
                  {it.isWholesale && (
                    <Badge
                      variant="outline"
                      className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-[10px] px-1.5 py-0"
                    >
                      عمده
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center whitespace-nowrap">
                <span className="inline-block min-w-[3.5rem]">
                  {toPersianDigits(it.containerSize)} کیلو
                </span>
              </TableCell>
              <TableCell className="text-center">
                {it.hasWax ? (
                  <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] gap-0.5 px-1.5 py-0">
                    <Droplet className="w-3 h-3" />
                    با موم
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0"
                  >
                    بدون موم
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-center font-bold">
                {toPersianDigits(it.quantity)}
              </TableCell>
              <TableCell
                className="text-left whitespace-nowrap text-sm"
                dir="ltr"
              >
                {formatToman(it.unitPrice)}
              </TableCell>
              <TableCell
                className="text-left whitespace-nowrap text-sm font-bold text-honey-dark"
                dir="ltr"
              >
                {formatToman(it.total)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
