import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminProfileForm } from "@/components/admin/AdminProfileForm";

export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  const sessionUser = await getCurrentAdmin();
  if (!sessionUser) redirect("/admin/login");

  const admin = await db.admin.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!admin || !admin.active) {
    redirect("/admin/login");
  }

  return (
    <AdminProfileForm
      admin={{
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: admin.role,
        active: admin.active,
        lastLoginAt: admin.lastLoginAt
          ? admin.lastLoginAt.toISOString()
          : null,
        createdAt: admin.createdAt.toISOString(),
        updatedAt: admin.updatedAt.toISOString(),
      }}
    />
  );
}
