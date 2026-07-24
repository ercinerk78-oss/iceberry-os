import { archiveUser, createUser, resetPassword, toggleUser, updateUser } from "@/app/settings/users/actions";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const inputClass = "h-10 rounded-lg border px-3";

type UsersSearchParams = {
  q?: string;
  role?: string;
  status?: string;
};

function formatDate(date: Date | null) {
  return date
    ? new Intl.DateTimeFormat("tr-TR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(date)
    : "-";
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<UsersSearchParams> }) {
  await requirePermission("users");

  const params = await searchParams;
  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      where: {
        AND: [
          params.q
            ? {
                OR: [
                  { name: { contains: params.q } },
                  { email: { contains: params.q } },
                  { phone: { contains: params.q } },
                ],
              }
            : {},
          params.role ? { role: params.role } : {},
          params.status === "active"
            ? { isActive: true, archivedAt: null }
            : params.status === "passive"
              ? { isActive: false, archivedAt: null }
              : params.status === "archived"
                ? { archivedAt: { not: null } }
                : {},
        ],
      },
      include: { roleRecord: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.role.findMany({ orderBy: { ad: "asc" } }),
  ]);

  return (
    <AppShell activeHref="/settings/users" eyebrow="Sistem ayarları" title="Kullanıcılar">
      <div className="space-y-5">
        <form className="flex flex-wrap gap-2 rounded-xl border bg-white p-4">
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Ad, e-posta veya telefon ara"
            className={`${inputClass} min-w-64`}
          />
          <select name="role" defaultValue={params.role} className={inputClass}>
            <option value="">Tüm roller</option>
            {roles.map((role) => (
              <option key={role.id} value={role.kod}>
                {role.ad}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={params.status} className={inputClass}>
            <option value="">Tüm durumlar</option>
            <option value="active">Aktif</option>
            <option value="passive">Pasif</option>
            <option value="archived">Arşivde</option>
          </select>
          <Button>Filtrele</Button>
        </form>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Yeni Kullanıcı</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createUser} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <input name="name" placeholder="Ad Soyad" className={inputClass} required />
              <input name="email" type="email" placeholder="E-posta" className={inputClass} required />
              <input name="phone" placeholder="Telefon" className={inputClass} />
              <select name="role" className={inputClass}>
                {roles.map((role) => (
                  <option key={role.id} value={role.kod}>
                    {role.ad}
                  </option>
                ))}
              </select>
              <input name="password" type="password" placeholder="Geçici şifre" className={inputClass} required />
              <Button className="md:col-span-2 xl:col-span-5">Kullanıcı Oluştur</Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-sm text-[#65705f]">{users.length} kullanıcı gösteriliyor.</p>

        <div className="space-y-3">
          {users.map((user) => (
            <Card key={user.id} className={`shadow-none ${user.archivedAt ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <form action={updateUser.bind(null, user.id)} className="grid gap-3 lg:grid-cols-[1fr_1fr_160px_190px_auto]">
                  <input name="name" defaultValue={user.name} className={inputClass} />
                  <input name="email" type="email" defaultValue={user.email} className={inputClass} />
                  <input name="phone" defaultValue={user.phone ?? ""} className={inputClass} />
                  <select name="role" defaultValue={user.roleRecord?.kod ?? user.role} className={inputClass}>
                    {roles.map((role) => (
                      <option key={role.id} value={role.kod}>
                        {role.ad}
                      </option>
                    ))}
                  </select>
                  <input name="password" type="hidden" value="" />
                  <Button variant="outline">Kaydet</Button>
                </form>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#65705f]">
                  <b>{user.roleRecord?.ad ?? user.role}</b>
                  <span>- {user.isActive ? "Aktif" : "Pasif"}</span>
                  <span>- Son giriş {formatDate(user.lastLoginAt)}</span>
                  <span>- Oluşturma {formatDate(user.createdAt)}</span>
                  {!user.archivedAt ? (
                    <>
                      <form action={toggleUser.bind(null, user.id)}>
                        <Button size="sm" variant="outline">
                          {user.isActive ? "Pasifleştir" : "Aktifleştir"}
                        </Button>
                      </form>
                      <form action={resetPassword.bind(null, user.id)} className="flex gap-1">
                        <input
                          name="password"
                          type="password"
                          placeholder="Yeni geçici şifre"
                          className="h-7 rounded border px-2"
                        />
                        <Button size="sm" variant="outline">
                          Şifreyi Sıfırla
                        </Button>
                      </form>
                      <form action={archiveUser.bind(null, user.id)}>
                        <Button size="sm" variant="destructive">
                          Arşivle
                        </Button>
                      </form>
                    </>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}

          {!users.length ? (
            <p className="rounded-xl border border-dashed p-10 text-center text-[#65705f]">
              Filtrelere uygun kullanıcı bulunamadı.
            </p>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
