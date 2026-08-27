export type CropTransform = {
  focusX: number;
  focusY: number;
  zoom: number;
};

export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));

export function getCropRect(
  imageWidth: number,
  imageHeight: number,
  targetRatio: number,
  transform: CropTransform,
): CropRect {
  const safeWidth = Math.max(1, imageWidth);
  const safeHeight = Math.max(1, imageHeight);
  const safeRatio = Math.max(0.05, targetRatio);
  const sourceRatio = safeWidth / safeHeight;

  let baseWidth = safeWidth;
  let baseHeight = safeHeight;
  if (sourceRatio > safeRatio) baseWidth = safeHeight * safeRatio;
  else baseHeight = safeWidth / safeRatio;

  const zoom = clamp(transform.zoom, 1, 5);
  const width = baseWidth / zoom;
  const height = baseHeight / zoom;
  const x = (safeWidth - width) * clamp(transform.focusX, 0, 100) / 100;
  const y = (safeHeight - height) * clamp(transform.focusY, 0, 100) / 100;

  return { x, y, width, height };
}
