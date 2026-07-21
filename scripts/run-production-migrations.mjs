import { spawnSync } from "node:child_process";

const directDatabaseUrl = process.env.DIRECT_URL || process.env.DATABASE_DIRECT_URL || "";
const hasDirectDatabaseUrl = directDatabaseUrl.startsWith("postgres");
const isVercel = process.env.VERCEL === "1";
const isProduction = process.env.VERCEL_ENV === "production";

if (!isVercel || !isProduction) {
  console.log("Skipping production migrations outside Vercel production.");
  process.exit(0);
}

if (!hasDirectDatabaseUrl) {
  console.error("Production migration stopped: DIRECT_URL or DATABASE_DIRECT_URL is required.");
  console.error("Use a direct Postgres connection for migrations. Do not use the pooled runtime DATABASE_URL.");
  process.exit(1);
}

process.env.DATABASE_URL = directDatabaseUrl;

function run(command, args, timeout) {
  return spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    timeout,
  });
}

console.log("Running Prisma production migrations...");
const deploy = run("npx", ["prisma", "migrate", "deploy"], 120000);
if (deploy.status !== 0) {
  console.error("Prisma migrate deploy failed. Stop and inspect the error before retrying.");
  process.exit(deploy.status ?? 1);
}

process.exit(0);
