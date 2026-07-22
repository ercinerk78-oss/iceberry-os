"use client";

import type React from "react";
import { useActionState, useMemo, useRef, useState, useTransition } from "react";
import {
  Archive,
  BadgeCheck,
  BookOpenCheck,
  Clock3,
  Download,
  FileSpreadsheet,
  FileText,
  Film,
  GraduationCap,
  ImageIcon,
  LinkIcon,
  LoaderCircle,
  Play,
  Plus,
  Search,
  Upload,
  UsersRound,
} from "lucide-react";

import {
  addAcademyMediaFiles,
  addAcademyMediaLink,
  assignTraining,
  createTrainingProgram,
  recordLessonProgress,
  setTrainingProgramStatus,
  updateTrainingProgram,
} from "@/app/academy/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { academyMediaAccept, academyMediaTypeLabels, formatAcademyFileSize } from "@/lib/academy-lms";
import { difficultyLabels, percentTR, programStatusLabels } from "@/lib/academy";

type Category = { id: string; name: string };
type UserOption = { id: string; name: string; role: string };
type BranchOption = { id: string; branchName: string; city: string };
type MediaAsset = {
  id: string;
  lessonId: string | null;
  title: string;
  description: string | null;
  mediaType: string;
  sourceType: string;
  fileUrl: string | null;
  mimeType: string | null;
  fileSize: number | null;
  durationSeconds: number | null;
  sortOrder: number;
  thumbnailUrl: string | null;
  progressPercentage: number;
  lastPositionSeconds: number;
  completed: boolean;
};
type Program = {
  id: string;
  title: string;
  code: string;
  description: string | null;
  status: keyof typeof programStatusLabels;
  difficultyLevel: keyof typeof difficultyLabels;
  estimatedDurationMinutes: number;
  passingScore: number;
  maximumAttempts: number;
  isMandatory: boolean;
  requiresCertificate: boolean;
  requiresFinalExam: boolean;
  instructorName: string | null;
  sortOrder: number;
  tags: string | null;
  category: Category;
  mediaAssets: MediaAsset[];
  stats: {
    totalViews: number;
    completedUsers: number;
    inProgressUsers: number;
    averageCompletion: number;
    assignmentCount: number;
  };
};
type Metrics = {
  totalPrograms: number;
  publishedPrograms: number;
  totalMedia: number;
  totalVideoDurationMinutes: number;
  completionRate: number;
  activeLearners: number;
};

const initialState = { success: false, message: "" };
const inputClass = "h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:border-[#93d957]";
const textAreaClass = "rounded-lg border bg-background p-3 text-sm outline-none focus:border-[#93d957]";

export function AcademyLmsClient({
  programs,
  categories,
  users,
  branches,
  metrics,
  filters,
  canManage,
  canAssign,
}: {
  programs: Program[];
  categories: Category[];
  users: UserOption[];
  branches: BranchOption[];
  metrics: Metrics;
  filters: { q: string; categoryId: string; mediaType: string; tag: string; instructor: string };
  canManage: boolean;
  canAssign: boolean;
}) {
  const [activeProgramId, setActiveProgramId] = useState(programs[0]?.id || "");
  const activeProgram = useMemo(() => programs.find((program) => program.id === activeProgramId) || programs[0], [activeProgramId, programs]);
  const topMedia = activeProgram?.mediaAssets[0] || null;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard title="Toplam eğitim" value={metrics.totalPrograms} icon={<GraduationCap />} />
        <MetricCard title="Yayındaki eğitim" value={metrics.publishedPrograms} icon={<BadgeCheck />} />
        <MetricCard title="Toplam içerik" value={metrics.totalMedia} icon={<Film />} />
        <MetricCard title="Video süresi" value={`${metrics.totalVideoDurationMinutes} dk`} icon={<Clock3 />} />
        <MetricCard title="Tamamlama" value={percentTR(metrics.completionRate)} icon={<BookOpenCheck />} />
        <MetricCard title="Aktif öğrenen" value={metrics.activeLearners} icon={<UsersRound />} />
      </section>

      <Card className="overflow-hidden border-[#dfe4dc] bg-[#17201b] text-white shadow-none dark:border-white/10">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="min-h-[360px] p-5 md:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-white/10 text-white">{activeProgram?.category.name || "Akademi"}</Badge>
              <Badge className="bg-[#93d957] text-[#17201b]">{activeProgram ? programStatusLabels[activeProgram.status] : "Taslak"}</Badge>
            </div>
            <h2 className="mt-5 max-w-3xl text-2xl font-semibold md:text-4xl">{activeProgram?.title || "Eğitim kataloğu hazırlanıyor"}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72">{activeProgram?.description || "Yayınlanan eğitimler burada Netflix benzeri kart yapısı ve kaldığın yerden devam akışıyla listelenecek."}</p>
            <div className="mt-5 flex flex-wrap gap-2 text-sm text-white/80">
              <span>{activeProgram?.instructorName || "Eğitmen belirtilmedi"}</span>
              <span>•</span>
              <span>{activeProgram ? difficultyLabels[activeProgram.difficultyLevel] : "Başlangıç"}</span>
              <span>•</span>
              <span>{activeProgram?.estimatedDurationMinutes || 0} dk</span>
            </div>
            {topMedia ? (
              <div className="mt-7 flex flex-wrap gap-2">
                <Button onClick={() => document.getElementById(`media-${topMedia.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} className="bg-white text-[#17201b] hover:bg-white/90">
                  <Play className="size-4" /> Kaldığın yerden devam et
                </Button>
                <Button asChild variant="outline" className="border-white/30 bg-white/5 text-white hover:bg-white/10">
                  <a href={`/api/academy/media/${topMedia.id}`} target="_blank" rel="noreferrer">
                    <Download className="size-4" /> İçeriği aç
                  </a>
                </Button>
              </div>
            ) : null}
          </div>
          <div className="grid min-h-[360px] content-end bg-[radial-gradient(circle_at_top,#93d957_0,#416f32_35%,#17201b_68%)] p-5">
            <div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-sm text-white/70">Eğitim dashboard&apos;u</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <HeroStat label="Toplam izlenme" value={activeProgram?.stats.totalViews || 0} />
                <HeroStat label="Tamamlayan" value={activeProgram?.stats.completedUsers || 0} />
                <HeroStat label="Devam eden" value={activeProgram?.stats.inProgressUsers || 0} />
                <HeroStat label="Ortalama" value={percentTR(activeProgram?.stats.averageCompletion || 0)} />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <FilterBar categories={categories} filters={filters} />

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <section className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {programs.map((program) => (
              <ProgramCard key={program.id} program={program} active={program.id === activeProgram?.id} onSelect={() => setActiveProgramId(program.id)} />
            ))}
            {!programs.length ? <EmptyState text="Arama kriterlerine uygun eğitim bulunamadı." /> : null}
          </div>

          {activeProgram ? <MediaLibrary program={activeProgram} /> : null}
        </section>

        <aside className="space-y-5">
          {canManage ? <ProgramCreateForm categories={categories} /> : null}
          {canManage && activeProgram ? <ProgramEditForm program={activeProgram} categories={categories} /> : null}
          {canManage && activeProgram ? <MediaForms program={activeProgram} /> : null}
          {canAssign ? <AssignmentForm programs={programs.filter((program) => program.status === "PUBLISHED")} users={users} branches={branches} /> : null}
        </aside>
      </div>
    </div>
  );
}

function ProgramCard({ program, active, onSelect }: { program: Program; active: boolean; onSelect: () => void }) {
  const firstMedia = program.mediaAssets[0];
  const progress = firstMedia?.progressPercentage || 0;
  return (
    <button type="button" onClick={onSelect} className={`overflow-hidden rounded-lg border text-left transition hover:-translate-y-0.5 hover:shadow-md ${active ? "border-[#93d957]" : "border-[#dfe4dc] dark:border-white/10"}`}>
      <div className="relative aspect-video bg-[#17201b]">
        {firstMedia?.thumbnailUrl ? (
          <div className="size-full bg-cover bg-center" style={{ backgroundImage: `url("${firstMedia.thumbnailUrl}")` }} aria-label={`${program.title} kapak görseli`} />
        ) : (
          <div className="grid size-full place-items-center text-white/70"><MediaIcon mediaType={firstMedia?.mediaType || "VIDEO"} /></div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2 py-1 text-xs text-white">{programStatusLabels[program.status]}</span>
        {progress >= 100 ? <span className="absolute right-3 top-3 rounded-full bg-[#93d957] px-2 py-1 text-xs font-semibold text-[#17201b]">Tamamlandı</span> : null}
      </div>
      <div className="space-y-3 bg-background p-4">
        <div>
          <p className="line-clamp-1 font-semibold">{program.title}</p>
          <p className="mt-1 text-xs text-[#65705f]">{program.category.name} • {program.instructorName || "Eğitmen yok"}</p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[#dfe4dc]">
          <div className="h-full rounded-full bg-[#93d957]" style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs text-[#65705f]">
          <span>{program.mediaAssets.length} içerik</span>
          <span>{program.estimatedDurationMinutes} dk</span>
        </div>
      </div>
    </button>
  );
}

function MediaLibrary({ program }: { program: Program }) {
  return (
    <Card className="p-5 shadow-none">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Eğitim İçerikleri</h2>
          <p className="text-sm text-[#65705f]">Video, PDF, Office dokümanı, görsel, ZIP ve harici video linkleri.</p>
        </div>
        <Badge variant="outline">{program.mediaAssets.length} medya</Badge>
      </div>
      <div className="mt-5 grid gap-4">
        {program.mediaAssets.map((media) => <MediaViewer key={media.id} media={media} />)}
        {!program.mediaAssets.length ? <EmptyState text="Bu eğitime henüz medya eklenmedi." /> : null}
      </div>
    </Card>
  );
}

function MediaViewer({ media }: { media: MediaAsset }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastReport = useRef(0);
  const [isPending, startTransition] = useTransition();

  const saveProgress = (completed = false) => {
    if (!media.lessonId) return;
    const video = videoRef.current;
    const duration = video?.duration && Number.isFinite(video.duration) ? video.duration : media.durationSeconds || 0;
    const currentTime = video?.currentTime || media.lastPositionSeconds || 0;
    const progress = duration ? (currentTime / duration) * 100 : completed ? 100 : media.progressPercentage;
    startTransition(() => {
      void recordLessonProgress({
        lessonId: media.lessonId as string,
        progressPercentage: progress,
        watchedSeconds: Math.round(currentTime),
        lastPositionSeconds: Math.round(currentTime),
        completed,
      });
    });
  };

  const onTimeUpdate = () => {
    const now = Date.now();
    if (now - lastReport.current < 10000) return;
    lastReport.current = now;
    saveProgress(false);
  };

  return (
    <article id={`media-${media.id}`} className="rounded-lg border border-[#dfe4dc] p-4 dark:border-white/10">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{academyMediaTypeLabels[media.mediaType] || media.mediaType}</Badge>
            {media.completed ? <Badge className="bg-[#93d957] text-[#17201b]">Tamamlandı</Badge> : null}
          </div>
          <h3 className="mt-2 font-semibold">{media.title}</h3>
          {media.description ? <p className="mt-1 text-sm text-[#65705f]">{media.description}</p> : null}
          <p className="mt-2 text-xs text-[#65705f]">{formatAcademyFileSize(media.fileSize)} • İlerleme {percentTR(media.progressPercentage)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <a href={`/api/academy/media/${media.id}`} target="_blank" rel="noreferrer"><LinkIcon className="size-4" /> Aç</a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={`/api/academy/media/${media.id}?download=1`}><Download className="size-4" /> İndir</a>
          </Button>
          {media.lessonId ? (
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => saveProgress(true)}>
              {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />} Tamamlandı
            </Button>
          ) : null}
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border bg-[#f8faf6] dark:bg-white/5">
        {media.mediaType === "VIDEO" && media.sourceType === "FILE" ? (
          <video
            ref={videoRef}
            src={`/api/academy/media/${media.id}`}
            controls
            preload="metadata"
            className="aspect-video w-full bg-black"
            onLoadedMetadata={(event) => {
              if (media.lastPositionSeconds > 0) event.currentTarget.currentTime = media.lastPositionSeconds;
            }}
            onTimeUpdate={onTimeUpdate}
            onEnded={() => saveProgress(true)}
          />
        ) : media.sourceType === "YOUTUBE" || media.sourceType === "VIMEO" ? (
          <iframe title={media.title} src={embedUrl(media.fileUrl || "")} className="aspect-video w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
        ) : media.mediaType === "IMAGE" ? (
          <iframe title={media.title} src={`/api/academy/media/${media.id}`} className="h-[520px] w-full" />
        ) : media.mediaType === "PDF" ? (
          <iframe title={media.title} src={`/api/academy/media/${media.id}`} className="h-[520px] w-full" />
        ) : (
          <div className="grid min-h-36 place-items-center p-8 text-center text-sm text-[#65705f]">
            <div>
              <MediaIcon mediaType={media.mediaType} />
              <p className="mt-2">Bu içerik uygulama içinde desteklenmiyorsa indirerek açabilirsiniz.</p>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function FilterBar({ categories, filters }: { categories: Category[]; filters: { q: string; categoryId: string; mediaType: string; tag: string; instructor: string } }) {
  return (
    <Card className="p-4 shadow-none">
      <form method="get" className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto]">
        <label className="flex h-10 items-center gap-2 rounded-lg border px-3">
          <Search className="size-4 text-[#65705f]" />
          <input name="q" defaultValue={filters.q} placeholder="Başlık, açıklama veya kod ara" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
        <select name="categoryId" defaultValue={filters.categoryId} className={inputClass}>
          <option value="">Tüm kategoriler</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <select name="mediaType" defaultValue={filters.mediaType} className={inputClass}>
          <option value="">Tüm içerikler</option>
          {Object.entries(academyMediaTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <input name="tag" defaultValue={filters.tag} placeholder="Etiket" className={inputClass} />
        <input name="instructor" defaultValue={filters.instructor} placeholder="Eğitmen" className={inputClass} />
        <Button><Search className="size-4" /> Ara</Button>
      </form>
    </Card>
  );
}

function ProgramCreateForm({ categories }: { categories: Category[] }) {
  const [state, action, pending] = useActionState(createTrainingProgram, initialState);
  return (
    <Card className="p-5 shadow-none">
      <h2 className="flex items-center gap-2 font-semibold"><Plus className="size-5" />Yeni Eğitim Oluştur</h2>
      <ProgramFields action={action} categories={categories} pending={pending} state={state} submitLabel="Oluştur" />
    </Card>
  );
}

function ProgramEditForm({ program, categories }: { program: Program; categories: Category[] }) {
  const [state, action, pending] = useActionState(updateTrainingProgram.bind(null, program.id), initialState);
  return (
    <Card className="p-5 shadow-none">
      <h2 className="font-semibold">Eğitimi Düzenle</h2>
      <ProgramFields action={action} categories={categories} pending={pending} state={state} program={program} submitLabel="Güncelle" />
      <div className="mt-3 flex flex-wrap gap-2">
        <form action={setTrainingProgramStatus.bind(null, program.id, "DRAFT")}><Button size="sm" variant="outline">Taslak</Button></form>
        <form action={setTrainingProgramStatus.bind(null, program.id, "PUBLISHED")}><Button size="sm" variant="outline">Yayında</Button></form>
        <form action={setTrainingProgramStatus.bind(null, program.id, "ARCHIVED")}><Button size="sm" variant="destructive"><Archive className="size-4" /> Sil</Button></form>
      </div>
    </Card>
  );
}

function ProgramFields({
  action,
  categories,
  pending,
  state,
  program,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  categories: Category[];
  pending: boolean;
  state: { success: boolean; message: string };
  program?: Program;
  submitLabel: string;
}) {
  return (
    <form action={action} className="mt-4 grid gap-3">
      <input name="title" defaultValue={program?.title || ""} placeholder="Eğitim adı" className={inputClass} required />
      <input name="code" defaultValue={program?.code || ""} placeholder="Eğitim kodu" className={inputClass} required />
      <select name="categoryId" defaultValue={program?.category.id || ""} className={inputClass} required>
        <option value="">Kategori seçin</option>
        {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
      </select>
      <input name="instructorName" defaultValue={program?.instructorName || ""} placeholder="Eğitmen" className={inputClass} />
      <div className="grid grid-cols-2 gap-2">
        <select name="difficultyLevel" defaultValue={program?.difficultyLevel || "BEGINNER"} className={inputClass}>
          {Object.entries(difficultyLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <input name="estimatedDurationMinutes" type="number" min={0} defaultValue={program?.estimatedDurationMinutes ?? 60} aria-label="Süre" className={inputClass} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <input name="sortOrder" type="number" min={0} defaultValue={program?.sortOrder ?? 0} aria-label="Sıralama" className={inputClass} />
        <input name="passingScore" type="number" min={0} max={100} defaultValue={program?.passingScore ?? 70} aria-label="Başarı puanı" className={inputClass} />
        <input name="maximumAttempts" type="number" min={1} max={20} defaultValue={program?.maximumAttempts ?? 3} aria-label="Deneme hakkı" className={inputClass} />
      </div>
      <input name="tags" defaultValue={program?.tags || ""} placeholder="Etiketler: hijyen, operasyon, kasa" className={inputClass} />
      <textarea name="description" defaultValue={program?.description || ""} placeholder="Açıklama" rows={3} className={textAreaClass} />
      <label className="flex items-center gap-2 text-sm"><input name="isMandatory" type="checkbox" defaultChecked={program?.isMandatory ?? false} />Zorunlu eğitim</label>
      <label className="flex items-center gap-2 text-sm"><input name="requiresCertificate" type="checkbox" defaultChecked={program?.requiresCertificate ?? false} />Sertifika üret</label>
      <label className="flex items-center gap-2 text-sm"><input name="requiresFinalExam" type="checkbox" defaultChecked={program?.requiresFinalExam ?? false} />Final sınavı gerekli</label>
      {state.message ? <p className={`rounded-lg p-3 text-sm ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{state.message}</p> : null}
      <Button disabled={pending}>{pending ? "Kaydediliyor..." : submitLabel}</Button>
    </form>
  );
}

function MediaForms({ program }: { program: Program }) {
  const [uploadState, uploadAction, uploadPending] = useActionState(addAcademyMediaFiles, initialState);
  const [linkState, linkAction, linkPending] = useActionState(addAcademyMediaLink, initialState);
  return (
    <Card className="p-5 shadow-none">
      <h2 className="font-semibold">İçerik Ekle</h2>
      <form action={uploadAction} className="mt-4 grid gap-3">
        <input type="hidden" name="programId" value={program.id} />
        <input name="title" placeholder="Başlık boşsa dosya adı kullanılır" className={inputClass} />
        <textarea name="description" placeholder="Açıklama" rows={2} className={textAreaClass} />
        <input name="thumbnailUrl" placeholder="Thumbnail URL (opsiyonel)" className={inputClass} />
        <div className="grid grid-cols-2 gap-2">
          <input name="durationSeconds" type="number" min={0} placeholder="Süre sn" className={inputClass} />
          <input name="sortOrder" type="number" min={0} defaultValue={program.mediaAssets.length + 1} aria-label="Sıralama" className={inputClass} />
        </div>
        <input name="files" type="file" multiple accept={academyMediaAccept} className="rounded-lg border bg-background p-2 text-sm" />
        <p className="text-xs text-[#65705f]">MP4, MOV, WEBM, PDF, Word, Excel, PowerPoint, JPG, PNG ve ZIP desteklenir. Dosya başına 100 MB.</p>
        {uploadState.message ? <p className={`rounded-lg p-3 text-sm ${uploadState.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{uploadState.message}</p> : null}
        <Button disabled={uploadPending}><Upload className="size-4" />{uploadPending ? "Yükleniyor..." : "Dosya Yükle"}</Button>
      </form>

      <form action={linkAction} className="mt-5 grid gap-3 border-t pt-5">
        <input type="hidden" name="programId" value={program.id} />
        <input name="title" required placeholder="Video başlığı" className={inputClass} />
        <input name="url" required placeholder="YouTube veya Vimeo linki" className={inputClass} />
        <input name="thumbnailUrl" placeholder="Thumbnail URL (opsiyonel)" className={inputClass} />
        <div className="grid grid-cols-2 gap-2">
          <input name="durationSeconds" type="number" min={0} placeholder="Süre sn" className={inputClass} />
          <input name="sortOrder" type="number" min={0} defaultValue={program.mediaAssets.length + 1} aria-label="Sıralama" className={inputClass} />
        </div>
        <textarea name="description" placeholder="Açıklama" rows={2} className={textAreaClass} />
        {linkState.message ? <p className={`rounded-lg p-3 text-sm ${linkState.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{linkState.message}</p> : null}
        <Button disabled={linkPending} variant="outline"><LinkIcon className="size-4" />{linkPending ? "Ekleniyor..." : "Video Linki Ekle"}</Button>
      </form>
    </Card>
  );
}

function AssignmentForm({ programs, users, branches }: { programs: Program[]; users: UserOption[]; branches: BranchOption[] }) {
  const [state, action, pending] = useActionState(assignTraining, initialState);
  return (
    <Card className="p-5 shadow-none">
      <h2 className="font-semibold">Eğitim Ata</h2>
      <form action={action} className="mt-4 grid gap-3">
        <select name="programId" className={inputClass} required>
          <option value="">Yayınlanmış eğitim seçin</option>
          {programs.map((program) => <option key={program.id} value={program.id}>{program.title}</option>)}
        </select>
        <select name="userId" className={inputClass} required>
          <option value="">Kullanıcı seçin</option>
          {users.map((user) => <option key={user.id} value={user.id}>{user.name} • {user.role}</option>)}
        </select>
        <select name="branchId" className={inputClass}>
          <option value="">Şube bağlantısı yok</option>
          {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branchName} • {branch.city}</option>)}
        </select>
        <input name="dueAt" type="date" className={inputClass} />
        {state.message ? <p className={`rounded-lg p-3 text-sm ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{state.message}</p> : null}
        <Button disabled={pending}>{pending ? "Atanıyor..." : "Ata"}</Button>
      </form>
    </Card>
  );
}

function MetricCard({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Card className="p-4 shadow-none">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#65705f]">{title}</p>
        <span className="text-[#2f5f20] [&_svg]:size-5">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold">{typeof value === "number" ? value.toLocaleString("tr-TR") : value}</p>
    </Card>
  );
}

function HeroStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-white/10 p-3">
      <p className="text-xs text-white/65">{label}</p>
      <p className="mt-1 text-lg font-semibold">{typeof value === "number" ? value.toLocaleString("tr-TR") : value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed p-10 text-center text-sm text-[#65705f]">{text}</p>;
}

function MediaIcon({ mediaType }: { mediaType: string }) {
  const className = "mx-auto size-8";
  if (mediaType === "VIDEO" || mediaType === "YOUTUBE" || mediaType === "VIMEO") return <Film className={className} />;
  if (mediaType === "IMAGE") return <ImageIcon className={className} />;
  if (mediaType === "EXCEL") return <FileSpreadsheet className={className} />;
  return <FileText className={className} />;
}

function embedUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return `https://www.youtube.com/embed/${parsed.pathname.slice(1)}`;
    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    if (parsed.hostname.includes("vimeo.com")) return `https://player.vimeo.com/video/${parsed.pathname.split("/").filter(Boolean).at(-1)}`;
  } catch {
    return url;
  }
  return url;
}
