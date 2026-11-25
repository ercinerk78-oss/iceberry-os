import test from "node:test";
import assert from "node:assert/strict";
import { mergeOrderBranches, normalizeBranchSearch } from "./branch-search";

test("direct order branch selection includes grouped and standalone branches without duplicates", () => {
  const result = mergeOrderBranches([
    { branches: [{ id: "b", branchName: "Bayrampaşa" }, { id: "a", branchName: "Adana" }] },
    { branches: [{ id: "c", branchName: "Çankaya" }] },
  ], [{ id: "d", branchName: "İzmir" }, { id: "b", branchName: "Bayrampaşa" }]);
  assert.deepEqual(result.map(branch => branch.id), ["a", "b", "c", "d"]);
  assert.equal(result.filter(branch => normalizeBranchSearch(branch.branchName).includes("bayrampasa")).length, 1);
  assert.deepEqual(mergeOrderBranches([], []), []);
});
