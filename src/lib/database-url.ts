export function normalizePrismaRuntimeUrl(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) return databaseUrl;

  try {
    const url = new URL(databaseUrl);
    const isSupabasePooler = url.hostname.endsWith(".pooler.supabase.com");

    if (isSupabasePooler && !url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }

    return url.toString();
  } catch {
    return databaseUrl;
  }
}

export function applyPrismaRuntimeUrl() {
  const normalizedUrl = normalizePrismaRuntimeUrl();
  if (normalizedUrl) process.env.DATABASE_URL = normalizedUrl;
}
