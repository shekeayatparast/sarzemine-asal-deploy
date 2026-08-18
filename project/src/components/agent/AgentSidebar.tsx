"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PackagePlus,
  History,
  User,
  LogOut,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/agent", label: "داشبورد", icon: LayoutDashboard },
  { href: "/agent/orders/new", label: "سفارش جدید", icon: PackagePlus },
  { href: "/agent/orders", label: "تاریخچه سفارشات", icon: History },
  { href: "/agent/profile", label: "پروفایل", icon: User },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/agent") return pathname === "/agent";
    // Special case: /agent/orders is a "list" page — don't let sub-paths
    // like /agent/orders/new (سفارش جدید) or /agent/orders/[id] (جزئیات)
    // activate this link, otherwise both "سفارش جدید" and "تاریخچه
    // سفارشات" light up at the same time. Exact-match only.
    if (href === "/agent/orders") return pathname === "/agent/orders";
    // For other routes (e.g. /agent/profile), prefix-match is fine since
    // there are no sibling sub-paths that should be mutually exclusive.
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav className="flex flex-col gap-1.5" aria-label="منوی پنل نماینده">
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

function SidebarHeader({ storeName }: { storeName?: string }) {
  return (
    <div className="flex items-center gap-3 px-2 pb-4 mb-2 border-b">
      <div className="w-10 h-10 rounded-xl bg-honey-gradient flex items-center justify-center text-primary-foreground shadow-sm">
        <Store className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-extrabold text-honey-dark truncate">
          سرزمین عسل
        </p>
        <p className="text-[11px] text-muted-foreground truncate">
          {storeName || "پنل نماینده فروش"}
        </p>
      </div>
    </div>
  );
}

export function AgentSidebar({
  storeName,
  onNavigate,
}: {
  storeName?: string;
  onNavigate?: () => void;
}) {
  return (
    <aside className="flex flex-col h-full">
      <SidebarHeader storeName={storeName} />
      <NavLinks onNavigate={onNavigate} />
      <div className="mt-auto pt-4 border-t">
        <form action="/api/auth/agent/logout" method="POST">
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
