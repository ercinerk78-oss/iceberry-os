import type React from "react";
import { BookOpenCheck, CalendarDays, FileCheck2, GraduationCap, LibraryBig, Plus, ShieldCheck, Trophy, UsersRound } from "lucide-react";

import { assignTraining, createTrainingProgram, ensureAcademyDefaults, publishTrainingProgram } from "@/app/academy/actions";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  assignmentStatusLabels,
  certificateStatusLabels,
  corporateDocumentStatusLabels,
  dateTR,
  difficultyLabels,
  liveTrainingStatusLabels,
  percentTR,
  programStatusLabels,
} from "@/lib/academy";
import { AcademyService } from "@/lib/academy-service";
import { requireUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const initialState = { success: false, message: "" };

export default async function AcademyPage() {
  const user = await requireUser();
  const canManage = hasPermission(user.role, "academy.manage");
  const canAssign = hasPermission(user.role, "academy.assign");
  const canViewReports = hasPermission(user.role, "academy.reports");

  if (canManage) {
    await safe(AcademyService.ensureDefaults(user.id), undefined);
  }

  const data = await loadAcademyData();

  return (
    <AppShell
      activeHref="/academy"
      eyebrow="Eğitim, sertifika ve kurumsal doküman merkezi"
      title="Eğitim Akademisi"
      action={canManage ? <form action={ensureAcademyDefaults}><Button><ShieldCheck className="size-4" />Varsayılanları Hazırla</Button></form> : null}
    >
      <div className="space-y-5">
        {data.setupError ? (
          <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-none">
            Eğitim Akademisi veri tabanı hazırlığı tamamlanmamış görünüyor. Migration eklendi; deploy sonrası ekran otomatik çalışır hale gelecektir.
          </Card>
        ) : null}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Kpi title="Kategori" value={data.metrics.categoryCount} icon={<LibraryBig className="size-5" />} />
          <Kpi title="Yayımlı Eğitim" value={data.metrics.publishedProgramCount} icon={<GraduationCap className="size-5" />} />
          <Kpi title="Atama" value={data.metrics.assignmentCount} icon={<UsersRound className="size-5" />} />
          <Kpi title="Geciken Eğitim" value={data.metrics.overdueAssignmentCount} icon={<BookOpenCheck className="size-5" />} danger />
          <Kpi title="Sertifika" value={data.metrics.certificateCount} icon={<Trophy className="size-5" />} />
          <Kpi title="Doküman" value={data.metrics.corporateDocumentCount} icon={<FileCheck2 className="size-5" />} />
        </section>

        {canViewReports ? (
          <Card className="p-5 shadow-none">
            <div className="grid gap-3 md:grid-cols-4">
              <Info label="Eğitim uyum puanı" value={percentTR(data.compliance.score)} />
              <Info label="Tamamlanan eğitim" value={data.compliance.completed.toString()} />
              <Info label="Geciken kabul" value={data.metrics.overdueAcknowledgementCount.toString()} />
              <Info label="30 günde dolacak sertifika" value={data.metrics.expiringCertificateCount.toString()} />
            </div>
          </Card>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <section className="space-y-5">
            <Card className="overflow-hidden shadow-none">
              <Header title="Eğitim Programları" action={canManage ? "Yeni eğitim ekle" : undefined} />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-[#f8faf6] text-xs uppercase text-[#65705f]">
                    <tr>{["Eğitim", "Kategori", "Durum", "Zorluk", "Süre", "Modül", "Atama", "İşlem"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.overview.programs.map((program) => (
                      <tr key={program.id}>
                        <td className="px-4 py-4"><p className="font-semibold">{program.title}</p><p className="text-xs text-[#65705f]">v{program.version} · {program.code}</p></td>
                        <td className="px-4 py-4">{program.category.name}</td>
                        <td className="px-4 py-4"><Badge>{programStatusLabels[program.status]}</Badge></td>
                        <td className="px-4 py-4">{difficultyLabels[program.difficultyLevel]}</td>
                        <td className="px-4 py-4">{program.estimatedDurationMinutes} dk</td>
                        <td className="px-4 py-4">{program._count.modules}</td>
                        <td className="px-4 py-4">{program._count.assignments}</td>
                        <td className="px-4 py-4">
                          {canManage && program.status !== "PUBLISHED" ? <form action={publishTrainingProgram.bind(null, program.id)}><Button size="sm" variant="outline">Yayımla</Button></form> : <span className="text-[#65705f]">-</span>}
                        </td>
                      </tr>
                    ))}
                    {!data.overview.programs.length ? <tr><td colSpan={8} className="p-10 text-center text-[#65705f]">Henüz eğitim programı yok.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="grid gap-5 xl:grid-cols-2">
              <Card className="p-5 shadow-none">
                <h2 className="font-semibold">Son Eğitim Atamaları</h2>
                <div className="mt-4 space-y-3">
                  {data.overview.assignments.map((assignment) => (
                    <div key={assignment.id} className="rounded-lg border p-3 text-sm">
                      <p className="font-semibold">{assignment.program.title}</p>
                      <p className="mt-1 text-[#65705f]">Kullanıcı: {assignment.userId} · {assignmentStatusLabels[assignment.status]}</p>
                      <p className="mt-1 text-[#65705f]">Son tarih: {dateTR(assignment.dueAt)}</p>
                    </div>
                  ))}
                  {!data.overview.assignments.length ? <Empty text="Henüz eğitim ataması yok." /> : null}
                </div>
              </Card>

              <Card className="p-5 shadow-none">
                <h2 className="font-semibold">Kurumsal Dokümanlar</h2>
                <div className="mt-4 space-y-3">
                  {data.overview.documents.map((document) => (
                    <div key={document.id} className="rounded-lg border p-3 text-sm">
                      <p className="font-semibold">{document.title}</p>
                      <p className="mt-1 text-[#65705f]">{document.category.name} · {corporateDocumentStatusLabels[document.status]}</p>
                      <p className="mt-1 text-[#65705f]">Son versiyon: v{document.versions[0]?.version ?? 0}</p>
                    </div>
                  ))}
                  {!data.overview.documents.length ? <Empty text="Henüz kurumsal doküman yok." /> : null}
                </div>
              </Card>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <Card className="p-5 shadow-none">
                <h2 className="font-semibold">Sertifikalar</h2>
                <div className="mt-4 space-y-3">
                  {data.overview.certificates.map((certificate) => (
                    <div key={certificate.id} className="rounded-lg border p-3 text-sm">
                      <p className="font-semibold">{certificate.program.title}</p>
                      <p className="mt-1 text-[#65705f]">{certificate.certificateNumber} · {certificateStatusLabels[certificate.status]}</p>
                      <p className="mt-1 text-[#65705f]">Geçerlilik: {dateTR(certificate.validUntil)}</p>
                    </div>
                  ))}
                  {!data.overview.certificates.length ? <Empty text="Henüz sertifika yok." /> : null}
                </div>
              </Card>

              <Card className="p-5 shadow-none">
                <h2 className="flex items-center gap-2 font-semibold"><CalendarDays className="size-5" />Canlı Eğitim Takvimi</h2>
                <div className="mt-4 space-y-3">
                  {data.overview.liveSessions.map((session) => (
                    <div key={session.id} className="rounded-lg border p-3 text-sm">
                      <p className="font-semibold">{session.title}</p>
                      <p className="mt-1 text-[#65705f]">{dateTR(session.startsAt)} · {liveTrainingStatusLabels[session.status]}</p>
                    </div>
                  ))}
                  {!data.overview.liveSessions.length ? <Empty text="Yaklaşan canlı eğitim yok." /> : null}
                </div>
              </Card>
            </div>
          </section>

          <aside className="space-y-5">
            {canManage ? <ProgramForm categories={data.categories} /> : null}
            {canAssign ? <AssignmentForm programs={data.publishedPrograms} users={data.users} branches={data.branches} /> : null}
            <Card className="p-5 shadow-none">
              <h2 className="font-semibold">Sprint 8 Çekirdeği</h2>
              <div className="mt-3 space-y-2 text-sm text-[#65705f]">
                <p>Versiyonlu eğitim programı, modül, ders ve atama altyapısı aktif.</p>
                <p>Sınav, sertifika, doküman versiyonu ve kabul kayıtları gerçek tablolarda tutulur.</p>
                <p>Video dosyaları için doğrudan uygulama sunucusuna büyük dosya yükleme açılmadı; güvenli harici URL veya mevcut doküman erişimi kullanılmalı.</p>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

async function loadAcademyData() {
  try {
    const [metrics, overview, compliance, categories, publishedPrograms, users, branches] = await Promise.all([
      AcademyService.metrics(),
      AcademyService.latestOverview(),
      AcademyService.calculateCompliance(),
      prisma.trainingCategory.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
      prisma.trainingProgram.findMany({ where: { status: "PUBLISHED", archivedAt: null }, select: { id: true, title: true, version: true }, orderBy: { title: "asc" } }),
      prisma.user.findMany({ where: { isActive: true, archivedAt: null }, select: { id: true, name: true, role: true }, orderBy: { name: "asc" }, take: 100 }),
      prisma.branch.findMany({ where: { archivedAt: null }, select: { id: true, branchName: true, city: true }, orderBy: { branchName: "asc" }, take: 100 }),
    ]);
    return { metrics, overview, compliance, categories, publishedPrograms, users, branches, setupError: null };
  } catch (error) {
    console.error("[academy] page data load failed", error);
    return {
      metrics: {
        categoryCount: 0,
        programCount: 0,
        publishedProgramCount: 0,
        assignmentCount: 0,
        overdueAssignmentCount: 0,
        certificateCount: 0,
        expiringCertificateCount: 0,
        corporateDocumentCount: 0,
        acknowledgementCount: 0,
        overdueAcknowledgementCount: 0,
        liveSessionCount: 0,
      },
      overview: { programs: [], assignments: [], documents: [], certificates: [], liveSessions: [] },
      compliance: { total: 0, completed: 0, overdue: 0, score: 100 },
      categories: [],
      publishedPrograms: [],
      users: [],
      branches: [],
      setupError: "ACADEMY_DATA_LOAD_FAILED",
    };
  }
}

async function safe<T>(promise: Promise<T>, fallback: T) {
  try {
    return await promise;
  } catch (error) {
    console.error("[academy] safe operation failed", error);
    return fallback;
  }
}

function ProgramForm({ categories }: { categories: { id: string; name: string }[] }) {
  return (
    <Card className="p-5 shadow-none">
      <h2 className="flex items-center gap-2 font-semibold"><Plus className="size-5" />Eğitim Programı Oluştur</h2>
      <form action={createProgramFromForm} className="mt-4 grid gap-3">
        <input name="title" placeholder="Eğitim adı" className="h-10 rounded-lg border px-3 text-sm" required />
        <input name="code" placeholder="Eğitim kodu" className="h-10 rounded-lg border px-3 text-sm" required />
        <select name="categoryId" className="h-10 rounded-lg border px-3 text-sm" required>
          <option value="">Kategori seçin</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <select name="difficultyLevel" defaultValue="BEGINNER" className="h-10 rounded-lg border px-3 text-sm">
          {Object.entries(difficultyLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <textarea name="description" placeholder="Açıklama" rows={3} className="rounded-lg border p-3 text-sm" />
        <div className="grid grid-cols-3 gap-2">
          <input name="estimatedDurationMinutes" type="number" defaultValue={60} aria-label="Süre" className="h-10 rounded-lg border px-3 text-sm" />
          <input name="passingScore" type="number" defaultValue={70} aria-label="Başarı puanı" className="h-10 rounded-lg border px-3 text-sm" />
          <input name="maximumAttempts" type="number" defaultValue={3} aria-label="Deneme hakkı" className="h-10 rounded-lg border px-3 text-sm" />
        </div>
        <label className="flex items-center gap-2 text-sm"><input name="isMandatory" type="checkbox" />Zorunlu eğitim</label>
        <label className="flex items-center gap-2 text-sm"><input name="requiresCertificate" type="checkbox" />Sertifika üret</label>
        <label className="flex items-center gap-2 text-sm"><input name="requiresFinalExam" type="checkbox" />Final sınavı gerekli</label>
        <Button>Oluştur</Button>
      </form>
    </Card>
  );
}

function AssignmentForm({ programs, users, branches }: { programs: { id: string; title: string; version: number }[]; users: { id: string; name: string; role: string }[]; branches: { id: string; branchName: string; city: string }[] }) {
  return (
    <Card className="p-5 shadow-none">
      <h2 className="font-semibold">Eğitim Ata</h2>
      <form action={assignTrainingFromForm} className="mt-4 grid gap-3">
        <select name="programId" className="h-10 rounded-lg border px-3 text-sm" required>
          <option value="">Yayımlı eğitim seçin</option>
          {programs.map((program) => <option key={program.id} value={program.id}>{program.title} v{program.version}</option>)}
        </select>
        <select name="userId" className="h-10 rounded-lg border px-3 text-sm" required>
          <option value="">Kullanıcı seçin</option>
          {users.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.role}</option>)}
        </select>
        <select name="branchId" className="h-10 rounded-lg border px-3 text-sm">
          <option value="">Şube bağlantısı yok</option>
          {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branchName} · {branch.city}</option>)}
        </select>
        <label className="grid gap-1 text-sm">
          <span>Son tarih</span>
          <input name="dueAt" type="date" className="h-10 rounded-lg border px-3 text-sm" />
        </label>
        <Button>Ata</Button>
      </form>
    </Card>
  );
}

function Kpi({ title, value, icon, danger = false }: { title: string; value: number; icon: React.ReactNode; danger?: boolean }) {
  return (
    <Card className={`p-4 shadow-none ${danger ? "border-rose-200" : ""}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#65705f]">{title}</p>
        <span className={danger ? "text-rose-700" : "text-[#2f5f20]"}>{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold">{value.toLocaleString("tr-TR")}</p>
    </Card>
  );
}

function Header({ title, action }: { title: string; action?: string }) {
  return (
    <div className="flex items-center justify-between border-b p-4">
      <h2 className="font-semibold">{title}</h2>
      {action ? <Badge variant="secondary">{action}</Badge> : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border bg-[#f8faf6] p-4"><p className="text-xs font-medium uppercase text-[#65705f]">{label}</p><p className="mt-2 text-sm font-semibold">{value}</p></div>;
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-[#65705f]">{text}</p>;
}

async function createProgramFromForm(formData: FormData) {
  "use server";
  await createTrainingProgram(initialState, formData);
}

async function assignTrainingFromForm(formData: FormData) {
  "use server";
  await assignTraining(initialState, formData);
}
