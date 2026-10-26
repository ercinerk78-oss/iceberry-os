"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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

type Viewport = {
  originX: number;
  originY: number;
  width: number;
  height: number;
  zoom: number;
};

const iconMap = { Store, PanelTop, Coffee, CupSoda, Hotel, Building2, MapPin, Plane };
const TILE_SIZE = 256;
const MAP_ZOOM = 6;
const MAP_VIEWPORT = {
  width: 1100,
  height: 620,
  centerLat: 39.0,
  centerLng: 35.2,
};

export function BranchMapView({ branches }: { branches: BranchPin[] }) {
  const [selectedId, setSelectedId] = useState(branches[0]?.id ?? "");
  const selected = branches.find((branch) => branch.id === selectedId) ?? branches[0];
  const viewport = useMemo(() => mapViewport(), []);

  if (!branches.length) {
    return (
      <div className="flex min-h-[520px] items-center justify-center rounded-lg border border-dashed bg-[#f8faf6] p-8 text-center text-sm text-[#65705f]">
        Filtrelere uygun, konumu tanımlı şube bulunamadı.
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <div className="relative min-h-[560px] overflow-hidden rounded-lg border bg-[#d8e5cf]">
        <TileLayer viewport={viewport} />
        <div className="absolute inset-0 bg-white/5" />
        <div className="absolute left-4 top-4 rounded-lg border bg-white/95 px-3 py-2 text-xs text-[#65705f] shadow-sm">
          Canlı şube haritası · {branches.length} pin
        </div>
        <div className="absolute bottom-3 right-3 rounded border bg-white/95 px-2 py-1 text-[11px] text-[#65705f] shadow-sm">
          © OpenStreetMap contributors
        </div>
        {branches.map((branch) => {
          const position = projectToViewport(branch, viewport);
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
                <p className="mt-1 text-sm text-[#65705f]">
                  {selected.city}{selected.district ? ` / ${selected.district}` : ""}
                </p>
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

function TileLayer({ viewport }: { viewport: Viewport }) {
  const tiles = mapTiles(viewport);

  return (
    <div className="absolute inset-0">
      {tiles.map((tile) => (
        <Image
          key={`${tile.x}-${tile.y}`}
          src={`https://tile.openstreetmap.org/${viewport.zoom}/${tile.x}/${tile.y}.png`}
          alt=""
          width={TILE_SIZE}
          height={TILE_SIZE}
          unoptimized
          className="absolute select-none"
          draggable={false}
          style={{
            left: `${tile.left}%`,
            top: `${tile.top}%`,
            width: `${tile.width}%`,
            height: `${tile.height}%`,
          }}
        />
      ))}
    </div>
  );
}

function mapViewport(): Viewport {
  const center = latLngToWorld(MAP_VIEWPORT.centerLat, MAP_VIEWPORT.centerLng, MAP_ZOOM);

  return {
    originX: center.x - MAP_VIEWPORT.width / 2,
    originY: center.y - MAP_VIEWPORT.height / 2,
    width: MAP_VIEWPORT.width,
    height: MAP_VIEWPORT.height,
    zoom: MAP_ZOOM,
  };
}

function mapTiles(viewport: Viewport) {
  const minTileX = Math.floor(viewport.originX / TILE_SIZE);
  const maxTileX = Math.floor((viewport.originX + viewport.width) / TILE_SIZE);
  const minTileY = Math.floor(viewport.originY / TILE_SIZE);
  const maxTileY = Math.floor((viewport.originY + viewport.height) / TILE_SIZE);
  const tiles: Array<{ x: number; y: number; left: number; top: number; width: number; height: number }> = [];
  const maxTile = 2 ** viewport.zoom;

  for (let x = minTileX; x <= maxTileX; x += 1) {
    for (let y = minTileY; y <= maxTileY; y += 1) {
      if (y < 0 || y >= maxTile) continue;
      const wrappedX = ((x % maxTile) + maxTile) % maxTile;
      tiles.push({
        x: wrappedX,
        y,
        left: ((x * TILE_SIZE - viewport.originX) / viewport.width) * 100,
        top: ((y * TILE_SIZE - viewport.originY) / viewport.height) * 100,
        width: (TILE_SIZE / viewport.width) * 100,
        height: (TILE_SIZE / viewport.height) * 100,
      });
    }
  }

  return tiles;
}

function projectToViewport(branch: BranchPin, viewport: Viewport) {
  const point = latLngToWorld(branch.latitude, branch.longitude, viewport.zoom);

  return {
    x: Math.min(96, Math.max(4, ((point.x - viewport.originX) / viewport.width) * 100)),
    y: Math.min(96, Math.max(4, ((point.y - viewport.originY) / viewport.height) * 100)),
  };
}

function latLngToWorld(latitude: number, longitude: number, zoom: number) {
  const sinLat = Math.sin((Math.min(85.05112878, Math.max(-85.05112878, latitude)) * Math.PI) / 180);
  const scale = TILE_SIZE * 2 ** zoom;

  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}
