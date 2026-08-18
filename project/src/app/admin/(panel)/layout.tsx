import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";

// Force dynamic — admin state is per-request
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await getCurrentAdmin();

  // No admin session at all → go to login
  if (!sessionUser) {
    redirect("/admin/login");
  }

  // Get the full admin record for layout-wide info (role, lastLogin)
  const admin = await db.admin.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  if (!admin || !admin.active) {
    // Session points to a deleted / inactive admin — force re-login
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30" dir="rtl">
      <AdminHeader adminName={admin.name} role={admin.role} />
      <div className="flex-1 flex w-full max-w-7xl mx-auto">
        {/* Desktop sidebar (right side in RTL) */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 p-4 border-l border-border bg-background">
          <AdminSidebar adminName={admin.name} role={admin.role} />
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
