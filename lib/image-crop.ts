export type ImageBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const BACKGROUND_TOLERANCE = 42;
const MIN_FOREGROUND_RATIO = 0.005;

export function findForegroundBounds(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  paddingRatio = 0.12,
): ImageBounds | null {
  if (width < 1 || height < 1 || pixels.length < width * height * 4) return null;

  const cornerIndexes = [
    0,
    (width - 1) * 4,
    (height - 1) * width * 4,
    ((height * width) - 1) * 4,
  ];
  const background = [0, 1, 2, 3].map((channel) => Math.round(
    cornerIndexes.reduce((sum, index) => sum + pixels[index + channel], 0) / cornerIndexes.length,
  ));

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let foregroundCount = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const alpha = pixels[index + 3];
      const foreground = background[3] < 32
        ? alpha > 64
        : Math.max(
          Math.abs(pixels[index] - background[0]),
          Math.abs(pixels[index + 1] - background[1]),
          Math.abs(pixels[index + 2] - background[2]),
        ) > BACKGROUND_TOLERANCE;

      if (!foreground) continue;
      foregroundCount += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (foregroundCount / (width * height) < MIN_FOREGROUND_RATIO) return null;

  const subjectWidth = maxX - minX + 1;
  const subjectHeight = maxY - minY + 1;
  if (subjectWidth / width > 0.96 && subjectHeight / height > 0.96) return null;

  const padding = Math.ceil(Math.max(subjectWidth, subjectHeight) * Math.max(0, paddingRatio));
  const x = Math.max(0, minX - padding);
  const y = Math.max(0, minY - padding);
  const right = Math.min(width, maxX + padding + 1);
  const bottom = Math.min(height, maxY + padding + 1);

  return { x, y, width: right - x, height: bottom - y };
}
