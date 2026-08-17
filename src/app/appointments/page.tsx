import { PhoneCall, XCircle } from "lucide-react";

import {
  deactivateAppointmentLeadForm,
  markLeadUnreachableForm,
} from "@/app/appointments/actions";
import { AppShell } from "@/components/app-shell";
import { AppointmentLeadEditDialog } from "@/components/appointments/appointment-lead-edit-dialog";
import { AppointmentSchedulerDialog } from "@/components/appointments/appointment-scheduler-dialog";
import { AppointmentSubmitButton } from "@/components/appointments/appointment-submit-button";
import { ManualLeadEntry } from "@/components/appointments/manual-lead-entry";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { activeLeadWhere } from "@/lib/active-records";
import {
  APPOINTMENT_TYPE_LABELS,
  formatAppointmentRange,
} from "@/lib/appointments";
import { leadStatusLabel } from "@/lib/leads";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const LEAD_OPTION_LIMIT = 200;

type Params = {
  lead?: string;
};

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const leadWhere = params.lead ? activeLeadWhere({ id: params.lead }) : activeLeadWhere();

  const [appointmentLeadOptions, visibleLeads, users] = await Promise.all([
    prisma.lead.findMany({
      where: activeLeadWhere(),
      select: { id: true, fullName: true, city: true, phone: true },
      orderBy: { leadDate: "desc" },
      take: LEAD_OPTION_LIMIT,
    }),
    prisma.lead.findMany({
      where: leadWhere,
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        city: true,
        source: true,
        requestedConcept: true,
        investmentBudget: true,
        description: true,
        processStatus: true,
        status: true,
        nextFollowUpAt: true,
      },
      orderBy: [{ nextFollowUpAt: "asc" }, { leadDate: "desc" }],
      take: LEAD_OPTION_LIMIT,
    }),
    prisma.user.findMany({
      where: { isActive: true, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const appointmentLeadOptionItems = appointmentLeadOptions.map((lead) => [lead.id, `${lead.fullName} - ${lead.city}`] as [string, string]);
  const userOptionItems = users.map((user) => [user.name, user.name] as [string, string]);
  const appointmentTypeOptionItems = Object.entries(APPOINTMENT_TYPE_LABELS);
  const leadStatusOf = (lead: { processStatus: string | null; status: string }) => lead.processStatus || lead.status;
  const schedulableLeadStatuses = new Set(["NEW", "TO_BE_CALLED"]);
  const appointmentCallUnreachableStatuses = new Set(["APPOINTMENT_CALL_UNREACHABLE", "UNREACHABLE"]);
  const appointmentNoShowFollowUpStatuses = new Set(["APPOINTMENT_NO_SHOW_FOLLOW_UP"]);
  const schedulableLeads = visibleLeads.filter((lead) => schedulableLeadStatuses.has(leadStatusOf(lead)));
  const appointmentCallUnreachableLeads = visibleLeads.filter((lead) => appointmentCallUnreachableStatuses.has(leadStatusOf(lead)));
  const appointmentNoShowFollowUpLeads = visibleLeads.filter((lead) => appointmentNoShowFollowUpStatuses.has(leadStatusOf(lead)));

  return (
    <AppShell activeHref="/appointments" eyebrow="Randevu departmanı" title="Randevu Oluşturma" action={<ManualLeadEntry />}>
      <div className="space-y-5">
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="shadow-none">
            <details open>
              <summary className="list-none cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3 text-base">
                    <span>Randevu Adayları</span>
                    <Badge variant="secondary">{schedulableLeads.length}</Badge>
                  </CardTitle>
                </CardHeader>
              </summary>
              <CardContent>
                <div className="space-y-3">
                  {schedulableLeads.map((lead) => (
                    <article key={lead.id} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">{leadStatusLabel(lead.processStatus || lead.status)}</Badge>
                            <Badge variant="outline">{lead.source}</Badge>
                          </div>
                          <h3 className="mt-3 font-semibold">{lead.fullName} - {lead.city}</h3>
                          <p className="mt-1 text-sm text-[#65705f]">{lead.phone}</p>
                        </div>
                        <div className="grid shrink-0 gap-2">
                          <CallButton phone={lead.phone} />
                          <AppointmentLeadEditDialog lead={lead} />
                          <AppointmentSchedulerDialog
                            leads={appointmentLeadOptionItems}
                            users={userOptionItems}
                            appointmentTypes={appointmentTypeOptionItems}
                            initialLeadId={lead.id}
                          />
                          <form action={markLeadUnreachableForm.bind(null, lead.id)} className="grid gap-2">
                            <input name="reason" placeholder="Ulaşılamadı notu" className="h-9 min-w-0 rounded-lg border px-3 text-sm" />
                            <AppointmentSubmitButton size="sm" variant="outline" pendingLabel="İşaretleniyor...">
                              Ulaşılamadı
                            </AppointmentSubmitButton>
                          </form>
                          <PassiveLeadForm leadId={lead.id} />
                        </div>
                      </div>
                    </article>
                  ))}
                  {!schedulableLeads.length ? (
                    <p className="rounded-lg border border-dashed border-[#dfe4dc] p-8 text-center text-sm text-[#65705f]">Randevu bekleyen aday bulunmuyor.</p>
                  ) : null}
                </div>
              </CardContent>
            </details>
          </Card>

          <Card className="shadow-none">
            <details>
              <summary className="list-none cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3 text-base">
                    <span>Randevu İçin Ulaşılamayanlar</span>
                    <Badge variant="secondary">{appointmentCallUnreachableLeads.length}</Badge>
                  </CardTitle>
                </CardHeader>
              </summary>
              <CardContent>
                <div className="space-y-3">
                  {appointmentCallUnreachableLeads.map((lead) => (
                    <article key={lead.id} className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">{leadStatusLabel(lead.processStatus || lead.status)}</Badge>
                            <Badge variant="outline">{lead.source}</Badge>
                          </div>
                          <h3 className="mt-3 font-semibold">{lead.fullName}</h3>
                          <p className="mt-1 text-sm text-[#65705f]">{lead.phone} - {lead.city}</p>
                          {lead.nextFollowUpAt ? <p className="mt-1 text-xs text-[#8a9484]">Tekrar arama: {formatAppointmentRange(lead.nextFollowUpAt)}</p> : null}
                        </div>
                        <div className="grid shrink-0 gap-2">
                          <CallButton phone={lead.phone} />
                          <AppointmentLeadEditDialog lead={lead} />
                          <AppointmentSchedulerDialog
                            leads={appointmentLeadOptionItems}
                            users={userOptionItems}
                            appointmentTypes={appointmentTypeOptionItems}
                            initialLeadId={lead.id}
                          />
                          <PassiveLeadForm leadId={lead.id} />
                        </div>
                      </div>
                    </article>
                  ))}
                  {!appointmentCallUnreachableLeads.length ? (
                    <p className="rounded-lg border border-dashed border-[#dfe4dc] p-8 text-center text-sm text-[#65705f]">Randevu için ulaşılamayan lead yok.</p>
                  ) : null}
                </div>
              </CardContent>
            </details>
          </Card>

          <Card className="shadow-none">
            <details>
              <summary className="list-none cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3 text-base">
                    <span>Randevuda Ulaşılamayanlar</span>
                    <Badge variant="secondary">{appointmentNoShowFollowUpLeads.length}</Badge>
                  </CardTitle>
                </CardHeader>
              </summary>
              <CardContent>
                <div className="space-y-3">
                  {appointmentNoShowFollowUpLeads.map((lead) => (
                    <article key={lead.id} className="rounded-lg border border-rose-200 bg-rose-50/60 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">{leadStatusLabel(lead.processStatus || lead.status)}</Badge>
                            <Badge variant="outline">{lead.source}</Badge>
                          </div>
                          <h3 className="mt-3 font-semibold">{lead.fullName}</h3>
                          <p className="mt-1 text-sm text-[#65705f]">{lead.phone} - {lead.city}</p>
                          {lead.nextFollowUpAt ? <p className="mt-1 text-xs text-[#8a9484]">Satış takibi: {formatAppointmentRange(lead.nextFollowUpAt)}</p> : null}
                        </div>
                        <div className="grid shrink-0 gap-2">
                          <CallButton phone={lead.phone} />
                          <AppointmentLeadEditDialog lead={lead} />
                          <AppointmentSchedulerDialog
                            leads={appointmentLeadOptionItems}
                            users={userOptionItems}
                            appointmentTypes={appointmentTypeOptionItems}
                            initialLeadId={lead.id}
                            label="Tekrar Randevu Oluştur"
                          />
                          <PassiveLeadForm leadId={lead.id} />
                        </div>
                      </div>
                    </article>
                  ))}
                  {!appointmentNoShowFollowUpLeads.length ? (
                    <p className="rounded-lg border border-dashed border-[#dfe4dc] p-8 text-center text-sm text-[#65705f]">Randevu saatinde ulaşılamayan lead yok.</p>
                  ) : null}
                </div>
              </CardContent>
            </details>
          </Card>
        </div>

      </div>
    </AppShell>
  );
}

function phoneHref(phone: string) {
  const normalized = phone.replace(/[^\d+]/g, "");
  return `tel:${normalized || phone}`;
}

function CallButton({ phone }: { phone: string }) {
  return (
    <Button asChild size="sm" variant="outline">
      <a href={phoneHref(phone)}>
        <PhoneCall className="size-4" />
        Ara
      </a>
    </Button>
  );
}

function PassiveLeadForm({ leadId }: { leadId: string }) {
  return (
    <form action={deactivateAppointmentLeadForm.bind(null, leadId)} className="grid gap-2 rounded-lg border border-amber-200 bg-white p-2">
      <select name="reason" defaultValue="WITHDREW" className="h-9 rounded-lg border px-2 text-sm">
        <option value="WITHDREW">Vazgeçti</option>
        <option value="WRONG_APPLICATION">Yanlış başvuru</option>
        <option value="NOT_ELIGIBLE">Yapamıyor / uygun değil</option>
        <option value="UNREACHABLE">Ulaşılamıyor</option>
        <option value="OTHER">Diğer</option>
      </select>
      <AppointmentSubmitButton size="sm" variant="outline" pendingLabel="Pasife alınıyor...">
        <XCircle className="size-4" />
        Pasife Al
      </AppointmentSubmitButton>
    </form>
  );
}
