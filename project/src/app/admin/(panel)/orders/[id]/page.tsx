// Admin order detail page — server component.
// Fetches the order with all relations and renders the AdminOrderDetail
// client component for status management.

import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminOrderDetail } from "@/components/admin/AdminOrderDetail";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  // Layout already enforces auth, but we double-check here for safety.
  const user = await getCurrentAdmin();
  if (!user) redirect("/admin/login");

  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      agent: {
        select: { id: true, name: true, storeName: true, phone: true },
      },
    },
  });

  if (!order) {
    notFound();
  }

  // Convert Date objects → ISO strings so the client component's typed shape
  // (createdAt/updatedAt as string) is satisfied. We also strip the agent's
  // phone (not displayed by AdminOrderDetail).
  const serializableOrder = {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    province: order.province,
    city: order.city,
    address: order.address,
    totalAmount: order.totalAmount,
    uniqueAmount: order.uniqueAmount,
    finalAmount: order.finalAmount,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    deliveryType: order.deliveryType,
    trackingCode: order.trackingCode,
    notes: order.notes,
    orderType: order.orderType,
    agentId: order.agentId,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map((it) => ({
      id: it.id,
      productId: it.productId,
      productName: it.productName,
      containerSize: it.containerSize,
      hasWax: it.hasWax,
      isWholesale: it.isWholesale,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      total: it.total,
    })),
    agent: order.agent
      ? {
          id: order.agent.id,
          name: order.agent.name,
          storeName: order.agent.storeName,
        }
      : null,
  };

  return <AdminOrderDetail order={serializableOrder} />;
}
