import assert from "node:assert/strict";
import test from "node:test";
import { navigationGroups } from "./navigation";
import { routePermission } from "./permissions";

test("royalty calculation follows branch revenue and keeps finance authorization", () => {
  const group = navigationGroups.find(group => group.id === "branch")!;
  const index = group.children.findIndex(item => item.href === "/branch-revenues");
  assert.equal(group.children[index + 1].href, "/branch-revenues/royalty");
  assert.equal(routePermission("/branch-revenues/royalty"), "finance");
  assert.equal(routePermission("/branch-revenues"), "branch_revenue");
});
