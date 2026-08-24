export type PatternQualityReason =
  | "too_empty"
  | "too_full"
  | "too_few_colors"
  | "too_small"
  | "flat_blocks";

export type NormalizedPattern = {
  targets: number[];
  quality: { ok: true } | { ok: false; reason: PatternQualityReason };
};

function resizeLine(values: number[], size: number) {
  if (values.length === size) return values;
  if (values.length === 0) return Array<number>(size).fill(0);

  const difference = values.length - size;
  if (Math.abs(difference) <= 2) {
    if (difference > 0) {
      const start = Math.floor(difference / 2);
      return values.slice(start, start + size);
    }
    const missing = -difference;
    const before = Math.floor(missing / 2);
    return [
      ...Array<number>(before).fill(0),
      ...values,
      ...Array<number>(missing - before).fill(0),
    ];
  }

  return Array.from({ length: size }, (_, index) => {
    const source = Math.min(values.length - 1, Math.floor(index * values.length / size));
    return values[source];
  });
}

function resizeRows(rows: number[][], size: number) {
  if (rows.length === size) return rows;
  if (rows.length === 0) return Array.from({ length: size }, () => Array<number>(size).fill(0));

  const difference = rows.length - size;
  if (Math.abs(difference) <= 2) {
    if (difference > 0) {
      const start = Math.floor(difference / 2);
      return rows.slice(start, start + size);
    }
    const missing = -difference;
    const before = Math.floor(missing / 2);
    const emptyRow = () => Array<number>(size).fill(0);
    return [
      ...Array.from({ length: before }, emptyRow),
      ...rows,
      ...Array.from({ length: missing - before }, emptyRow),
    ];
  }

  return Array.from({ length: size }, (_, index) => {
    const source = Math.min(rows.length - 1, Math.floor(index * rows.length / size));
    return rows[source];
  });
}

function assessPattern(targets: number[], size: number): NormalizedPattern["quality"] {
  const foreground = targets
    .map((value, index) => ({ value, x: index % size, y: Math.floor(index / size) }))
    .filter((cell) => cell.value !== 0);
  const ratio = foreground.length / targets.length;
  if (ratio < 0.16) return { ok: false, reason: "too_empty" };
  if (ratio > 0.75) return { ok: false, reason: "too_full" };

  const usedColors = new Set(foreground.map((cell) => cell.value));
  if (usedColors.size < 2) return { ok: false, reason: "too_few_colors" };

  const xs = foreground.map((cell) => cell.x);
  const ys = foreground.map((cell) => cell.y);
  const width = Math.max(...xs) - Math.min(...xs) + 1;
  const height = Math.max(...ys) - Math.min(...ys) + 1;
  if (width < Math.max(3, Math.ceil(size * 0.25)) || height < Math.max(3, Math.ceil(size * 0.25))) {
    return { ok: false, reason: "too_small" };
  }

  const rowSignatures = new Set<string>();
  const columnSignatures = new Set<string>();
  for (let y = 0; y < size; y += 1) {
    rowSignatures.add(targets.slice(y * size, (y + 1) * size).join(""));
  }
  for (let x = 0; x < size; x += 1) {
    columnSignatures.add(Array.from({ length: size }, (_, y) => targets[y * size + x]).join(""));
  }
  const minimumVariation = Math.max(4, Math.ceil(size * 0.25));
  if (rowSignatures.size < minimumVariation || columnSignatures.size < minimumVariation) {
    return { ok: false, reason: "flat_blocks" };
  }

  return { ok: true };
}

export function normalizeGeneratedPattern(rows: string[], size: number, paletteSize: number): NormalizedPattern {
  const sanitizedRows = rows.map((row) => {
    const values = [...row]
      .filter((character) => /^\d$/.test(character))
      .map(Number)
      .map((value) => value >= 0 && value < paletteSize ? value : 0);
    return resizeLine(values, size);
  });
  const targets = resizeRows(sanitizedRows, size).flat();
  return { targets, quality: assessPattern(targets, size) };
}
