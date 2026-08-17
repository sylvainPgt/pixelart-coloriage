export type Rgb = [number, number, number];
export type Oklab = [number, number, number];

export type PixelProject = {
  version: 2;
  name: string;
  width: number;
  height: number;
  palette: string[];
  targets: number[];
};

export type QuantizedImage = {
  palette: string[];
  indices: number[];
};

const clampByte = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function srgbToLinear(value: number) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(value: number) {
  const normalized = value <= 0.0031308
    ? 12.92 * value
    : 1.055 * value ** (1 / 2.4) - 0.055;
  return clampByte(clamp01(normalized) * 255);
}

export function rgbToOklab([red, green, blue]: Rgb): Oklab {
  const r = srgbToLinear(red);
  const g = srgbToLinear(green);
  const b = srgbToLinear(blue);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function oklabToRgb([lightness, a, b]: Oklab): Rgb {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return [
    linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

export function rgbToHex(rgb: Rgb) {
  return `#${rgb.map((value) => clampByte(value).toString(16).padStart(2, "0")).join("")}`;
}

export function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace("#", "");
  return [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16)) as Rgb;
}

function distanceSquared(left: Oklab, right: Oklab) {
  const dl = left[0] - right[0];
  const da = left[1] - right[1];
  const db = left[2] - right[2];
  return dl * dl + da * da + db * db;
}

function nearestIndex(pixel: Oklab, palette: Oklab[]) {
  let nearest = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  palette.forEach((candidate, index) => {
    const distance = distanceSquared(pixel, candidate);
    if (distance < bestDistance) {
      nearest = index;
      bestDistance = distance;
    }
  });

  return nearest;
}

function initializeCentroids(pixels: Oklab[], count: number) {
  const average = pixels.reduce<Oklab>(
    (sum, pixel) => [sum[0] + pixel[0], sum[1] + pixel[1], sum[2] + pixel[2]],
    [0, 0, 0],
  ).map((value) => value / pixels.length) as Oklab;

  const centroids: Oklab[] = [];
  const first = pixels.reduce((best, pixel) =>
    distanceSquared(pixel, average) > distanceSquared(best, average) ? pixel : best,
  pixels[0]);
  centroids.push([...first] as Oklab);

  while (centroids.length < count) {
    const next = pixels.reduce((best, pixel) => {
      const pixelDistance = Math.min(...centroids.map((centroid) => distanceSquared(pixel, centroid)));
      const bestDistance = Math.min(...centroids.map((centroid) => distanceSquared(best, centroid)));
      return pixelDistance > bestDistance ? pixel : best;
    }, pixels[0]);
    centroids.push([...next] as Oklab);
  }

  return centroids;
}

function buildPalette(pixels: Oklab[], count: number) {
  let centroids = initializeCentroids(pixels, count);

  for (let iteration = 0; iteration < 10; iteration += 1) {
    const sums = Array.from({ length: count }, () => [0, 0, 0, 0]);
    pixels.forEach((pixel) => {
      const index = nearestIndex(pixel, centroids);
      sums[index][0] += pixel[0];
      sums[index][1] += pixel[1];
      sums[index][2] += pixel[2];
      sums[index][3] += 1;
    });

    centroids = centroids.map((centroid, index) => {
      const total = sums[index][3];
      return total === 0
        ? centroid
        : [sums[index][0] / total, sums[index][1] / total, sums[index][2] / total];
    });
  }

  return centroids;
}

function ditherIndices(source: Oklab[], palette: Oklab[], width: number) {
  const working = source.map((pixel) => [...pixel] as Oklab);
  const indices = Array<number>(source.length);

  const spread = (index: number, error: Oklab, weight: number) => {
    if (index < 0 || index >= working.length) return;
    working[index] = [
      clamp01(working[index][0] + error[0] * weight),
      working[index][1] + error[1] * weight,
      working[index][2] + error[2] * weight,
    ];
  };

  working.forEach((pixel, index) => {
    const paletteIndex = nearestIndex(pixel, palette);
    indices[index] = paletteIndex;
    const matched = palette[paletteIndex];
    const error: Oklab = [pixel[0] - matched[0], pixel[1] - matched[1], pixel[2] - matched[2]];
    const column = index % width;

    if (column + 1 < width) spread(index + 1, error, 7 / 16);
    if (column > 0) spread(index + width - 1, error, 3 / 16);
    spread(index + width, error, 5 / 16);
    if (column + 1 < width) spread(index + width + 1, error, 1 / 16);
  });

  return indices;
}

export function quantizePixels(
  rgbPixels: Rgb[],
  width: number,
  requestedColors: number,
  dither = false,
): QuantizedImage {
  if (rgbPixels.length === 0) return { palette: ["#ffffff"], indices: [] };

  const uniqueColors = [...new Set(rgbPixels.map(rgbToHex))];
  const colorCount = Math.max(2, Math.min(requestedColors, uniqueColors.length));

  if (uniqueColors.length <= colorCount) {
    const colorMap = new Map(uniqueColors.map((color, index) => [color, index]));
    return {
      palette: uniqueColors,
      indices: rgbPixels.map((pixel) => colorMap.get(rgbToHex(pixel)) ?? 0),
    };
  }

  const labPixels = rgbPixels.map(rgbToOklab);
  const labPalette = buildPalette(labPixels, colorCount)
    .toSorted((left, right) => left[0] - right[0]);
  const palette = labPalette.map((color) => rgbToHex(oklabToRgb(color)));
  const indices = dither
    ? ditherIndices(labPixels, labPalette, width)
    : labPixels.map((pixel) => nearestIndex(pixel, labPalette));

  return { palette, indices };
}
