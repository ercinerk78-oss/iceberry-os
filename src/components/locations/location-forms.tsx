"use client";

import { useActionState } from "react";
import type { CandidateLocation, Lead, LeadCandidateLocation } from "@prisma/client";
import { Archive, LinkIcon, Upload } from "lucide-react";

import {
  createLocation,
  importLocations,
  linkLocationToLead,
  updateLocation,
  updateLocationMatch,
  uploadLocationDocuments,
  type LocationActionState,
} from "@/app/locations/actions";
import { Button } from "@/components/ui/button";
import {
  CONCEPT_SUITABILITY_LABELS,
  LOCATION_DOCUMENT_TYPE_LABELS,
  LOCATION_STATUS_LABELS,
  LOCATION_TYPE_LABELS,
  MATCH_STATUS_LABELS,
  SOURCE_TYPE_LABELS,
} from "@/lib/locations";

const initial: LocationActionState = { success: false, message: "" };

const textClass = "h-10 rounded-lg border bg-white px-3 text-sm";
const textareaClass = "rounded-lg border bg-white p-3 text-sm";

type LeadOption = Pick<Lead, "id" | "fullName" | "city" | "phone">;
type LocationOption = Pick<CandidateLocation, "id" | "name" | "city" | "district">;

export function LocationForm({ location }: { location?: CandidateLocation }) {
  const action = location ? updateLocation.bind(null, location.id) : createLocation;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border bg-white p-5 shadow-none xl:grid-cols-4">
      <Field label="Lokasyon Adı" name="name" defaultValue={location?.name} required />
      <Field label="Şehir" name="city" defaultValue={location?.city} required />
      <Field label="İlçe" name="district" defaultValue={location?.district} />
      <Field label="Mahalle" name="neighborhood" defaultValue={location?.neighborhood} />
      <Select label="Tip" name="locationType" defaultValue={location?.locationType || "SHOPPING_MALL"} options={LOCATION_TYPE_LABELS} />
      <Field label="AVM / Proje Adı" name="mallName" defaultValue={location?.mallName} />
      <Field label="m²" name="areaM2" type="number" defaultValue={location?.areaM2?.toString()} />
      <Select label="Konsept Uygunluğu" name="conceptSuitability" defaultValue={location?.conceptSuitability || "NOT_EVALUATED"} options={CONCEPT_SUITABILITY_LABELS} />
      <Field label="Aylık Kira" name="monthlyRent" type="number" defaultValue={location?.monthlyRent?.toString()} />
      <Field label="Ciro Kirası %" name="turnoverRentRate" type="number" defaultValue={location?.turnoverRentRate?.toString()} />
      <Field label="Devir Bedeli" name="transferFee" type="number" defaultValue={location?.transferFee?.toString()} />
      <Field label="Kurulum Tahmini" name="estimatedSetupCost" type="number" defaultValue={location?.estimatedSetupCost?.toString()} />
      <Field label="Toplam Yatırım" name="estimatedTotalInvestment" type="number" defaultValue={location?.estimatedTotalInvestment?.toString()} />
      <Select label="Durum" name="status" defaultValue={location?.status || "NEW_OPPORTUNITY"} options={LOCATION_STATUS_LABELS} />
      <Select label="Kaynak" name="sourceType" defaultValue={location?.sourceType || "INTERNAL"} options={SOURCE_TYPE_LABELS} />
      <Field label="Uygunluk Tarihi" name="availableFrom" type="date" defaultValue={location?.availableFrom ? location.availableFrom.toISOString().slice(0, 10) : undefined} />
      <Field label="Mevcut İşletme" name="currentBusinessName" defaultValue={location?.currentBusinessName} />
      <Field label="Önceki Marka" name="previousBrand" defaultValue={location?.previousBrand} />
      <Field label="İletişim Kişisi" name="contactName" defaultValue={location?.contactName} />
      <Field label="İletişim Telefonu" name="contactPhone" defaultValue={location?.contactPhone} />
      <Field label="İletişim E-posta" name="contactEmail" type="email" defaultValue={location?.contactEmail} />
      <Field label="Kaynak URL" name="sourceUrl" defaultValue={location?.sourceUrl} />
      <Field label="Enlem" name="latitude" type="number" defaultValue={location?.latitude?.toString()} />
      <Field label="Boylam" name="longitude" type="number" defaultValue={location?.longitude?.toString()} />
      <label className="grid gap-2 text-sm font-medium xl:col-span-2">
        <span>Adres</span>
        <textarea name="fullAddress" defaultValue={location?.fullAddress || ""} rows={3} className={textareaClass} />
      </label>
      <label className="grid gap-2 text-sm font-medium xl:col-span-2">
        <span>Açıklama</span>
        <textarea name="description" defaultValue={location?.description || ""} rows={3} className={textareaClass} />
      </label>
      <label className="grid gap-2 text-sm font-medium xl:col-span-4">
        <span>İç Notlar</span>
        <textarea name="internalNotes" defaultValue={location?.internalNotes || ""} rows={3} className={textareaClass} />
      </label>
      {state.message ? <p className={`rounded-lg p-3 text-sm xl:col-span-4 ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{state.message}</p> : null}
      <Button disabled={pending} className="xl:col-span-4">
        {pending ? "Kaydediliyor..." : location ? "Lokasyonu Güncelle" : "Yeni Lokasyon Oluştur"}
      </Button>
    </form>
  );
}

export function LocationDocumentUpload({ locationId }: { locationId: string }) {
  const [state, action, pending] = useActionState(uploadLocationDocuments.bind(null, locationId), initial);

  return (
    <form action={action} className="grid gap-3 rounded-lg border bg-[#f8faf6] p-4">
      <Select label="Belge Türü" name="documentType" defaultValue="LOCATION_ANALYSIS_PDF" options={LOCATION_DOCUMENT_TYPE_LABELS} />
      <label className="grid gap-2 text-sm font-medium">
        <span>Dosyalar</span>
        <input required multiple type="file" name="files" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="rounded-lg border bg-white p-2 text-sm" />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        <span>Açıklama</span>
        <textarea name="description" rows={3} className={textareaClass} />
      </label>
      {state.message ? <p className={`rounded-lg p-3 text-sm ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{state.message}</p> : null}
      <Button disabled={pending}>
        <Upload className="size-4" />
        {pending ? "Yükleniyor..." : "Dosya Yükle"}
      </Button>
    </form>
  );
}

export function LeadLocationLinkForm({ leads, locations, leadId, locationId }: { leads: LeadOption[]; locations: LocationOption[]; leadId?: string; locationId?: string }) {
  const [state, action, pending] = useActionState(linkLocationToLead, initial);

  return (
    <form action={action} className="grid gap-3 rounded-lg border bg-[#f8faf6] p-4 md:grid-cols-2">
      <Select label="Lead" name="leadId" defaultValue={leadId || ""} options={Object.fromEntries(leads.map((lead) => [lead.id, `${lead.fullName} · ${lead.city} · ${lead.phone}`]))} />
      <Select label="Lokasyon" name="locationId" defaultValue={locationId || ""} options={Object.fromEntries(locations.map((location) => [location.id, `${location.name} · ${location.city}${location.district ? `/${location.district}` : ""}`]))} />
      <Select label="Eşleşme Durumu" name="matchStatus" defaultValue="SUGGESTED" options={MATCH_STATUS_LABELS} />
      <Field label="Sonraki Takip" name="nextFollowUpAt" type="date" />
      <label className="grid gap-2 text-sm font-medium md:col-span-2">
        <span>Not</span>
        <textarea name="notes" rows={3} className={textareaClass} />
      </label>
      {state.message ? <p className={`rounded-lg p-3 text-sm md:col-span-2 ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{state.message}</p> : null}
      <Button disabled={pending} className="md:col-span-2">
        <LinkIcon className="size-4" />
        {pending ? "Bağlanıyor..." : "Lead'e Bağla"}
      </Button>
    </form>
  );
}

export function MatchUpdateForm({ match }: { match: Pick<LeadCandidateLocation, "id" | "matchStatus" | "nextFollowUpAt" | "notes"> }) {
  const [state, action, pending] = useActionState(updateLocationMatch.bind(null, match.id), initial);

  return (
    <form action={action} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
      <select name="matchStatus" defaultValue={match.matchStatus} className={textClass}>
        {Object.entries(MATCH_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <input name="nextFollowUpAt" type="date" defaultValue={match.nextFollowUpAt ? match.nextFollowUpAt.toISOString().slice(0, 10) : ""} className={textClass} />
      <input name="notes" defaultValue={match.notes || ""} placeholder="Not" className={textClass} />
      {state.message ? <p className={`text-sm md:col-span-3 ${state.success ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p> : null}
      <Button disabled={pending} size="sm" className="md:col-span-3">
        {pending ? "Güncelleniyor..." : "Eşleşmeyi Güncelle"}
      </Button>
    </form>
  );
}

export function LocationImportForm() {
  const [state, action, pending] = useActionState(importLocations, initial);

  return (
    <form action={action} className="grid gap-3 rounded-lg border bg-white p-4">
      <div>
        <h3 className="font-semibold">CSV İçe Aktar</h3>
        <p className="mt-1 text-sm text-[#65705f]">name, city, district, fullAddress, locationType, areaM2, monthlyRent, transferFee, estimatedSetupCost, conceptSuitability, status, contactName, contactPhone, notes kolonları desteklenir.</p>
      </div>
      <input required type="file" name="file" accept=".csv,text/csv" className="rounded-lg border bg-white p-2 text-sm" />
      {state.message ? <p className={`rounded-lg p-3 text-sm ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{state.message}</p> : null}
      <Button disabled={pending} variant="outline">
        <Archive className="size-4" />
        {pending ? "İçe aktarılıyor..." : "CSV İçe Aktar"}
      </Button>
    </form>
  );
}

function Field({ label, name, defaultValue, type = "text", required = false }: { label: string; name: string; defaultValue?: string | null; type?: string; required?: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      <input required={required} name={name} type={type} defaultValue={defaultValue || ""} className={textClass} step={type === "number" ? "0.01" : undefined} />
    </label>
  );
}

function Select({ label, name, defaultValue, options }: { label: string; name: string; defaultValue: string; options: Record<string, string> }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      <select name={name} defaultValue={defaultValue} className={textClass}>
        {!defaultValue ? <option value="">Seçin</option> : null}
        {Object.entries(options).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
