"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Menu, LogOut, Crown } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { AdminSidebar } from "./AdminSidebar";

interface AdminHeaderProps {
  adminName: string;
  role?: string;
}

export function AdminHeader({ adminName, role }: AdminHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-background/90 backdrop-blur-md border-b border-border shadow-sm">
      <div className="px-4 md:px-6 h-16 md:h-20 flex items-center justify-between gap-3">
        {/* Mobile menu (hamburger) */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="md:hidden w-10 h-10 rounded-lg"
              aria-label="منو"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-4">
            <SheetTitle className="sr-only">منوی پنل ادمین</SheetTitle>
            <AdminSidebar
              adminName={adminName}
              role={role}
              onNavigate={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>

        {/* Admin identity */}
        <Link
          href="/admin"
          className="flex items-center gap-3 min-w-0"
          aria-label="داشبورد ادمین"
        >
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-sm font-bold text-foreground truncate">
              {adminName}
            </span>
            <span className="text-[11px] text-muted-foreground truncate">
              {role === "super_admin" ? "مدیر ارشد" : "مدیر سایت"}
            </span>
          </div>
        </Link>

        <div className="flex-1" />

        {/* Crown badge (desktop) */}
        <div className="hidden sm:flex items-center gap-2 px-3 h-10 rounded-lg bg-honey-light/30 border border-honey/20 text-honey-dark text-sm">
          <Crown className="w-4 h-4" />
          <span className="font-bold">پنل مدیریت</span>
        </div>

        {/* Logout (mobile) */}
        <form action="/api/auth/admin/logout" method="POST">
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="md:hidden w-10 h-10 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
            aria-label="خروج"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </header>
  );
}
