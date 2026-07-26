import assert from "node:assert/strict";
import { test } from "node:test";

import { activeLeadWhere, CLOSED_LEAD_PROCESS_STATUSES, CLOSED_LEAD_STATUSES, unconvertedLeadWhere } from "./active-records";

test("activeLeadWhere excludes converted and closed lead records", () => {
  assert.deepEqual(activeLeadWhere({ leadCategory: "LONG_TERM" }), {
    AND: [
      { convertedCandidateId: null },
      {
        NOT: {
          OR: [
            { processStatus: { in: [...CLOSED_LEAD_PROCESS_STATUSES] } },
            { status: { in: [...CLOSED_LEAD_STATUSES] } },
          ],
        },
      },
      { leadCategory: "LONG_TERM" },
    ],
  });
});

test("unconvertedLeadWhere keeps invalid lead reporting separate from converted records", () => {
  assert.deepEqual(unconvertedLeadWhere({ leadCategory: "INVALID_FORM" }), {
    AND: [{ convertedCandidateId: null }, { leadCategory: "INVALID_FORM" }],
  });
});
