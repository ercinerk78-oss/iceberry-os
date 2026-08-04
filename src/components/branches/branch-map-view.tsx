"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Coffee, CupSoda, Hotel, MapPin, PanelTop, Plane, Store } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type BranchPin = {
  id: string;
  branchName: string;
  city: string;
  district?: string | null;
  address?: string | null;
  status: string;
  ownershipType: string;
  openingDate?: string | null;
  latitude: number;
  longitude: number;
  concept: {
    name: string;
    code: string;
    color: string;
    icon: string;
  };
  ownerName?: string | null;
  lastAuditScore?: number | null;
};

const iconMap = { Store, PanelTop, Coffee, CupSoda, Hotel, Building2, MapPin, Plane };
const TURKEY_BOUNDS = {
  minLat: 35.6,
  maxLat: 42.2,
  minLng: 25.6,
  maxLng: 44.9,
};

export function BranchMapView({ branches }: { branches: BranchPin[] }) {
  const [selectedId, setSelectedId] = useState(branches[0]?.id ?? "");
  const selected = branches.find((branch) => branch.id === selectedId) ?? branches[0];
  const bounds = useMemo(() => calculateBounds(branches), [branches]);

  if (!branches.length) {
    return (
      <div className="flex min-h-[520px] items-center justify-center rounded-lg border border-dashed bg-[#f8faf6] p-8 text-center text-sm text-[#65705f]">
        Filtrelere uygun, konumu tanımlı şube bulunamadı.
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <div className="relative min-h-[560px] overflow-hidden rounded-lg border bg-[#eef4e9]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(23,32,27,0.06)_1px,transparent_1px),linear-gradient(rgba(23,32,27,0.06)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(111,190,68,0.2),transparent_30%),radial-gradient(circle_at_72%_58%,rgba(37,99,235,0.16),transparent_28%)]" />
        <TurkeyMapBackdrop />
        <div className="absolute left-4 top-4 rounded-lg border bg-white/90 px-3 py-2 text-xs text-[#65705f] shadow-sm">
          Canlı şube koordinat görünümü · {branches.length} pin
        </div>
        {branches.map((branch) => {
          const position = project(branch, bounds);
          const Icon = iconMap[branch.concept.icon as keyof typeof iconMap] ?? Store;
          const isSelected = selected?.id === branch.id;

          return (
            <button
              key={branch.id}
              type="button"
              onClick={() => setSelectedId(branch.id)}
              className={`absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white shadow-lg transition hover:scale-110 ${isSelected ? "size-12 ring-4 ring-white/80" : "size-10"}`}
              style={{ left: `${position.x}%`, top: `${position.y}%`, backgroundColor: branch.concept.color }}
              aria-label={`${branch.branchName} pinini aç`}
            >
              <Icon className="size-5 text-white" />
            </button>
          );
        })}
      </div>

      <aside className="rounded-lg border bg-white p-4 shadow-none">
        {selected ? (
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{selected.branchName}</h2>
                <p className="mt-1 text-sm text-[#65705f]">{selected.city}{selected.district ? ` / ${selected.district}` : ""}</p>
              </div>
              <Badge style={{ borderColor: selected.concept.color, color: selected.concept.color }} variant="outline">
                {selected.concept.name}
              </Badge>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <Row label="Durum" value={selected.status} />
              <Row label="Sahiplik" value={selected.ownershipType === "COMPANY_OWNED" ? "Merkez Şube" : "Franchise"} />
              <Row label="Adres" value={selected.address || "Adres girilmemiş"} />
              <Row label="Açılış" value={selected.openingDate ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(selected.openingDate)) : "Belirtilmedi"} />
              <Row label="Sorumlu" value={selected.ownerName || "Belirtilmedi"} />
              <Row label="Son Denetim" value={selected.lastAuditScore == null ? "Veri yok" : String(selected.lastAuditScore)} />
            </div>
            <Button asChild className="mt-5 w-full bg-[#17201b] text-white">
              <Link href={`/branches/${selected.id}`}>Şube Detayına Git</Link>
            </Button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-3">
      <p className="text-xs text-[#65705f]">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function calculateBounds(branches: BranchPin[]) {
  const inTurkey = branches.filter((branch) =>
    branch.latitude >= TURKEY_BOUNDS.minLat &&
    branch.latitude <= TURKEY_BOUNDS.maxLat &&
    branch.longitude >= TURKEY_BOUNDS.minLng &&
    branch.longitude <= TURKEY_BOUNDS.maxLng,
  );

  if (inTurkey.length === branches.length) return TURKEY_BOUNDS;

  const latitudes = branches.map((branch) => branch.latitude);
  const longitudes = branches.map((branch) => branch.longitude);
  const minLat = Math.min(TURKEY_BOUNDS.minLat, ...latitudes);
  const maxLat = Math.max(TURKEY_BOUNDS.maxLat, ...latitudes);
  const minLng = Math.min(TURKEY_BOUNDS.minLng, ...longitudes);
  const maxLng = Math.max(TURKEY_BOUNDS.maxLng, ...longitudes);
  const latPadding = Math.max((maxLat - minLat) * 0.04, 0.08);
  const lngPadding = Math.max((maxLng - minLng) * 0.04, 0.08);

  return {
    minLat: minLat - latPadding,
    maxLat: maxLat + latPadding,
    minLng: minLng - lngPadding,
    maxLng: maxLng + lngPadding,
  };
}

function project(branch: BranchPin, bounds: ReturnType<typeof calculateBounds>) {
  const lngRange = bounds.maxLng - bounds.minLng || 1;
  const latRange = bounds.maxLat - bounds.minLat || 1;

  return {
    x: Math.min(95, Math.max(5, ((branch.longitude - bounds.minLng) / lngRange) * 100)),
    y: Math.min(95, Math.max(5, (1 - (branch.latitude - bounds.minLat) / latRange) * 100)),
  };
}

function TurkeyMapBackdrop() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-90" viewBox="0 0 1000 560" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M78 260 C118 232 168 224 216 235 C272 248 312 218 360 210 C420 199 466 217 525 204 C594 189 654 202 720 193 C790 184 845 204 912 197 C940 194 963 209 973 230 C949 252 900 251 866 269 C823 292 777 283 729 300 C665 323 620 303 560 318 C494 334 440 314 383 331 C318 351 269 333 206 344 C152 353 103 326 78 260 Z"
        fill="#dfead6"
        stroke="#8aa47f"
        strokeWidth="2"
      />
      <path d="M122 305 C210 333 302 317 394 318 C495 319 575 299 669 300 C762 301 844 280 934 246" fill="none" stroke="#b9c8b0" strokeWidth="2" strokeDasharray="8 8" />
      <path d="M150 258 C256 232 340 245 438 228 C540 211 636 230 736 210 C815 194 882 214 940 205" fill="none" stroke="#eef5e9" strokeWidth="18" strokeLinecap="round" opacity="0.65" />
      <text x="135" y="386" fill="#65705f" fontSize="20" fontWeight="600">Ege</text>
      <text x="392" y="382" fill="#65705f" fontSize="20" fontWeight="600">Ic Anadolu</text>
      <text x="723" y="376" fill="#65705f" fontSize="20" fontWeight="600">Dogu</text>
      <text x="430" y="168" fill="#65705f" fontSize="18" fontWeight="600">Karadeniz</text>
      <text x="460" y="458" fill="#65705f" fontSize="18" fontWeight="600">Akdeniz</text>
    </svg>
  );
}
