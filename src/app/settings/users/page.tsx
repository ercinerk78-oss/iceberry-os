import { archiveUser, createUser, resetPassword, toggleUser, updateRolePermissions, updateUser } from "@/app/settings/users/actions";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { normalizePermissions, PERMISSION_DEFINITIONS } from "@/lib/permissions";
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

const permissionGroups = PERMISSION_DEFINITIONS.reduce<Record<string, typeof PERMISSION_DEFINITIONS>>((groups, permission) => {
  groups[permission.group] = [...(groups[permission.group] ?? []), permission];
  return groups;
}, {});

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

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Rol Yetkileri</CardTitle>
            <p className="text-sm text-[#65705f]">
              Her rolün hangi sekmeleri ve işlemleri göreceğini buradan yönetin. Değişiklikten sonra ilgili kullanıcılar yeniden giriş yaptığında menüleri güncellenir.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {roles.map((role) => {
              const selected = new Set(normalizePermissions(role.permissions, role.kod));

              return (
                <details key={role.id} className="rounded-lg border border-[#dfe4dc] bg-[#f8faf6] p-4">
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{role.ad}</h3>
                        <p className="text-sm text-[#65705f]">{role.aciklama || role.kod}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#65705f]">
                        {selected.size} yetki
                      </span>
                    </div>
                  </summary>
                  <form action={updateRolePermissions.bind(null, role.id)} className="mt-4 space-y-4">
                    {Object.entries(permissionGroups).map(([groupName, permissions]) => (
                      <section key={groupName} className="rounded-lg border bg-white p-3">
                        <h4 className="font-medium">{groupName}</h4>
                        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                          {permissions.map((permission) => (
                            <label key={permission.key} className="flex gap-3 rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-3 text-sm">
                              <input
                                name="permissions"
                                type="checkbox"
                                value={permission.key}
                                defaultChecked={selected.has(permission.key)}
                                className="mt-1"
                              />
                              <span>
                                <span className="block font-medium">{permission.label}</span>
                                <span className="mt-1 block text-xs leading-5 text-[#65705f]">{permission.description}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </section>
                    ))}
                    <Button className="bg-[#17201b] text-white">Rol Yetkilerini Kaydet</Button>
                  </form>
                </details>
              );
            })}
          </CardContent>
        </Card>

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
