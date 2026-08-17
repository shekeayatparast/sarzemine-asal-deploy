import { db } from "../src/lib/db";
import { PRODUCTS_SEED } from "../src/lib/products";

async function main() {
  console.log("🌱 Seeding products...");

  // Clear existing products
  await db.product.deleteMany({});

  for (const p of PRODUCTS_SEED) {
    await db.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        pricePerKg: p.pricePerKg,
        color: p.color,
        origin: p.origin,
        benefits: p.benefits,
        image: p.image,
        featured: p.featured,
      },
    });
    console.log(`  ✓ ${p.name}`);
  }

  console.log("✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
