import assert from "node:assert/strict";
import test from "node:test";

import { isNavigationItemActive, navigationGroups, visibleNavigationForRole } from "@/lib/navigation";

test("navigation routes are unique", () => {
  const routes = navigationGroups.flatMap((group) => group.children.map((item) => item.href));
  assert.equal(new Set(routes).size, routes.length);
});

test("academy follows warehouse logistics and precedes documents", () => {
  const groups = navigationGroups.map((group) => group.id);
  const academyIndex = groups.indexOf("academy");
  assert.equal(groups[academyIndex - 1], "warehouseLogistics");
  assert.equal(groups[academyIndex + 1], "documents");
});

test("warehouse and order parent routes do not shadow child routes", () => {
  assert.equal(isNavigationItemActive("/warehouse", "/warehouse/stock", "/warehouse/stock"), false);
  assert.equal(isNavigationItemActive("/orders", "/orders/admin", "/orders/admin"), false);
  assert.equal(isNavigationItemActive("/settings", "/settings/users", "/settings/users"), false);
  assert.equal(isNavigationItemActive("/warehouse/stock", "/warehouse/stock", "/warehouse/stock"), true);
});

test("role based navigation hides empty or unauthorized groups", () => {
  const warehouse = visibleNavigationForRole("WAREHOUSE_MANAGER");
  assert.equal(warehouse.groups.some((group) => group.id === "system"), false);
  assert.equal(warehouse.groups.some((group) => group.id === "warehouseLogistics"), true);

  const training = visibleNavigationForRole("TRAINING_DEPARTMENT");
  assert.equal(training.groups.some((group) => group.id === "academy"), true);
  assert.equal(training.groups.some((group) => group.id === "warehouseLogistics"), false);

  const architecture = visibleNavigationForRole("ARCHITECTURE_PROJECT_IMPLEMENTATION");
  assert.equal(architecture.groups.some((group) => group.id === "opening"), true);
  assert.equal(architecture.groups.some((group) => group.id === "branch"), true);
  assert.equal(architecture.groups.some((group) => group.id === "warehouseLogistics"), false);
});

test("individual orders access adds only the orders menu to warehouse staff", () => {
  const before = visibleNavigationForRole("WAREHOUSE_MANAGER");
  const after = visibleNavigationForRole("WAREHOUSE_MANAGER", ["orders"]);
  const routes = (navigation: typeof before) => navigation.groups.flatMap((group) => group.children.map((item) => item.href));
  const added = routes(after).filter((route) => !routes(before).includes(route));
  assert.deepEqual(added, ["/orders"]);
  assert.equal(routes(after).includes("/finance"), false);
  assert.equal(routes(after).includes("/settings/users"), false);
  assert.equal(routes(visibleNavigationForRole("BRANCH_MANAGER", ["orders"])).includes("/orders"), false);
});
