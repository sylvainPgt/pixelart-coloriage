import assert from "node:assert/strict";
import test from "node:test";
import { findForegroundBounds } from "../lib/image-crop.ts";

function makeImage(width: number, height: number, color: [number, number, number, number]) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    pixels.set(color, index * 4);
  }
  return pixels;
}

test("findForegroundBounds crops a small subject and keeps a safety margin", () => {
  const width = 20;
  const height = 20;
  const pixels = makeImage(width, height, [250, 248, 240, 255]);

  for (let y = 7; y <= 12; y += 1) {
    for (let x = 8; x <= 11; x += 1) {
      pixels.set([40, 100, 220, 255], (y * width + x) * 4);
    }
  }

  assert.deepEqual(findForegroundBounds(pixels, width, height), {
    x: 7,
    y: 6,
    width: 6,
    height: 8,
  });
});

test("findForegroundBounds leaves a uniform image unchanged", () => {
  const pixels = makeImage(20, 20, [250, 248, 240, 255]);
  assert.equal(findForegroundBounds(pixels, 20, 20), null);
});
