import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth";
import { toCandidate } from "@/lib/candidates";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const DETAIL_RELATION_LIMIT = 75;
const TABS = ["notes", "locations", "tasks", "timeline", "documents"] as const;
type DetailTab = (typeof TABS)[number];

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requirePermission("candidates");
  const { id } = await params;
  const tabParam = request.nextUrl.searchParams.get("tab");
  const tab = TABS.includes(tabParam as DetailTab) ? (tabParam as DetailTab) : null;

  if (!tab) {
    return NextResponse.json({ message: "Geçersiz detay sekmesi." }, { status: 400 });
  }

  const [record, availableLocations] = await Promise.all([
    prisma.franchiseCandidate.findFirst({
      where: { id },
      include: {
        interactions: { orderBy: { interactionDate: "desc" }, take: tab === "notes" ? DETAIL_RELATION_LIMIT : 0 },
        tasks: { orderBy: { dueDate: "asc" }, take: tab === "tasks" ? DETAIL_RELATION_LIMIT : 0 },
        documents: { orderBy: { createdAt: "desc" }, take: tab === "documents" ? DETAIL_RELATION_LIMIT : 0 },
        concepts: { include: { concept: true } },
        tags: { include: { tag: true } },
        locationMatches: {
          include: {
            location: {
              select: {
                id: true,
                name: true,
                city: true,
                district: true,
                areaM2: true,
                monthlyRent: true,
                transferFee: true,
                status: true,
                documents: {
                  where: { archivedAt: null },
                  select: { id: true, fileName: true, documentType: true, archivedAt: true },
                },
              },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: tab === "locations" ? DETAIL_RELATION_LIMIT : 0,
        },
        timelineEvents: { orderBy: { eventDate: "desc" }, take: tab === "timeline" ? DETAIL_RELATION_LIMIT : 0 },
      },
    }),
    tab === "locations"
      ? prisma.candidateLocation.findMany({
          where: { archivedAt: null },
          select: { id: true, name: true, city: true, district: true },
          orderBy: { updatedAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
  ]);

  if (!record) {
    return NextResponse.json({ message: "Aday bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({
    candidate: toCandidate(record),
    availableLocations,
  });
}
