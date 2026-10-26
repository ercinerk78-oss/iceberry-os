import { readdirSync } from "node:fs";
import { join } from "node:path";

process.env.PRISMA_HIDE_UPDATE_MESSAGE = "true";

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL || "";

if (!databaseUrl.startsWith("postgres")) {
  console.error("Read-only schema check stopped: DIRECT_URL, DATABASE_DIRECT_URL, or DATABASE_URL is required.");
  console.error("Do not paste secrets into logs or chat. Provide the value only through a secure environment variable.");
  process.exit(1);
}

if (databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")) {
  console.error("Read-only schema check stopped: local database URLs are not allowed for production verification.");
  process.exit(1);
}

const { PrismaClient } = await import("@prisma/client");

const prisma = new PrismaClient({
  datasourceUrl: databaseUrl,
  log: [],
});

const migrationDirectory = join(process.cwd(), "prisma", "migrations");
const localMigrations = readdirSync(migrationDirectory, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

function printSection(title, value) {
  console.log(`\n## ${title}`);
  console.log(JSON.stringify(value, null, 2));
}

try {
  const appliedMigrations = await prisma.$queryRaw`
    SELECT migration_name, started_at, finished_at, rolled_back_at, logs
    FROM "_prisma_migrations"
    ORDER BY started_at ASC
  `;

  const documentColumns = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Document'
    ORDER BY ordinal_position ASC
  `;

  const openingProjectColumn = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Document'
      AND column_name = 'openingProjectId'
  `;

  const openingTables = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name LIKE 'Opening%'
    ORDER BY table_name ASC
  `;

  const openingForeignKeys = await prisma.$queryRaw`
    SELECT
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND (
        tc.table_name IN ('Document', 'BranchTask')
        OR ccu.table_name LIKE 'Opening%'
      )
    ORDER BY tc.table_name ASC, tc.constraint_name ASC
  `;

  const openingIndexes = await prisma.$queryRaw`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND (
        tablename IN ('Document', 'BranchTask')
        OR tablename LIKE 'Opening%'
      )
    ORDER BY tablename ASC, indexname ASC
  `;

  const appliedNames = new Set(appliedMigrations.map((migration) => migration.migration_name));
  const pendingLocalMigrations = localMigrations.filter((name) => !appliedNames.has(name));
  const failedMigrations = appliedMigrations.filter((migration) => !migration.finished_at || migration.rolled_back_at);

  printSection("Local migrations", localMigrations);
  printSection("Applied production migrations", appliedMigrations);
  printSection("Pending local migrations", pendingLocalMigrations);
  printSection("Failed or unfinished migrations", failedMigrations);
  printSection("Document columns", documentColumns);
  printSection("Document.openingProjectId column", openingProjectColumn);
  printSection("Opening tables", openingTables);
  printSection("Relevant foreign keys", openingForeignKeys);
  printSection("Relevant indexes", openingIndexes);
} finally {
  await prisma.$disconnect();
}
