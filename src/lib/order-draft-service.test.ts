import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import { saveOrderDraftTransaction } from "./order-draft-service";
import type { DraftRequest } from "./order-draft";
import { runDraftListTransaction } from "./order-draft-list-service";
import { canSubmitDraftProgress, draftProgressLabels } from "./order-draft-progress";

const id = "d9cd2845-09dd-48bc-baf0-155f6c0b1d14";
const input: DraftRequest = { id, version: 0, warehouseId: "w", command: "save", invoicePreference: "CREATE_LATER", items: [{ productId: "p", quantity: 20, manualShortShipment: false }] };
function fixture() {
  type Stored = { id: string; orderNumber: string; status: string; draftVersion: number; warehouseId: string; updatedAt: Date; [key: string]: unknown };
  let stored: Stored | null = null;
  let available = 100;
  let lines: unknown[] = [];
  const events: string[] = [];
  const tx = {
    $queryRaw: async () => [],
    franchiseOrder: {
      findUnique: async () => stored ? { ...stored, items: lines } : null,
      create: async ({ data }: { data: Stored & { items: { create: unknown[] } } }) => { lines = data.items.create; stored = { ...data, updatedAt: new Date() }; return stored; },
      update: async ({ data }: { data: Partial<Stored> & { draftVersion: { increment: number }; items?: { create: unknown[] } } }) => { assert.ok(stored); const previous = stored.draftVersion; stored = { ...stored, ...data, draftVersion: previous + data.draftVersion.increment, updatedAt: new Date() } as Stored; if (data.items) lines = data.items.create; return stored; },
    },
    warehouse: { findFirst: async () => ({ id: "w" }) },
    branch: { findFirst: async () => ({ id: "b", franchiseeId: null, franchisee: null }) },
    franchisee: { findFirst: async () => null },
    product: { findMany: async () => [{ id: "p", name: "Bubble", sku: "079", unit: "Adet", salePrice: 200, vatRate: 1, currency: "TRY" }] },
    warehouseStock: { findMany: async () => [{ productId: "p", availableQuantity: available }] },
    orderActivity: { create: async ({ data }: { data: { type: string } }) => { events.push(data.type); } },
  };
  return { tx: tx as unknown as Prisma.TransactionClient, events, get: () => ({ stored, lines }), setAvailable: (quantity: number) => { available = quantity; }, setLegacyStage: (stage: string) => { assert.ok(stored); stored.warehouseDraftStage = stage; } };
}
test("draft save, edit and warehouse submission reuse one order without inventory writes", async () => {
  const f = fixture();
  const created = await saveOrderDraftTransaction(f.tx, input, "user");
  assert.equal(created.status, "DRAFT"); assert.equal(created.version, 1);
  const edited = await saveOrderDraftTransaction(f.tx, { ...input, version: 1, branchId: "b", items: [{ productId: "p", quantity: 30, manualShortShipment: false }] }, "user");
  assert.equal(edited.version, 2); assert.equal(edited.id, created.id);
  f.setLegacyStage("SELF_DELIVERY");
  const submitted = await saveOrderDraftTransaction(f.tx, { ...input, version: 2, branchId: "b", items: [{ ...input.items[0], quantity: 30 }], command: "submit" }, "user");
  assert.equal(submitted.status, "SUBMITTED"); assert.equal(submitted.version, 3);
  assert.deepEqual(f.events, ["DRAFT_CREATED", "WAREHOUSE_DRAFT_APPROVED"]);
  // This fixture has no stock mutators or invoice methods: either call would fail the test.
  await assert.rejects(() => saveOrderDraftTransaction(f.tx, { ...input, version: 3 }, "user"), /artık taslak değil/);
  assert.equal((await saveOrderDraftTransaction(f.tx, { ...input, version: 2, command: "submit" }, "user")).version, 3);
});
test("incomplete and out-of-stock drafts save but cannot submit without explicit shortage", async () => {
  const f = fixture(); f.setAvailable(0);
  await saveOrderDraftTransaction(f.tx, input, "user");
  f.setLegacyStage("SELF_DELIVERY");
  await assert.rejects(() => saveOrderDraftTransaction(f.tx, { ...input, version: 1, command: "submit" }, "user"), /şube/);
  await saveOrderDraftTransaction(f.tx, { ...input, branchId: "b", version: 1 }, "user");
  f.setLegacyStage("SELF_DELIVERY");
  await assert.rejects(() => saveOrderDraftTransaction(f.tx, { ...input, branchId: "b", version: 2, command: "submit" }, "user"), /stok/);
  const data = { ...input, branchId: "b", items: [{ ...input.items[0], manualShortShipment: true }] };
  const record = await saveOrderDraftTransaction(f.tx, { ...data, version: 2 }, "user");
  f.setLegacyStage("SELF_DELIVERY");
  assert.equal((await saveOrderDraftTransaction(f.tx, { ...data, version: record.version, command: "submit" }, "user")).status, "SUBMITTED");
});
test("a stale version cannot overwrite another edit and cancellation stays out of stock", async () => {
  const f = fixture(); await saveOrderDraftTransaction(f.tx, input, "user");
  await assert.rejects(() => saveOrderDraftTransaction(f.tx, input, "other"), /başka bir kullanıcı/);
  assert.equal((await saveOrderDraftTransaction(f.tx, { ...input, version: 1, command: "cancel" }, "user")).status, "DRAFT_CANCELLED");
});

test("unsaved changes must be saved before direct central submission", async () => {
  const f = fixture();
  const data = { ...input, branchId: "b" };
  let record = await saveOrderDraftTransaction(f.tx, data, "user");
  f.setLegacyStage("SELF_DELIVERY");
  await assert.rejects(() => saveOrderDraftTransaction(f.tx, { ...data, version: record.version, command: "submit", items: [{ ...input.items[0], quantity: 99 }] }, "user"), /kaydedin/);
  record = await saveOrderDraftTransaction(f.tx, { ...data, version: record.version, items: [{ ...input.items[0], quantity: 25 }] }, "user");
  assert.equal(record.warehouseDraftStage, "DRAFT_EDITED");
  f.setLegacyStage("SELF_DELIVERY");
  assert.equal((await saveOrderDraftTransaction(f.tx, { ...data, version: record.version, command: "submit", items: [{ ...input.items[0], quantity: 25 }] }, "user")).status, "SUBMITTED");
});

test("legacy stages cannot bypass the new central handoff requirement", async () => {
  for (const stage of ["DRAFT", "REGISTERED", "PREPARING", "READY"]) {
    const f = fixture(); const data = { ...input, branchId: "b" };
    const record = await saveOrderDraftTransaction(f.tx, data, "user");
    f.setLegacyStage(stage);
    await assert.rejects(() => saveOrderDraftTransaction(f.tx, { ...data, version: record.version, command: "submit" }, "user"), /durumunu seçin/);
  }
});

test("all six list statuses persist and only two statuses enable central submission", async () => {
  for (const stage of Object.keys(draftProgressLabels)) {
    const f = fixture();
    const data = { ...input, branchId: "b" };
    const record = await saveOrderDraftTransaction(f.tx, data, "user");
    const changed = await runDraftListTransaction(f.tx, { command: "progress", id, version: record.version, stage }, "user");
    assert.equal(changed.warehouseDraftStage, stage);
    assert.equal(changed.status, "DRAFT");
    assert.equal(f.get().lines.length, 1);
    assert.equal(canSubmitDraftProgress(stage), ["HANDED_TO_CARRIER", "SELF_DELIVERY"].includes(stage));
    if (canSubmitDraftProgress(stage)) {
      const sent = await runDraftListTransaction(f.tx, { command: "submit", id, version: changed.version }, "user");
      assert.equal(sent.status, "SUBMITTED");
      assert.equal((await runDraftListTransaction(f.tx, { command: "submit", id, version: changed.version }, "user")).version, sent.version);
      await assert.rejects(() => runDraftListTransaction(f.tx, { command: "progress", id, version: sent.version, stage: "PREPARING" }, "user"), /artık taslak/);
    } else await assert.rejects(() => runDraftListTransaction(f.tx, { command: "submit", id, version: changed.version }, "user"), /durumunu seçin/);
  }
});

test("stale list edits cannot overwrite autosaves and changing content clears readiness", async () => {
  const f = fixture(); const data = { ...input, branchId: "b" };
  const record = await saveOrderDraftTransaction(f.tx, data, "user");
  const ready = await runDraftListTransaction(f.tx, { command: "progress", id, version: record.version, stage: "SELF_DELIVERY" }, "user");
  await assert.rejects(() => runDraftListTransaction(f.tx, { command: "progress", id, version: record.version, stage: "PREPARING" }, "user"), /başka bir kullanıcı/);
  const edited = await saveOrderDraftTransaction(f.tx, { ...data, version: ready.version, notes: "Değişti" }, "user");
  assert.equal(edited.warehouseDraftStage, "DRAFT_EDITED");
  await assert.rejects(() => runDraftListTransaction(f.tx, { command: "submit", id, version: edited.version }, "user"), /durumunu seçin/);
});
