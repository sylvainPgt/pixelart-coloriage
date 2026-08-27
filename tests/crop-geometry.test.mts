import assert from "node:assert/strict";
import test from "node:test";
import { getCropRect } from "../lib/crop-geometry.ts";

test("getCropRect keeps the requested aspect ratio", () => {
  const crop = getCropRect(1600, 900, 4 / 5, { focusX: 50, focusY: 50, zoom: 1 });
  assert.ok(Math.abs(crop.width / crop.height - 4 / 5) < 0.0001);
  assert.ok(crop.x > 0);
  assert.equal(crop.y, 0);
});

test("getCropRect applies zoom and clamps focus", () => {
  const base = getCropRect(1200, 1200, 1, { focusX: 50, focusY: 50, zoom: 1 });
  const zoomed = getCropRect(1200, 1200, 1, { focusX: 200, focusY: -20, zoom: 2 });
  assert.equal(zoomed.width, base.width / 2);
  assert.equal(zoomed.height, base.height / 2);
  assert.equal(zoomed.x, 600);
  assert.equal(zoomed.y, 0);
});
