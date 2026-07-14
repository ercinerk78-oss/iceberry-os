"use client";

import { MapPinned } from "lucide-react";
import { CandidateDocumentsPanel } from "@/components/documents/candidate-documents-panel";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Candidate } from "@/types/candidate";

export function CandidateDocumentTabs({candidate}:{candidate:Candidate}){
  return <Card className="rounded-lg border-[#dfe4dc] bg-white shadow-none">
    <CardHeader className="border-b border-[#edf0e9]"><div className="flex items-center gap-2 font-semibold"><MapPinned className="size-4"/>Lokasyon Analizi</div></CardHeader>
    <CardContent className="p-5"><CandidateDocumentsPanel candidateId={candidate.id} documents={candidate.documents.filter(d=>["LOCATION_ANALYSIS_PDF","LOCATION_ANALYSIS_VISUAL"].includes(d.documentType))}/></CardContent>
  </Card>;
}
