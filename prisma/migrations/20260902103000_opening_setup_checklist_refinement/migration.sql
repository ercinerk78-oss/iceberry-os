-- Açılış kurulum checklistini güncel operasyon diline taşır.
-- Veri silmez; eski/gereksiz kalemler yalnızca arşivlenir.

UPDATE "OpeningSetupChecklistItem" item
SET
  "title" = 'Cihaz su giderlerinin altyapı hazırlığı',
  "templateKey" = 'setup_altyapi_cihaz_su_giderlerinin_altyapi_hazirligi',
  "sortOrder" = 30,
  "updatedAt" = NOW()
WHERE item."templateKey" = 'setup_altyapi_su_tesisati'
  AND item."archivedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "OpeningSetupChecklistItem" existing
    WHERE existing."openingProjectId" = item."openingProjectId"
      AND existing."templateKey" = 'setup_altyapi_cihaz_su_giderlerinin_altyapi_hazirligi'
      AND existing."id" <> item."id"
  );

UPDATE "OpeningSetupChecklistItem" item
SET
  "title" = 'Duvar örme',
  "templateKey" = 'setup_mimari_ve_insaat_duvar_orme',
  "updatedAt" = NOW()
WHERE item."templateKey" = 'setup_mimari_ve_insaat_tas_duvar'
  AND item."archivedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "OpeningSetupChecklistItem" existing
    WHERE existing."openingProjectId" = item."openingProjectId"
      AND existing."templateKey" = 'setup_mimari_ve_insaat_duvar_orme'
      AND existing."id" <> item."id"
  );

UPDATE "OpeningSetupChecklistItem" item
SET
  "title" = 'TV demir altyapısı',
  "templateKey" = 'setup_mimari_ve_insaat_tv_demir_altyapisi',
  "updatedAt" = NOW()
WHERE item."templateKey" = 'setup_mimari_ve_insaat_demir_isleri'
  AND item."archivedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "OpeningSetupChecklistItem" existing
    WHERE existing."openingProjectId" = item."openingProjectId"
      AND existing."templateKey" = 'setup_mimari_ve_insaat_tv_demir_altyapisi'
      AND existing."id" <> item."id"
  );

UPDATE "OpeningSetupChecklistItem" item
SET
  "title" = 'Boya',
  "templateKey" = 'setup_mimari_ve_insaat_boya',
  "updatedAt" = NOW()
WHERE item."templateKey" = 'setup_mimari_ve_insaat_badana'
  AND item."archivedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "OpeningSetupChecklistItem" existing
    WHERE existing."openingProjectId" = item."openingProjectId"
      AND existing."templateKey" = 'setup_mimari_ve_insaat_boya'
      AND existing."id" <> item."id"
  );

UPDATE "OpeningSetupChecklistItem" item
SET
  "title" = 'Tente',
  "templateKey" = 'setup_mimari_ve_insaat_tente',
  "updatedAt" = NOW()
WHERE item."templateKey" = 'setup_mimari_ve_insaat_giris_duzenlemesi'
  AND item."archivedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "OpeningSetupChecklistItem" existing
    WHERE existing."openingProjectId" = item."openingProjectId"
      AND existing."templateKey" = 'setup_mimari_ve_insaat_tente'
      AND existing."id" <> item."id"
  );

UPDATE "OpeningSetupChecklistItem" item
SET
  "category" = 'Mimari ve İnşaat',
  "title" = 'Mobilya imalat ve montaj',
  "responsibleDepartment" = 'ARCHITECTURE',
  "templateKey" = 'setup_mimari_ve_insaat_mobilya_imalat_ve_montaj',
  "sortOrder" = 155,
  "updatedAt" = NOW()
WHERE item."templateKey" = 'setup_mobilya_ve_dekor_mutfak_mobilyalari'
  AND item."archivedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "OpeningSetupChecklistItem" existing
    WHERE existing."openingProjectId" = item."openingProjectId"
      AND existing."templateKey" = 'setup_mimari_ve_insaat_mobilya_imalat_ve_montaj'
      AND existing."id" <> item."id"
  );

UPDATE "OpeningSetupChecklistItem"
SET
  "archivedAt" = NOW(),
  "updatedAt" = NOW()
WHERE "templateKey" IN (
  'setup_mobilya_ve_dekor_oturma_gruplari',
  'setup_mobilya_ve_dekor_dekor',
  'setup_mobilya_ve_dekor_peyzaj'
)
  AND "archivedAt" IS NULL;
