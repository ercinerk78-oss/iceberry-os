import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const failedMigrationName = "20260717132000_sprint3_supply_chain_core";

function run(command, args, timeout) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: process.platform === "win32",
    timeout,
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  return result;
}

async function readMigrationRecords(prisma) {
  const rows = await prisma.$queryRaw`
    SELECT
      migration_name,
      finished_at IS NOT NULL AS finished,
      rolled_back_at IS NOT NULL AS rolled_back,
      logs IS NOT NULL AS has_logs
    FROM "_prisma_migrations"
    WHERE migration_name = ${failedMigrationName}
    ORDER BY started_at DESC
  `;

  return rows;
}

function hasFailedMigrationRecord(rows) {
  return rows.some((row) => !row.rolled_back && (!row.finished || row.has_logs));
}

async function readPartialMigrationMarkers(prisma) {
  const columns = await prisma.$queryRaw`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        (table_name = 'ProductCategory' AND column_name IN ('code', 'parentCategoryId', 'sortOrder'))
        OR (table_name = 'Product' AND column_name IN ('shortName', 'brand', 'packageQuantity', 'baseUnit', 'trackInventory'))
      )
    ORDER BY table_name, column_name
  `;

  const tables = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'Supplier',
        'ExternalProductMapping',
        'ProductMappingQueue',
        'ExternalBranchMapping',
        'InventoryLot',
        'GoodsReceipt',
        'GoodsReceiptItem',
        'PickingList',
        'PickingListItem',
        'ShipmentItem',
        'DeliveryIssue',
        'ReturnRequest',
        'ReturnItem',
        'InventoryLoss',
        'StockCount',
        'StockCountItem',
        'SupplyComplianceAlert',
        'Notification'
      )
    ORDER BY table_name
  `;

  const indexes = await prisma.$queryRaw`
    SELECT tablename, indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        'ProductCategory_code_key',
        'ProductCategory_parentCategoryId_idx',
        'Warehouse_code_key',
        'Supplier_code_key'
      )
    ORDER BY tablename, indexname
  `;

  return {
    columns,
    tables,
    indexes,
    markerCount: columns.length + tables.length + indexes.length,
  };
}

const prisma = new PrismaClient();

try {
  console.log(`Checking production migration status before deploy...`);
  const status = run("npx", ["prisma", "migrate", "status"], 120000);
  const migrationRecords = await readMigrationRecords(prisma);
  const migrationIsFailed = hasFailedMigrationRecord(migrationRecords);
  console.log(`Migration record states: ${JSON.stringify(migrationRecords)}`);

  if (status.status === 0 && !migrationIsFailed) {
    process.exit(0);
  }

  const statusOutput = `${status.stdout ?? ""}\n${status.stderr ?? ""}`;
  const hasOnlyPendingMigrations =
    statusOutput.includes("Following migrations have not yet been applied") &&
    !statusOutput.includes("failed migrations") &&
    !statusOutput.includes("failed");

  if (hasOnlyPendingMigrations && !migrationIsFailed) {
    console.log("Prisma migrate status found pending migrations and no failed migration. Continuing with deploy.");
    process.exit(0);
  }

  if (!migrationIsFailed && !statusOutput.includes(failedMigrationName)) {
    console.error("Prisma migrate status failed, but not for the expected recovery migration. Stopping.");
    process.exit(status.status ?? 1);
  }

  if (!migrationIsFailed) {
    console.log("Expected failed migration is not currently marked as failed. Continuing with deploy.");
    process.exit(0);
  }

  const partialMarkers = await readPartialMigrationMarkers(prisma);
  console.log(
    `Partial schema marker counts: columns=${partialMarkers.columns.length}, tables=${partialMarkers.tables.length}, indexes=${partialMarkers.indexes.length}`,
  );

  if (partialMarkers.markerCount > 0) {
    console.error("Production migration recovery stopped: the failed migration appears partially applied.");
    console.error("Do not use --rolled-back automatically. Inspect production schema and prepare a manual recovery plan.");
    process.exit(1);
  }

  console.log(`Resolving ${failedMigrationName} as rolled back...`);
  const resolved = run("npx", ["prisma", "migrate", "resolve", "--rolled-back", failedMigrationName], 120000);
  if (resolved.status !== 0) {
    console.error("Prisma migrate resolve failed. Stop and inspect the error before retrying.");
    process.exit(resolved.status ?? 1);
  }
} finally {
  await prisma.$disconnect();
}
