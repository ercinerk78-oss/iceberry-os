import assert from "node:assert/strict";
import { test } from "node:test";

import { activeLeadWhere, CLOSED_LEAD_PROCESS_STATUSES, CLOSED_LEAD_STATUSES, unconvertedLeadWhere } from "./active-records";

test("activeLeadWhere excludes converted and closed lead records", () => {
  assert.deepEqual(activeLeadWhere({ leadCategory: "POSITIVE" }), {
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
      { leadCategory: "POSITIVE" },
    ],
  });
});

test("unconvertedLeadWhere keeps invalid lead reporting separate from converted records", () => {
  assert.deepEqual(unconvertedLeadWhere({ leadCategory: "INVALID_FORM" }), {
    AND: [{ convertedCandidateId: null }, { leadCategory: "INVALID_FORM" }],
  });
});
