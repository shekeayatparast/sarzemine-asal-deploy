import { redirect } from "next/navigation";
import { getCurrentAgent } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Clock,
  ShieldAlert,
  LogOut,
  Home,
  Store,
  Headset,
} from "lucide-react";
import { AgentSidebar } from "@/components/agent/AgentSidebar";
import { AgentHeader } from "@/components/agent/AgentHeader";

// Force dynamic — agent state is per-request
export const dynamic = "force-dynamic";

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await getCurrentAgent();

  // No agent session at all → go to login
  if (!sessionUser) {
    redirect("/agent/login");
  }

  // Get the full agent record for layout-wide info (status, balance, store)
  const agent = await db.agent.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      storeName: true,
      status: true,
      balance: true,
      province: true,
      city: true,
      address: true,
      rejectionReason: true,
      createdAt: true,
    },
  });

  if (!agent) {
    // Session points to a deleted agent — log them out
    redirect("/agent/login");
  }

  // PENDING — waiting for admin approval
  if (agent.status === "pending") {
    return <WaitingApproval agentName={agent.name} storeName={agent.storeName} />;
  }

  // BLOCKED or REJECTED
  if (agent.status === "blocked" || agent.status === "rejected") {
    return (
      <BlockedScreen
        status={agent.status}
        reason={agent.rejectionReason}
      />
    );
  }

  // ACTIVE — render full panel with sidebar
  return (
    <div className="min-h-screen flex flex-col bg-muted/30" dir="rtl">
      <AgentHeader
        agentName={agent.name}
        storeName={agent.storeName}
        balance={agent.balance}
      />
      <div className="flex-1 flex w-full max-w-7xl mx-auto">
        {/* Desktop sidebar (right side in RTL) */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 p-4 border-l border-border bg-background">
          <AgentSidebar storeName={agent.storeName} />
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

// ── Waiting for approval screen ───────────────────────────────────────
function WaitingApproval({
  agentName,
  storeName,
}: {
  agentName: string;
  storeName: string;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cream-gradient p-4"
      dir="rtl"
    >
      <Card className="max-w-md w-full p-8 text-center gap-6">
        <CardHeader className="items-center text-center gap-2 px-0">
          <div className="w-16 h-16 rounded-full bg-honey-light/40 flex items-center justify-center mx-auto mb-2 animate-soft-float">
            <Clock className="w-8 h-8 text-honey-dark" />
          </div>
          <CardTitle className="text-2xl font-extrabold text-honey-dark">
            در انتظار تأیید مدیر
          </CardTitle>
          <CardDescription className="text-base">
            سلام {agentName} عزیز،
            <br />
            حساب نمایندگی شما با موفقیت ثبت شد. لطفاً تا تأیید مدیر
            صبور باشید. پس از تأیید، می‌توانید وارد پنل خود شوید.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 space-y-3">
          <div className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
            <Store className="w-4 h-4 inline ml-1 align-middle" />
            فروشگاه: <b className="text-foreground">{storeName}</b>
          </div>
          <div className="flex flex-col gap-2">
            <form action="/api/auth/agent/logout" method="POST">
              <Button
                type="submit"
                variant="outline"
                className="w-full"
              >
                <LogOut className="w-4 h-4 ml-1.5" />
                خروج از حساب
              </Button>
            </form>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/">
                <Home className="w-4 h-4 ml-1.5" />
                بازگشت به سایت
              </Link>
            </Button>
          </div>
          <div className="flex items-center justify-center gap-1.5 pt-2 text-xs text-muted-foreground">
            <Headset className="w-3.5 h-3.5" />
            <span>برای پیگیری با پشتیبانی تماس بگیرید</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Blocked / rejected screen ──────────────────────────────────────────
function BlockedScreen({
  status,
  reason,
}: {
  status: string;
  reason: string | null;
}) {
  const isBlocked = status === "blocked";
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cream-gradient p-4"
      dir="rtl"
    >
      <Card className="max-w-md w-full p-8 text-center gap-6">
        <CardHeader className="items-center text-center gap-2 px-0">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-2">
            <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl font-extrabold text-red-600 dark:text-red-400">
            {isBlocked ? "حساب شما مسدود شده است" : "درخواست نمایندگی رد شد"}
          </CardTitle>
          <CardDescription className="text-base">
            {isBlocked
              ? "برای اطلاعات بیشتر لطفاً با پشتیبانی تماس بگیرید."
              : "متأسفانه درخواست نمایندگی شما توسط مدیر رد شده است."}
          </CardDescription>
        </CardHeader>
        {reason && (
          <CardContent className="px-0">
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
              <p className="font-bold mb-1">دلیل:</p>
              <p>{reason}</p>
            </div>
          </CardContent>
        )}
        <CardContent className="px-0">
          <form action="/api/auth/agent/logout" method="POST">
            <Button type="submit" variant="outline" className="w-full">
              <LogOut className="w-4 h-4 ml-1.5" />
              خروج از حساب
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
