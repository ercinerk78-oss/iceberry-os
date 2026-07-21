# Production Migration Checklist

Bu doküman production veritabanı migration süreçlerini Vercel production build öncesinde güvenli yönetmek için kullanılır.

## Temel Kurallar

- `prisma migrate reset` production ortamında çalıştırılmaz.
- Production verisi silinmez.
- Migration öncesi Supabase production yedeği alınır.
- Runtime `DATABASE_URL` transaction pooler bağlantısı olarak kalır.
- Migration için direct Postgres bağlantısı kullanılır.
- Secret değerleri loglara, issue'lara veya chat mesajlarına yazılmaz.

## Environment Variables

Runtime bağlantısı:

```text
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

Migration bağlantısı:

```text
DIRECT_URL=postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
```

`DATABASE_DIRECT_URL` da desteklenir, ancak standart isim olarak `DIRECT_URL` kullanılmalıdır.

## Vercel Ayarı

`DIRECT_URL` yalnızca Vercel Environment Variables içine secret olarak eklenir.

Önerilen ortamlar:

- Production: zorunlu
- Preview: yalnızca preview veritabanı varsa
- Development: yerel geliştirme için gerekli değil

## Migration Ön Kontrolü

Yedek alındıktan sonra:

```bash
npx prisma migrate status
```

Kontrol edilecekler:

- Başarısız migration var mı?
- Bekleyen migration var mı?
- `_prisma_migrations` tablosunda beklenen kayıtlar var mı?
- Production schema kod ile uyumlu mu?

## Migration Uygulama

Yalnızca yedek ve ön kontrol tamamlandıktan sonra:

```bash
npm run db:migrate:deploy
```

Bu komut `DIRECT_URL` veya `DATABASE_DIRECT_URL` yoksa hata vererek durur.

## Iceberry OS P2022 Kontrolü

`Document.openingProjectId` için beklenen migrationlar:

```text
20260717192000_opening_project_engine
20260717204500_opening_project_engine_guard
```

Kolon doğrulama:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'Document'
  and column_name = 'openingProjectId';
```

Index doğrulama:

```sql
select indexname, indexdef
from pg_indexes
where tablename = 'Document'
  and indexname = 'Document_openingProjectId_idx';
```

Foreign key doğrulama:

```sql
select conname
from pg_constraint
where conname = 'Document_openingProjectId_fkey';
```

## Deploy İlkesi

Vercel production build komutu migration çalıştırır. Migration başarısız olursa build durur ve uygulama deployu başarılı kabul edilmez.

Preview ve development ortamlarında production migration çalıştırılmaz.
