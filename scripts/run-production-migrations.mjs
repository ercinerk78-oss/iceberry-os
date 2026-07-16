import { spawnSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL || "";
const shouldRun = process.env.VERCEL === "1" && databaseUrl.startsWith("postgres");

if (!shouldRun) {
  console.log("Skipping production migrations for this environment.");
  process.exit(0);
}

console.log("Running Prisma production migrations...");
const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
