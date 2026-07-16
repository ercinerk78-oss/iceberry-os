import { spawnSync } from "node:child_process";

const directDatabaseUrl = process.env.DIRECT_URL || process.env.DATABASE_DIRECT_URL || "";
if (directDatabaseUrl.startsWith("postgres")) {
  process.env.DATABASE_URL = directDatabaseUrl;
}

const databaseUrl = process.env.DATABASE_URL || "";
const shouldRun = process.env.VERCEL === "1" && databaseUrl.startsWith("postgres");
const branchRevenueMigration = "prisma/migrations/20260716193000_branch_revenue_records/migration.sql";

if (!shouldRun) {
  console.log("Skipping production migrations for this environment.");
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
const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  timeout: 45000,
});

if (result.status !== 0) {
  console.warn("Prisma production migrations did not complete during build. Continuing deploy so the app remains available.");
  console.warn("Applying branch revenue migration with db execute fallback.");
  const fallback = run("npx", ["prisma", "db", "execute", "--schema", "prisma/schema.prisma", "--file", branchRevenueMigration], 45000);
  if (fallback.status !== 0) {
    console.warn("Branch revenue migration fallback did not complete during build.");
  }
}

process.exit(0);
