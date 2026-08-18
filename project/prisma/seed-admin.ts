// Seed an initial admin user for the admin panel.
// Uses env vars ADMIN_USERNAME and ADMIN_PASSWORD if set.
// Otherwise, defaults to: username="admin", password="admin12345".
// Run with: bun run db:seed-admin

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin12345";
  const name = process.env.ADMIN_NAME || "مدیر اصلی";

  console.log("🌱 Seeding admin user...");
  console.log(`   username: ${username}`);
  console.log(`   password: ${password.replace(/./g, "*")} (${password.length} chars)`);

  // Check if admin already exists
  const existing = await db.admin.findUnique({ where: { username } });
  if (existing) {
    console.log(`   ✓ Admin '${username}' already exists — updating password.`);
    const passwordHash = await hashPassword(password);
    await db.admin.update({
      where: { id: existing.id },
      data: { passwordHash, name, active: true },
    });
    console.log("   ✓ Password updated.");
    return;
  }

  const passwordHash = await hashPassword(password);
  const admin = await db.admin.create({
    data: {
      username,
      passwordHash,
      name,
      role: "super_admin",
      active: true,
    },
  });
  console.log(`   ✓ Admin created: id=${admin.id}, role=super_admin`);
}

seedAdmin()
  .then(async () => {
    await db.$disconnect();
    console.log("✅ Seed complete!");
  })
  .catch(async (e) => {
    console.error("✗ Seed failed:", e);
    await db.$disconnect();
    process.exit(1);
  });
