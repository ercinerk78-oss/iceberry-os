import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  appointmentDateParts,
  appointmentDayRange,
  combineAppointmentDate,
} from "@/lib/appointments";

describe("Randevu saat dilimi kuralları", () => {
  it("Türkiye saati olarak girilen randevuyu doğru UTC zamanına çevirir", () => {
    const value = combineAppointmentDate("2026-07-28", "10:30");

    assert.equal(value.toISOString(), "2026-07-28T07:30:00.000Z");
  });

  it("Veritabanındaki UTC randevuyu tekrar Türkiye saati olarak okur", () => {
    const parts = appointmentDateParts(new Date("2026-07-28T07:30:00.000Z"));

    assert.deepEqual(parts, { date: "2026-07-28", time: "10:30" });
  });

  it("Bugün filtresi için Türkiye gün sınırlarını kullanır", () => {
    const range = appointmentDayRange("2026-07-28");

    assert.equal(range.start.toISOString(), "2026-07-27T21:00:00.000Z");
    assert.equal(range.end.toISOString(), "2026-07-28T21:00:00.000Z");
  });
});
