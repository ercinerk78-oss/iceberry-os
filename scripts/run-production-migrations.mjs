import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const directDatabaseUrl = process.env.DIRECT_URL || process.env.DATABASE_DIRECT_URL || "";
const hasDirectDatabaseUrl = directDatabaseUrl.startsWith("postgres");
if (hasDirectDatabaseUrl) {
  process.env.DATABASE_URL = directDatabaseUrl;
}

const databaseUrl = process.env.DATABASE_URL || "";
const shouldRun = process.env.VERCEL === "1" && databaseUrl.startsWith("postgres");

const idempotentSqlFiles = [
  "prisma/migrations/20260716183000_branch_operations_core/migration.sql",
  "prisma/migrations/20260716193000_branch_revenue_records/migration.sql",
  "prisma/migrations/20260717132000_sprint3_supply_chain_core/migration.sql",
  "prisma/migrations/20260717150000_sprint4_integrations_reconciliation/migration.sql",
  "prisma/migrations/20260717163000_sprint5_finance_engine/migration.sql",
  "prisma/migrations/20260717170000_sprint6_operations_audit_health/migration.sql",
];

if (!shouldRun) {
  console.log("Skipping production migrations for this environment.");
  process.exit(0);
}

if (!hasDirectDatabaseUrl) {
  console.warn("Skipping production migrations because DIRECT_URL or DATABASE_DIRECT_URL is not configured.");
  console.warn("The app deploy will continue; run migrations with a direct Postgres connection.");
  process.exit(0);
}

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
  console.warn("Prisma migrate deploy did not complete during build. Continuing with idempotent SQL fallback.");
}

for (const file of idempotentSqlFiles) {
  if (!existsSync(file)) {
    console.warn(`Skipping missing migration fallback file: ${file}`);
    continue;
  }

  console.log(`Applying idempotent migration fallback: ${file}`);
  const fallback = run("npx", ["prisma", "db", "execute", "--schema", "prisma/schema.prisma", "--file", file], 120000);
  if (fallback.status !== 0) {
    console.warn(`Migration fallback did not complete: ${file}`);
  }
}

process.exit(0);
