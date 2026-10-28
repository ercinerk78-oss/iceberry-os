import assert from "node:assert/strict";
import test from "node:test";

import {
  isActiveReportLead,
  isCountableAppointment,
  isConvertedLead,
  isInvalidLead,
  isReportableAppointment,
  interviewToBranchConversion,
  resolveReportCandidateIds,
} from "./lead-reporting";

test("legacy candidate matching normalizes Turkish phones and rejects ambiguous matches", () => {
  const candidates = [{ id: "one", phone: "+90 532 111 22 33" }, { id: "two", phone: "0533 111 22 33" }, { id: "three", phone: "905331112233" }];
  const matches = resolveReportCandidateIds([{ id: "a", phone: "0532 111 22 33", convertedCandidateId: null }, { id: "b", phone: "5331112233", convertedCandidateId: null }, { id: "c", phone: "5331112233", convertedCandidateId: "explicit" }], candidates);
  assert.equal(matches.get("a"), "one");
  assert.equal(matches.get("b"), null);
  assert.equal(matches.get("c"), "explicit");
});

test("interview to branch conversion counts each interviewed lead once and requires a branch", () => {
  const converted = { id: "one", convertedCandidateId: "candidate", appointments: [{ status: "COMPLETED" }, { status: "COMPLETED" }] };
  const result = interviewToBranchConversion([converted, converted, { id: "two", convertedCandidateId: "no-branch", appointments: [{ status: "COMPLETED" }] }, { id: "three", convertedCandidateId: "candidate", appointments: [{ status: "CANCELLED" }] }], new Set(["candidate"]));
  assert.deepEqual(result, { convertedCount: 1, interviewedCount: 2, rate: 50 });
  assert.equal(interviewToBranchConversion([], new Set()).rate, null);
});

test("interview conversion supports direct source lead links without candidate links", () => {
  const leads = [{ id: "direct", convertedCandidateId: null, appointments: [{ status: "COMPLETED" }] }, { id: "both", convertedCandidateId: "candidate", appointments: [{ status: "COMPLETED" }] }];
  assert.deepEqual(interviewToBranchConversion(leads, new Set(["candidate"]), new Set(["direct", "both"])), { convertedCount: 2, interviewedCount: 2, rate: 100 });
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
