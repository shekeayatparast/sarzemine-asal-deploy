import { db } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProductManager, type AdminProduct } from "@/components/admin/ProductManager";

export const dynamic = "force-dynamic";

// Admin page: combined product CRUD (B13) + inventory management (B10).
// Server component — fetches the products (with ALL fields including
// stockKg and agentPricePerKg) and passes them as plain JSON to the
// ProductManager client component.

export default async function AdminProductsPage() {
  const user = await getCurrentAdmin();
  if (!user) redirect("/admin/login");

  const products = await db.product.findMany({
    orderBy: [{ featured: "desc" }, { createdAt: "asc" }],
  });

  // Convert Date fields to ISO strings for client serialization
  const serialized: AdminProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    pricePerKg: p.pricePerKg,
    agentPricePerKg: p.agentPricePerKg,
    stockKg: p.stockKg,
    color: p.color,
    origin: p.origin,
    benefits: p.benefits,
    image: p.image,
    featured: p.featured,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return <ProductManager products={serialized} />;
}
