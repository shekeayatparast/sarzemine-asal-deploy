import { redirect } from "next/navigation";
import { getCurrentAgent } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfileForm } from "@/components/agent/ProfileForm";

export const dynamic = "force-dynamic";

export default async function AgentProfilePage() {
  const user = await getCurrentAgent();
  if (!user) redirect("/agent/login");

  const agent = await db.agent.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      phone: true,
      storeName: true,
      province: true,
      city: true,
      address: true,
      nationalId: true,
      status: true,
      commissionRate: true,
      balance: true,
      totalSales: true,
      totalOrders: true,
      createdAt: true,
    },
  });

  if (!agent) redirect("/agent/login");

  return (
    <ProfileForm
      agent={{
        ...agent,
        createdAt: agent.createdAt.toISOString(),
      }}
    />
  );
}
