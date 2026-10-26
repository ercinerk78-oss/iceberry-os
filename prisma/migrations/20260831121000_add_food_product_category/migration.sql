INSERT INTO "ProductCategory" ("id", "name", "code", "description", "sortOrder", "orderIndex", "isActive", "createdAt", "updatedAt")
VALUES ('cat_food', 'Gıda', 'FOOD', 'Gıda ürünleri', 60, 60, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
