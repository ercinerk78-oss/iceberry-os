# Production Migration Checklist

Bu dokuman production veritabani migration sureclerini Vercel production build oncesinde guvenli yonetmek icin kullanilir.

## Temel Kurallar

- `prisma migrate reset` production ortaminda calistirilmaz.
- `prisma db push` production schema duzeltmesi icin kullanilmaz.
- Production verisi silinmez.
- Manuel ve rastgele `ALTER TABLE` uygulanmaz.
- Migration oncesi Supabase production yedegi dogrulanir.
- Secret degerleri loglara, issue'lara veya chat mesajlarina yazilmaz.
- Migration basarisiz olursa build durur.

## Baglanti Modeli

Runtime baglantisi:

```text
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

Migration icin tercih edilen baglanti:

```text
DIRECT_URL=postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
```

Vercel build ortami Supabase Direct Connection adresine IPv6 nedeniyle ulasamiyorsa migration icin Supabase Shared Pooler Session Mode kullanilir:

```text
DIRECT_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
```

Migration icin `Transaction Pooler` kullanilmaz:

```text
aws-0-REGION.pooler.supabase.com:6543
```

`DATABASE_DIRECT_URL` da desteklenir, ancak standart isim olarak `DIRECT_URL` kullanilmalidir.

## Vercel Ayari

`DIRECT_URL` yalnizca Vercel Environment Variables icine secret olarak eklenir.

Ortam secimi:

- Production: zorunlu
- Preview: production veritabanina baglanmamali
- Development: yerel gelistirme icin gerekli degil

## Migration On Kontrolu

Yedek alindiktan sonra:

```bash
npx prisma migrate status
```

Kontrol edilecekler:

- Basarisiz migration var mi?
- Bekleyen migration var mi?
- `_prisma_migrations` tablosunda beklenen kayitlar var mi?
- Production schema kod ile uyumlu mu?

## Migration Uygulama

Vercel production build sirasinda:

```bash
npm run build
```

Build zinciri:

```bash
node scripts/run-production-migrations.mjs && node scripts/prisma-generate-safe.mjs && next build
```

Migration scripti `DIRECT_URL` veya `DATABASE_DIRECT_URL` yoksa hata vererek durur.

## Iceberry OS P2022 Kontrolu

`Document.openingProjectId` icin beklenen migrationlar:

```text
20260717192000_opening_project_engine
20260717204500_opening_project_engine_guard
```

Kolon dogrulama:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'Document'
  and column_name = 'openingProjectId';
```

Index dogrulama:

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'Document'
  and indexname = 'Document_openingProjectId_idx';
```

Foreign key dogrulama:

```sql
select conname
from pg_constraint
where conname = 'Document_openingProjectId_fkey';
```

## Deploy Ilkesi

Vercel production build komutu migration calistirir. Migration basarisiz olursa build durur ve uygulama deployu basarili kabul edilmez.

Preview ve development ortamlarinda production migration calistirilmaz.
