export const fineGridBounds = (x, y, span, baseGrid, fineGrid) => {
  const boundary = (value) => Math.max(0, Math.min(fineGrid, Math.ceil((2 * value * fineGrid - baseGrid) / (2 * baseGrid))));
  const left = boundary(x), top = boundary(y);
  return { left, top, columns: boundary(x + span) - left, rows: boundary(y + span) - top };
};
export const DETAIL_DENSITIES = Object.freeze([96, 110, 128]);
export const DEFAULT_DETAIL_DENSITY = 128;
export const detailDensity = (value) => DETAIL_DENSITIES.includes(Number(value)) ? Number(value) : DEFAULT_DETAIL_DENSITY;
export const scatterMotifScale = (progress) => {
  const t = Math.max(0, Math.min(1, progress));
  return 1 + .20 * t * t * t * (t * (t * 6 - 15) + 10);
};
