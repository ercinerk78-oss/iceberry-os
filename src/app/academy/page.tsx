import type { Prisma } from "@prisma/client";

import { ensureAcademyDefaults } from "@/app/academy/actions";
import { AppShell } from "@/components/app-shell";
import { AcademyLmsClient } from "@/components/academy/academy-lms-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AcademyPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const canManage = hasPermission(user.role, "academy.manage");
  const canAssign = hasPermission(user.role, "academy.assign");
  const filters = normalizeFilters(await searchParams);

  const data = await loadAcademyData(user.id, filters);

  return (
    <AppShell
      activeHref="/academy"
      eyebrow="Kurumsal eğitim, medya ve ilerleme merkezi"
      title="Eğitim Akademisi"
      action={canManage ? <form action={ensureAcademyDefaults}><Button>Varsayılanları Hazırla</Button></form> : null}
    >
      {data.setupError ? (
        <Card className="mb-5 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-none">
          Eğitim Akademisi verileri şu anda okunamadı. Migration ve bağlantı durumu kontrol edilmelidir.
        </Card>
      ) : null}
      <AcademyLmsClient
        programs={data.programs}
        categories={data.categories}
        users={data.users}
        branches={data.branches}
        metrics={data.metrics}
        filters={filters}
        canManage={canManage}
        canAssign={canAssign}
      />
    </AppShell>
  );
}

function normalizeFilters(params: Record<string, string | string[] | undefined>) {
  const get = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] || "" : value || "";
  };

  return {
    q: get("q").trim(),
    categoryId: get("categoryId").trim(),
    mediaType: get("mediaType").trim(),
    tag: get("tag").trim(),
    instructor: get("instructor").trim(),
  };
}

async function loadAcademyData(userId: string, filters: ReturnType<typeof normalizeFilters>) {
  try {
    const where: Prisma.TrainingProgramWhereInput = {
      archivedAt: null,
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.mediaType ? { mediaAssets: { some: { mediaType: filters.mediaType, archivedAt: null } } } : {}),
      ...(filters.tag ? { tags: { contains: filters.tag, mode: "insensitive" } } : {}),
      ...(filters.instructor ? { instructorName: { contains: filters.instructor, mode: "insensitive" } } : {}),
      ...(filters.q
        ? {
            OR: [
              { title: { contains: filters.q, mode: "insensitive" } },
              { code: { contains: filters.q, mode: "insensitive" } },
              { description: { contains: filters.q, mode: "insensitive" } },
              { instructorName: { contains: filters.q, mode: "insensitive" } },
              { tags: { contains: filters.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [programs, categories, users, branches, allProgramCount, publishedProgramCount, mediaCount, videoDuration] = await Promise.all([
      prisma.trainingProgram.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          mediaAssets: {
            where: { archivedAt: null },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            include: {
              lesson: {
                select: {
                  id: true,
                  progress: {
                    where: { userId },
                    orderBy: { updatedAt: "desc" },
                    take: 1,
                    select: { progressPercentage: true, lastPositionSeconds: true, status: true },
                  },
                },
              },
            },
          },
          _count: { select: { assignments: true } },
        },
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
        take: 60,
      }),
      prisma.trainingCategory.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { sortOrder: "asc" } }),
      prisma.user.findMany({ where: { isActive: true, archivedAt: null }, select: { id: true, name: true, role: true }, orderBy: { name: "asc" }, take: 100 }),
      prisma.branch.findMany({ where: { archivedAt: null }, select: { id: true, branchName: true, city: true }, orderBy: { branchName: "asc" }, take: 100 }),
      prisma.trainingProgram.count({ where: { archivedAt: null } }),
      prisma.trainingProgram.count({ where: { archivedAt: null, status: "PUBLISHED" } }),
      prisma.academyMediaAsset.count({ where: { archivedAt: null } }),
      prisma.academyMediaAsset.aggregate({ where: { archivedAt: null, mediaType: { in: ["VIDEO", "YOUTUBE", "VIMEO"] } }, _sum: { durationSeconds: true } }),
    ]);
    const programIds = programs.map((program) => program.id);
    const progressRows = programIds.length
      ? await prisma.lessonProgress.findMany({
          where: { lesson: { module: { programId: { in: programIds } } } },
          select: {
            userId: true,
            status: true,
            progressPercentage: true,
            lesson: { select: { module: { select: { programId: true } } } },
          },
        })
      : [];

    const progressByProgram = new Map<string, { total: number; completed: Set<string>; inProgress: Set<string>; progressSum: number; views: number }>();
    for (const row of progressRows) {
      const programId = row.lesson.module.programId;
      const current = progressByProgram.get(programId) || { total: 0, completed: new Set<string>(), inProgress: new Set<string>(), progressSum: 0, views: 0 };
      current.total += 1;
      current.progressSum += row.progressPercentage;
      current.views += 1;
      if (row.status === "COMPLETED") current.completed.add(row.userId);
      if (row.status === "IN_PROGRESS") current.inProgress.add(row.userId);
      progressByProgram.set(programId, current);
    }

    const normalizedPrograms = programs.map((program) => {
      const stats = progressByProgram.get(program.id);
      return {
        id: program.id,
        title: program.title,
        code: program.code,
        description: program.description,
        status: program.status,
        difficultyLevel: program.difficultyLevel,
        estimatedDurationMinutes: program.estimatedDurationMinutes,
        passingScore: program.passingScore,
        maximumAttempts: program.maximumAttempts,
        isMandatory: program.isMandatory,
        requiresCertificate: program.requiresCertificate,
        requiresFinalExam: program.requiresFinalExam,
        instructorName: program.instructorName,
        sortOrder: program.sortOrder,
        tags: program.tags,
        category: program.category,
        mediaAssets: program.mediaAssets.map((media) => {
          const progress = media.lesson?.progress[0];
          return {
            id: media.id,
            lessonId: media.lessonId,
            title: media.title,
            description: media.description,
            mediaType: media.mediaType,
            sourceType: media.sourceType,
            fileUrl: media.fileUrl,
            mimeType: media.mimeType,
            fileSize: media.fileSize,
            durationSeconds: media.durationSeconds,
            sortOrder: media.sortOrder,
            thumbnailUrl: media.thumbnailUrl,
            progressPercentage: progress?.progressPercentage || 0,
            lastPositionSeconds: progress?.lastPositionSeconds || 0,
            completed: progress?.status === "COMPLETED",
          };
        }),
        stats: {
          totalViews: stats?.views || 0,
          completedUsers: stats?.completed.size || 0,
          inProgressUsers: stats?.inProgress.size || 0,
          averageCompletion: stats?.total ? Math.round(stats.progressSum / stats.total) : 0,
          assignmentCount: program._count.assignments,
        },
      };
    });

    const completedRows = progressRows.filter((row) => row.status === "COMPLETED").length;
    const activeLearners = new Set(progressRows.map((row) => row.userId)).size;

    return {
      setupError: null,
      programs: normalizedPrograms,
      categories,
      users,
      branches,
      metrics: {
        totalPrograms: allProgramCount,
        publishedPrograms: publishedProgramCount,
        totalMedia: mediaCount,
        totalVideoDurationMinutes: Math.round((videoDuration._sum.durationSeconds || 0) / 60),
        completionRate: progressRows.length ? Math.round((completedRows / progressRows.length) * 100) : 0,
        activeLearners,
      },
    };
  } catch (error) {
    console.error("[academy] LMS data load failed", error);
    return {
      setupError: "ACADEMY_LMS_DATA_LOAD_FAILED",
      programs: [],
      categories: [],
      users: [],
      branches: [],
      metrics: { totalPrograms: 0, publishedPrograms: 0, totalMedia: 0, totalVideoDurationMinutes: 0, completionRate: 0, activeLearners: 0 },
    };
  }
}
