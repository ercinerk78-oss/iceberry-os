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
  console.error("Use Supabase Direct Connection or Shared Pooler Session Mode for migrations.");
  process.exit(1);
}

const migrationUrl = new URL(directDatabaseUrl);
const migrationHost = migrationUrl.hostname;
const migrationPort = migrationUrl.port || "5432";
const isSupabasePooler = migrationHost.endsWith(".pooler.supabase.com");
const isTransactionPooler = isSupabasePooler && migrationPort === "6543";

if (isTransactionPooler) {
  console.error("Production migration stopped: Supabase Transaction Pooler is not supported for Prisma migrations.");
  console.error("Use Supabase Direct Connection, or Shared Pooler Session Mode on port 5432 when IPv4 is required.");
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

console.log("Preparing production migration state...");
const recovery = run("node", ["scripts/recover-production-migration-state.mjs"], 120000);
if (recovery.status !== 0) {
  console.error("Production migration recovery failed. Stop and inspect the error before retrying.");
  process.exit(recovery.status ?? 1);
}

console.log(`Running Prisma production migrations using ${migrationHost}:${migrationPort}...`);
const deploy = run("npx", ["prisma", "migrate", "deploy"], 120000);
if (deploy.status !== 0) {
  console.error("Prisma migrate deploy failed. Stop and inspect the error before retrying.");
  process.exit(deploy.status ?? 1);
}

process.exit(0);
