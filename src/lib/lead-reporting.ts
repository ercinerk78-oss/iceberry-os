export type LeadReportLead = {
  id: string;
  status: string;
  processStatus: string | null;
  leadCategory: string | null;
  convertedCandidateId: string | null;
};

export type LeadReportAppointment = {
  leadId: string;
  status: string;
  lead: {
    leadCategory?: string | null;
  };
};

export function isLeadStatus(lead: { status: string; processStatus: string | null }, status: string) {
  return lead.status === status || lead.processStatus === status;
}

export function isInvalidLead(lead: { leadCategory?: string | null }) {
  return lead.leadCategory === "INVALID_FORM";
}

export function isConvertedLead(lead: Pick<LeadReportLead, "status" | "processStatus" | "convertedCandidateId">) {
  return Boolean(lead.convertedCandidateId) || isLeadStatus(lead, "CONVERTED_TO_CANDIDATE");
}

export function isClosedLead(lead: Pick<LeadReportLead, "status" | "processStatus">) {
  return isLeadStatus(lead, "CLOSED");
}

export function isReportableLead(lead: { leadCategory?: string | null }) {
  return !isInvalidLead(lead);
}

export function isActiveReportLead(lead: LeadReportLead) {
  return isReportableLead(lead) && !isConvertedLead(lead) && !isClosedLead(lead);
}

export function isReportableAppointment(appointment: LeadReportAppointment) {
  return isReportableLead(appointment.lead);
}

export function isCountableAppointment(appointment: LeadReportAppointment) {
  return isReportableAppointment(appointment) && appointment.status !== "CANCELLED";
}
