import assert from "node:assert/strict";
import test from "node:test";
import { assertOrderLineStock } from "./order-stock-check";

test("short shipment orders allow zero, missing and insufficient stock without bypassing normal stock checks", () => {
  const line = { quantity: 10, availableQuantity: 0, manualShortShipment: true, productName: "Kraft Poşet" };
  for (const availableQuantity of [0, 3, 10]) assert.doesNotThrow(() => assertOrderLineStock({ ...line, availableQuantity }));
  for (const availableQuantity of [0, 3]) assert.throws(() => assertOrderLineStock({ ...line, availableQuantity, manualShortShipment: false }), /Eksik Sevk/);
  assert.doesNotThrow(() => assertOrderLineStock({ ...line, availableQuantity: 10, manualShortShipment: false }));
});
