"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, X } from "lucide-react";

import { convertCandidateToBranch } from "@/app/branches/actions";
import { BranchForm } from "@/components/branches/branch-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Candidate = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  city: string;
  district: string;
  interestedConcept: string;
};

export function CandidateConversion({
  candidate,
  branch,
}: {
  candidate: Candidate;
  branch: { id: string; branchName: string; branchCode: string | null } | null;
}) {
  const [open, setOpen] = useState(false);

  if (branch) {
    return (
      <Card className="border-emerald-200 bg-emerald-50 shadow-none">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="font-semibold text-emerald-900">Şube kaydı oluşturuldu</p>
            <p className="text-sm text-emerald-700">{branch.branchName} · {branch.branchCode ?? "Kod yok"}</p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/branches/${branch.id}`}>Şube Kaydını Aç</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)} className="bg-[#17201b] text-white">
          <Building2 />
          Şubeye Dönüştür
        </Button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-3 md:items-center md:justify-center">
          <div className="max-h-[94vh] w-full overflow-auto rounded-lg bg-white md:max-w-5xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
              <h2 className="text-lg font-semibold">Adayı Şubeye Dönüştür</h2>
              <Button size="icon" variant="ghost" onClick={() => setOpen(false)}>
                <X />
              </Button>
            </div>
            <div className="p-5">
              <BranchForm
                action={convertCandidateToBranch.bind(null, candidate.id)}
                values={{
                  branchName: `${candidate.fullName} Şubesi`,
                  branchCode: `IB-${candidate.id.slice(0, 6).toUpperCase()}`,
                  legalName: candidate.fullName,
                  tradeName: `${candidate.fullName} Iceberry`,
                  ownershipType: "FRANCHISE",
                  concept: conceptValue(candidate.interestedConcept),
                  city: candidate.city,
                  district: candidate.district,
                  phone: candidate.phone,
                  email: candidate.email,
                  authorizedPersonName: candidate.fullName,
                  authorizedPersonPhone: candidate.phone,
                  authorizedPersonEmail: candidate.email,
                  status: "CONTRACTED",
                  candidateId: candidate.id,
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function conceptValue(value: string) {
  if (value === "Self" || value === "Self Cafe") return "SELF_CAFE";
  if (value === "Cafe") return "CAFE";
  if (value === "Hotel Kiosk") return "HOTEL_KIOSK";

  return "CORNER";
}
