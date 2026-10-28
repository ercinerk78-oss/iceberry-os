import assert from "node:assert/strict";
import test from "node:test";

import {
  isActiveReportLead,
  isCountableAppointment,
  isConvertedLead,
  isInvalidLead,
  isReportableAppointment,
  interviewToBranchConversion,
} from "./lead-reporting";

test("interview to branch conversion counts each interviewed lead once and requires a branch", () => {
  const converted = { id: "one", convertedCandidateId: "candidate", appointments: [{ status: "COMPLETED" }, { status: "COMPLETED" }] };
  const result = interviewToBranchConversion([converted, converted, { id: "two", convertedCandidateId: "no-branch", appointments: [{ status: "COMPLETED" }] }, { id: "three", convertedCandidateId: "candidate", appointments: [{ status: "CANCELLED" }] }], new Set(["candidate"]));
  assert.deepEqual(result, { convertedCount: 1, interviewedCount: 2, rate: 50 });
  assert.equal(interviewToBranchConversion([], new Set()).rate, null);
});

test("lead reporting excludes invalid forms from active report metrics", () => {
  const lead = {
    id: "lead_1",
    status: "NEW",
    processStatus: "NEW",
    leadCategory: "INVALID_FORM",
    convertedCandidateId: null,
  };

  assert.equal(isInvalidLead(lead), true);
  assert.equal(isActiveReportLead(lead), false);
});

test("lead reporting counts converted leads through relation or status", () => {
  assert.equal(isConvertedLead({ status: "NEW", processStatus: "NEW", convertedCandidateId: "candidate_1" }), true);
  assert.equal(isConvertedLead({ status: "CONVERTED_TO_CANDIDATE", processStatus: "NEW", convertedCandidateId: null }), true);
});

test("lead reporting keeps cancelled or invalid appointments out of countable appointment metrics", () => {
  assert.equal(isReportableAppointment({ leadId: "lead_1", status: "SCHEDULED", lead: { leadCategory: "INVALID_FORM" } }), false);
  assert.equal(isCountableAppointment({ leadId: "lead_2", status: "CANCELLED", lead: { leadCategory: null } }), false);
  assert.equal(isCountableAppointment({ leadId: "lead_3", status: "COMPLETED", lead: { leadCategory: null } }), true);
});
