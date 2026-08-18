import { db } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
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
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AgentActionsButtons } from "@/components/admin/AgentActionsButtons";
import { AgentsFilters } from "@/components/admin/AgentsFilters";
import { Users, ArrowLeft } from "lucide-react";
import {
  toPersianDigits,
  formatToman,
  formatJalaliDateTime,
} from "@/lib/format";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ status?: string; search?: string }>;
}

export default async function AdminAgentsPage({ searchParams }: PageProps) {
  const user = await getCurrentAdmin();
  if (!user) redirect("/admin/login");

  const params = await searchParams;
  const status = params.status;
  const search = params.search?.trim();

  // Build where clause
  const where: {
    status?: string;
    OR?: Array<Record<string, { contains: string }>>;
  } = {};
  if (
    status &&
    ["pending", "active", "blocked", "rejected"].includes(status)
  ) {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { storeName: { contains: search } },
      { phone: { contains: search } },
    ];
  }

  // Parallel queries: agents + status counts for filter tabs
  const [agents, allAgents] = await Promise.all([
    db.agent.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        storeName: true,
        province: true,
        city: true,
        status: true,
        commissionRate: true,
        totalSales: true,
        totalOrders: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.agent.findMany({
      select: { status: true },
    }),
  ]);

  const counts = {
    all: allAgents.length,
    pending: allAgents.filter((a) => a.status === "pending").length,
    active: allAgents.filter((a) => a.status === "active").length,
    blocked: allAgents.filter((a) => a.status === "blocked").length,
    rejected: allAgents.filter((a) => a.status === "rejected").length,
  } as const;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-honey-dark flex items-center gap-2">
            <Users className="w-6 h-6" />
            مدیریت نماینده‌ها
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            مجموع {toPersianDigits(allAgents.length)} نماینده در سرزمین عسل
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin">
            <ArrowLeft className="w-4 h-4 mr-1" />
            بازگشت به داشبورد
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <AgentsFilters counts={counts} />
      </Card>

      {/* Agents table */}
      <Card className="gap-4 p-5">
        <CardHeader className="px-0">
          <CardTitle className="text-base font-bold">
            فهرست نماینده‌ها
          </CardTitle>
          <CardDescription>
            {search || status
              ? `${toPersianDigits(agents.length)} نماینده یافت شد`
              : "همه نماینده‌ها بر اساس تاریخ ثبت‌نام (نزولی)"}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">
                هیچ نماینده‌ای با این فیلترها پیدا نشد.
              </p>
              {status === "pending" && (
                <p className="text-xs text-muted-foreground">
                  وقتی نماینده جدیدی ثبت‌نام کند، در اینجا نمایش داده می‌شود.
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>نام</TableHead>
                      <TableHead>فروشگاه</TableHead>
                      <TableHead>تلفن</TableHead>
                      <TableHead>استان / شهر</TableHead>
                      <TableHead>وضعیت</TableHead>
                      <TableHead>سفارش</TableHead>
                      <TableHead>فروش کل</TableHead>
                      <TableHead>پورسانت</TableHead>
                      <TableHead>آخرین ورود</TableHead>
                      <TableHead className="text-left">عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <Link
                            href={`/admin/agents/${a.id}`}
                            className="font-bold text-honey-dark hover:underline"
                          >
                            {a.name}
                          </Link>
                          <p className="text-[11px] text-muted-foreground">
                            {formatJalaliDateTime(a.createdAt)}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm">{a.storeName}</TableCell>
                        <TableCell className="text-sm" dir="ltr">
                          {toPersianDigits(a.phone)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {a.province} / {a.city}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={a.status} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {toPersianDigits(a.totalOrders)}
                        </TableCell>
                        <TableCell className="text-sm font-bold">
                          {formatToman(a.totalSales)}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-honey-light/40 text-honey-dark border-honey/20">
                            {toPersianDigits(a.commissionRate)}٪
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {a.lastLoginAt
                            ? formatJalaliDateTime(a.lastLoginAt)
                            : "بدون ورود"}
                        </TableCell>
                        <TableCell>
                          <AgentActionsButtons
                            agent={{
                              id: a.id,
                              name: a.name,
                              status: a.status,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden space-y-3">
                {agents.map((a) => (
                  <Card key={a.id} className="p-4 gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/admin/agents/${a.id}`}
                          className="font-bold text-honey-dark hover:underline"
                        >
                          {a.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {a.storeName}
                        </p>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <p>
                        تلفن:{" "}
                        <span dir="ltr" className="text-foreground">
                          {toPersianDigits(a.phone)}
                        </span>
                      </p>
                      <p>
                        استان:{" "}
                        <span className="text-foreground">{a.province}</span>
                      </p>
                      <p>
                        سفارش‌ها:{" "}
                        <span className="text-foreground">
                          {toPersianDigits(a.totalOrders)}
                        </span>
                      </p>
                      <p>
                        پورسانت:{" "}
                        <span className="text-foreground">
                          {toPersianDigits(a.commissionRate)}٪
                        </span>
                      </p>
                      <p className="col-span-2">
                        فروش کل:{" "}
                        <span className="text-foreground font-bold">
                          {formatToman(a.totalSales)}
                        </span>
                      </p>
                    </div>
                    <div className="pt-2 border-t">
                      <AgentActionsButtons
                        agent={{
                          id: a.id,
                          name: a.name,
                          status: a.status,
                        }}
                        variant="row"
                      />
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
