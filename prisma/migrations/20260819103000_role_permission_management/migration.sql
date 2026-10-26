-- Role bazlı menü ve işlem yetkilerini siteden yönetebilmek için eklenir.
-- Mevcut rol ve kullanıcı verilerini silmez; NULL değer mevcut kod fallback'i ile geriye uyumludur.
ALTER TABLE "Role"
ADD COLUMN IF NOT EXISTS "permissions" JSONB;
