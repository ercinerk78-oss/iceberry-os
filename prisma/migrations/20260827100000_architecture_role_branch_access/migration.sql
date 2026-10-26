-- Mimari Proje ve Uygulama ekibinin açılış projelerine bağlı şube bilgilerini görebilmesi için
-- mevcut özel rol izinlerine eksikse "branches" yetkisini ekler.
UPDATE "Role"
SET
  "permissions" = CASE
    WHEN "permissions" IS NULL THEN NULL
    WHEN jsonb_typeof("permissions") = 'array'
      AND NOT ("permissions" ? 'branches')
      THEN "permissions" || '["branches"]'::jsonb
    ELSE "permissions"
  END,
  "updatedAt" = NOW()
WHERE "kod" = 'ARCHITECTURE_PROJECT_IMPLEMENTATION'
  AND "permissions" IS NOT NULL
  AND jsonb_typeof("permissions") = 'array'
  AND NOT ("permissions" ? 'branches');
