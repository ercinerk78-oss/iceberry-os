import { PrismaClient } from "@prisma/client";

import { OpeningChecklistService } from "@/lib/opening-checklist-service";
import { isHotelOpeningConcept } from "@/lib/opening-checklists";

const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.openingProject.findMany({
    where: {
      archivedAt: null,
      status: { notIn: ["CANCELLED"] },
    },
    select: {
      id: true,
      projectNumber: true,
      branchId: true,
      branchConcept: true,
      branch: { select: { concept: true, conceptType: true } },
      _count: {
        select: {
          setupChecklistItems: true,
          documentChecklistItems: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  let created = 0;
  let skippedExisting = 0;
  let skippedHotel = 0;

  for (const project of projects) {
    const concept = project.branchConcept || project.branch.concept || project.branch.conceptType;
    if (isHotelOpeningConcept(concept)) {
      skippedHotel += 1;
      continue;
    }

    if (project._count.setupChecklistItems > 0 && project._count.documentChecklistItems > 0) {
      skippedExisting += 1;
      continue;
    }

    await prisma.$transaction((tx) =>
      OpeningChecklistService.seedForProjectInTransaction(
        tx,
        {
          id: project.id,
          branchId: project.branchId,
          branchConcept: concept,
        },
        null,
      ),
    );
    created += 1;
    console.log(`Checklist hazırlandı: ${project.projectNumber}`);
  }

  console.log(`Toplam proje: ${projects.length}`);
  console.log(`Checklist hazırlanan proje: ${created}`);
  console.log(`Zaten hazır olan proje: ${skippedExisting}`);
  console.log(`Hotel kapsam dışı proje: ${skippedHotel}`);
}

main()
  .catch((error) => {
    console.error("Açılış checklist tamamlama scripti başarısız oldu.");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
