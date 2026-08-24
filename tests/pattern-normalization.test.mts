import assert from "node:assert/strict";
import { normalizeGeneratedPattern } from "../lib/generated-pattern.ts";

const astronautCat = [
  "0000000000000000",
  "0000000000000000",
  "0000001111000000",
  "0000100000100000",
  "0001004004001000",
  "0010044444400100",
  "0010442222440100",
  "0014222222224100",
  "0014222222224100",
  "0014223333224100",
  "00142333333324100",
  "0014222222224100",
  "0014444444444100",
  "0001444444441000",
  "0000111111111000",
  "0000000000000000",
];

const repaired = normalizeGeneratedPattern(astronautCat, 16, 6);
assert.equal(repaired.targets.length, 256, "A one-cell overflow must be repaired to an exact 16 × 16 grid.");
assert.deepEqual(repaired.quality, { ok: true }, "The recognizable astronaut cat must survive normalization.");

const flatBlocks = Array.from({ length: 16 }, (_, y) =>
  y >= 4 && y <= 11 ? "0000112233440000" : "0000000000000000",
);
const rejected = normalizeGeneratedPattern(flatBlocks, 16, 6);
assert.deepEqual(rejected.quality, { ok: false, reason: "flat_blocks" }, "Uniform color blocks must not be shown as a finished motif.");

const shortRows = astronautCat.slice(0, 15).map((row) => row.slice(0, 15));
const padded = normalizeGeneratedPattern(shortRows, 16, 6);
assert.equal(padded.targets.length, 256, "Small width and height mistakes must be padded safely.");

console.log("Mosaipix: malformed grids are repaired and flat color blocks are rejected.");
