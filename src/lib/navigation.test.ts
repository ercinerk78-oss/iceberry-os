import assert from "node:assert/strict";
import test from "node:test";

import { isNavigationItemActive, navigationGroups, visibleNavigationForRole } from "@/lib/navigation";

test("navigation routes are unique", () => {
  const routes = navigationGroups.flatMap((group) => group.children.map((item) => item.href));
  assert.equal(new Set(routes).size, routes.length);
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

  const training = visibleNavigationForRole("TRAINING_MANAGER");
  assert.equal(training.groups.some((group) => group.id === "academy"), true);
  assert.equal(training.groups.some((group) => group.id === "warehouseLogistics"), false);
});
