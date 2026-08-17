import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standard build (NOT standalone) — uses `next start` which serves from
  // the full .next/ directory with all node_modules available. This is the
  // most reliable production setup and avoids Prisma engine copy issues.
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
