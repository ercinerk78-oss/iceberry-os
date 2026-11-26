import assert from "node:assert/strict";
import test from "node:test";
import { completedDeliveryLabel } from "./purchase-delivery-status";

test("only completed deliveries get completion labels", () => {
  for (const status of ["DRAFT", "APPROVED", "SENT", "PARTIALLY_RECEIVED", "CANCELLED"]) {
    assert.equal(completedDeliveryLabel(status, [{ orderedQuantity: 60, receivedQuantity: 59 }]), null);
  }
});

test("short, excess, exact and mixed item deliveries remain distinguishable", () => {
  for (const status of ["CLOSED", "RECEIVED"]) {
    for (const [orderedQuantity, receivedQuantity] of [[60, 59], [50, 60]]) {
      assert.equal(completedDeliveryLabel(status, [{ orderedQuantity, receivedQuantity }]), "Eksik/Fazla Teslimle Tamamlandı");
    }
    assert.equal(completedDeliveryLabel(status, [{ orderedQuantity: 60, receivedQuantity: 60 }]), "Tamamlandı");
    // Opposite differences must not cancel each other across products.
    assert.equal(completedDeliveryLabel(status, [{ orderedQuantity: 60, receivedQuantity: 59 }, { orderedQuantity: 50, receivedQuantity: 51 }]), "Eksik/Fazla Teslimle Tamamlandı");
    assert.equal(completedDeliveryLabel(status, [{ orderedQuantity: 1, receivedQuantity: 1.00000001 }]), "Tamamlandı");
  }
});

test("archiving without delivery does not invent a completed delivery", () => {
  assert.equal(completedDeliveryLabel("CLOSED", []), null);
  assert.equal(completedDeliveryLabel("CLOSED", [{ orderedQuantity: 50, receivedQuantity: 0 }]), null);
});
