"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  BarChart3,
  LogOut,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "داشبورد", icon: LayoutDashboard },
  { href: "/admin/agents", label: "مدیریت نمایندگان", icon: Users },
  { href: "/admin/orders", label: "سفارش‌ها", icon: ShoppingCart },
  { href: "/admin/reports", label: "گزارش‌ها", icon: BarChart3 },
];

function AdminNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav className="flex flex-col gap-1.5" aria-label="منوی پنل ادمین">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all",
              active
                ? "bg-honey-gradient text-primary-foreground shadow-sm"
                : "text-foreground hover:bg-accent hover:text-accent-foreground"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function AdminSidebarHeader({ adminName }: { adminName?: string }) {
  return (
    <div className="flex items-center gap-3 px-2 pb-4 mb-2 border-b">
      <div className="w-10 h-10 rounded-xl bg-honey-gradient flex items-center justify-center text-primary-foreground shadow-sm">
        <Crown className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-extrabold text-honey-dark truncate">
          سرزمین عسل
        </p>
        <p className="text-[11px] text-muted-foreground truncate">
          {adminName ? `پنل مدیریت — ${adminName}` : "پنل مدیریت"}
        </p>
      </div>
    </div>
  );
}

export function AdminSidebar({
  adminName,
  role,
  onNavigate,
}: {
  adminName?: string;
  role?: string;
  onNavigate?: () => void;
}) {
  return (
    <aside className="flex flex-col h-full">
      <AdminSidebarHeader adminName={adminName} />
      <AdminNavLinks onNavigate={onNavigate} />

      <div className="mt-4 pt-4 border-t space-y-2">
        {role && (
          <div className="px-2">
            <Badge
              variant="outline"
              className="bg-honey-light/30 text-honey-dark border-honey/30 text-[11px]"
            >
              <Crown className="w-3 h-3 ml-1" />
              نقش: {role === "super_admin" ? "مدیر ارشد" : "مدیر"}
            </Badge>
          </div>
        )}
        <form action="/api/auth/admin/logout" method="POST">
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
          >
            <LogOut className="w-5 h-5 ml-1" />
            خروج از حساب
          </Button>
        </form>
      </div>
    </aside>
  );
}
