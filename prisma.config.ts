import { defineConfig, env } from "prisma/config";

const directUrl = process.env.DIRECT_URL || process.env.DATABASE_DIRECT_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
    ...(directUrl ? { directUrl } : {}),
  },
});
