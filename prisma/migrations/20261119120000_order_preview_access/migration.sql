BEGIN;
ALTER TABLE "FranchiseOrderItem" ADD COLUMN "manualShortShipment" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "orderAccess" BOOLEAN NOT NULL DEFAULT false;

DO $$
DECLARE eligible INTEGER;
BEGIN
  SELECT count(*) INTO eligible FROM "User"
  WHERE lower(email) IN ('ismail.hepsever@gmail.com', 'tumbensuleyman@gmail.com')
    AND "archivedAt" IS NULL AND "isActive" = true
    AND role NOT IN ('BRANCH_OWNER', 'BRANCH_MANAGER');
  IF eligible <> 2 THEN
    RAISE EXCEPTION 'Expected two active staff accounts for order access; verify accounts and roles before deployment';
  END IF;
  UPDATE "User" SET "orderAccess" = true
  WHERE lower(email) IN ('ismail.hepsever@gmail.com', 'tumbensuleyman@gmail.com')
    AND "archivedAt" IS NULL AND "isActive" = true
    AND role NOT IN ('BRANCH_OWNER', 'BRANCH_MANAGER');
END $$;
INSERT INTO "AuditLog" (id, action, "entityType", "entityId", description, "createdAt")
SELECT 'order-access-20261119-' || id, 'USER_ORDER_ACCESS_GRANTED', 'User', id,
  'Bayi Siparişleri erişimi kullanıcı talebiyle tanımlandı.', CURRENT_TIMESTAMP
FROM "User" WHERE lower(email) IN ('ismail.hepsever@gmail.com', 'tumbensuleyman@gmail.com');
COMMIT;
