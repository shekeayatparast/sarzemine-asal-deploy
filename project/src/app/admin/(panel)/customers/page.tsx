import { db } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
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
import { CustomersFilters } from "@/components/admin/CustomersFilters";
import {
  Users,
  ArrowLeft,
  Phone,
  User as UserIcon,
  ShoppingBag,
  Coins,
  ExternalLink,
  MapPin,
} from "lucide-react";
import {
  toPersianDigits,
  formatToman,
  formatJalaliDateTime,
  persianToEnglishDigits,
} from "@/lib/format";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function AdminCustomersPage({
  searchParams,
}: PageProps) {
  const user = await getCurrentAdmin();
  if (!user) redirect("/admin/login");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  // Normalize Persian/Arabic digits → ASCII so that phone search matches DB.
  const search = params.search?.trim()
    ? persianToEnglishDigits(params.search.trim())
    : "";
  // Keep the original (Persian-friendly) form for name search so the user can
  // type either Persian or English text and still get matches.
  const nameSearch = params.search?.trim() ?? "";

  // Build where clause: filter orders by customer name OR phone containing
  // the (digit-normalized) search term. We then groupBy the filtered set.
  const where: {
    OR?: Array<
      | { customerPhone: { contains: string } }
      | { customerName: { contains: string } }
    >;
  } = {};
  if (search) {
    where.OR = [
      { customerPhone: { contains: search } },
      { customerName: { contains: nameSearch } },
    ];
  }

  // Parallel queries:
  // 1) Paginated, aggregated stats per phone (ordered by last order desc)
  // 2) Total unique-phones count (for pagination metadata)
  const [groups, allGroups] = await Promise.all([
    db.order.groupBy({
      by: ["customerPhone"],
      where,
      _count: { id: true },
      _sum: { finalAmount: true },
      _max: { createdAt: true },
      _min: { createdAt: true },
      orderBy: { _max: { createdAt: "desc" } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.order.groupBy({
      by: ["customerPhone"],
      where,
      _count: { id: true },
    }),
  ]);

  const totalCount = allGroups.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // For each phone in the current page, fetch the LATEST order to get the
  // customer's name / province / city / address (these can change between
  // orders; the latest order wins).
  const phones = groups.map((g) => g.customerPhone);
  const latestOrdersRaw = phones.length
    ? await db.order.findMany({
        where: { customerPhone: { in: phones } },
        select: {
          id: true,
          customerPhone: true,
          customerName: true,
          province: true,
          city: true,
          address: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  // Build a phone -> latest order map (first occurrence is the latest
  // since results are ordered by createdAt desc).
  const latestByPhone = new Map<
    string,
    (typeof latestOrdersRaw)[number]
  >();
  for (const o of latestOrdersRaw) {
    if (!latestByPhone.has(o.customerPhone)) {
      latestByPhone.set(o.customerPhone, o);
    }
  }

  // Compose the final customer rows for the current page.
  type CustomerRow = {
    phone: string;
    name: string;
    province: string;
    city: string;
    address: string | null;
    totalOrders: number;
    totalSpent: number;
    lastOrderDate: Date | null;
    firstOrderDate: Date | null;
  };
  const customers: CustomerRow[] = groups.map((g) => {
    const latest = latestByPhone.get(g.customerPhone);
    return {
      phone: g.customerPhone,
      name: latest?.customerName ?? "—",
      province: latest?.province ?? "—",
      city: latest?.city ?? "—",
      address: latest?.address ?? null,
      totalOrders: g._count.id,
      totalSpent: g._sum.finalAmount ?? 0,
      lastOrderDate: g._max.createdAt,
      firstOrderDate: g._min.createdAt,
    };
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-honey-dark flex items-center gap-2">
            <Users className="w-6 h-6" />
            مدیریت مشتریان
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            مجموع {toPersianDigits(totalCount)} مشتری یکتا بر اساس شماره تلفن
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin">
            <ArrowLeft className="w-4 h-4 mr-1" />
            بازگشت به داشبورد
          </Link>
        </Button>
      </div>

      {/* Filters + pagination */}
      <Card className="p-4">
        <Suspense
          fallback={
            <div className="h-10 flex items-center text-sm text-muted-foreground">
              در حال بارگذاری فیلترها...
            </div>
          }
        >
          <CustomersFilters
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
          />
        </Suspense>
      </Card>

      {/* Customers table */}
      <Card className="gap-4 p-5">
        <CardHeader className="px-0">
          <CardTitle className="text-base font-bold">فهرست مشتریان</CardTitle>
          <CardDescription>
            {search
              ? `${toPersianDigits(
                  customers.length
                )} مشتری با فیلتر جستجو یافت شد`
              : `مرتب‌شده بر اساس آخرین سفارش (نزولی) — صفحه ${toPersianDigits(
                  page
                )} از ${toPersianDigits(totalPages)}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">
                {search
                  ? "هیچ مشتری با این فیلترها یافت نشد."
                  : "هنوز هیچ سفارشی ثبت نشده است. با ثبت اولین سفارش، مشتریان اینجا نمایش داده می‌شوند."}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>نام</TableHead>
                      <TableHead>تلفن</TableHead>
                      <TableHead>استان / شهر</TableHead>
                      <TableHead>سفارش‌ها</TableHead>
                      <TableHead>مجموع خرید</TableHead>
                      <TableHead>اولین سفارش</TableHead>
                      <TableHead>آخرین سفارش</TableHead>
                      <TableHead className="text-left">جزئیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((c) => (
                      <TableRow key={c.phone}>
                        <TableCell>
                          <Link
                            href={`/admin/customers/${encodeURIComponent(
                              c.phone
                            )}`}
                            className="font-bold text-honey-dark hover:underline inline-flex items-center gap-1.5"
                          >
                            <UserIcon className="w-4 h-4 opacity-70" />
                            {c.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm" dir="ltr">
                          {toPersianDigits(c.phone)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 opacity-60" />
                            {c.province} / {c.city}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700"
                          >
                            <ShoppingBag className="w-3 h-3 ml-1" />
                            {toPersianDigits(c.totalOrders)} سفارش
                          </Badge>
                        </TableCell>
                        <TableCell
                          className="text-sm font-bold text-honey-dark whitespace-nowrap"
                          dir="ltr"
                        >
                          {formatToman(c.totalSpent)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {c.firstOrderDate
                            ? formatJalaliDateTime(c.firstOrderDate)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {c.lastOrderDate
                            ? formatJalaliDateTime(c.lastOrderDate)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Button asChild size="sm" variant="ghost">
                            <Link
                              href={`/admin/customers/${encodeURIComponent(
                                c.phone
                              )}`}
                            >
                              <ExternalLink className="w-4 h-4" />
                              مشاهده
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden space-y-3">
                {customers.map((c) => (
                  <Card key={c.phone} className="p-4 gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/admin/customers/${encodeURIComponent(c.phone)}`}
                        className="font-bold text-honey-dark hover:underline inline-flex items-center gap-1.5"
                      >
                        <UserIcon className="w-4 h-4" />
                        {c.name}
                      </Link>
                      <Badge
                        variant="outline"
                        className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700"
                      >
                        <ShoppingBag className="w-3 h-3 ml-1" />
                        {toPersianDigits(c.totalOrders)} سفارش
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <p className="col-span-2" dir="ltr">
                        <Phone className="w-3 h-3 inline ml-1 opacity-60" />
                        <span className="text-foreground">
                          {toPersianDigits(c.phone)}
                        </span>
                      </p>
                      <p className="col-span-2">
                        <MapPin className="w-3 h-3 inline ml-1 opacity-60" />
                        {c.province} / {c.city}
                      </p>
                      <p className="col-span-2">
                        <Coins className="w-3 h-3 inline ml-1 opacity-60" />
                        مجموع خرید:{" "}
                        <span
                          className="text-foreground font-bold"
                          dir="ltr"
                        >
                          {formatToman(c.totalSpent)}
                        </span>
                      </p>
                      <p className="col-span-2">
                        آخرین سفارش:{" "}
                        <span className="text-foreground">
                          {c.lastOrderDate
                            ? formatJalaliDateTime(c.lastOrderDate)
                            : "—"}
                        </span>
                      </p>
                    </div>
                    <div className="pt-2 border-t">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="w-full"
                      >
                        <Link
                          href={`/admin/customers/${encodeURIComponent(c.phone)}`}
                        >
                          <ExternalLink className="w-4 h-4 ml-1" />
                          مشاهده جزئیات مشتری
                        </Link>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
