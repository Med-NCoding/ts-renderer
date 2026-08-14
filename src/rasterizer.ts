/**
 * rasterizer.ts
 *
 * Triangle rasterization pipeline.
 * Stage 6b: screen-space bounding box computation.
 * (Pixel-inside test and filling come in later stages.)
 */

// ── Types ─────────────────────────────────────────────────────────────────────

/** A 2-D point in screen (pixel) coordinates. */
export interface ScreenPoint {
  x: number;
  y: number;
}

/**
 * Axis-aligned bounding box in integer pixel coordinates.
 * minX/minY are inclusive; maxX/maxY are inclusive.
 */
export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// ── Bounding box ──────────────────────────────────────────────────────────────

/**
 * Computes the smallest axis-aligned rectangle (in integer pixel coords)
 * that fully encloses the triangle (v0, v1, v2) in screen space.
 *
 * The box is clamped to [0, width-1] × [0, height-1] so callers can
 * iterate over it directly without additional bounds checks.
 *
 * Returns null if the triangle lies entirely outside the viewport
 * (e.g. behind the camera or off all four edges of the screen).
 *
 * Why floor/ceil?
 *   Projected vertex coordinates are floating-point.  We floor the min
 *   to make sure we don't miss a partially covered pixel on the left/top,
 *   and ceil the max for the same reason on the right/bottom.
 */
export function triangleBoundingBox(
  v0: ScreenPoint,
  v1: ScreenPoint,
  v2: ScreenPoint,
  width: number,
  height: number,
): BoundingBox | null {
  // Raw floating-point extents across all three vertices
  const rawMinX = Math.min(v0.x, v1.x, v2.x);
  const rawMinY = Math.min(v0.y, v1.y, v2.y);
  const rawMaxX = Math.max(v0.x, v1.x, v2.x);
  const rawMaxY = Math.max(v0.y, v1.y, v2.y);

  // Snap to integer pixel grid and clamp to viewport
  const minX = Math.max(0,         Math.floor(rawMinX));
  const minY = Math.max(0,         Math.floor(rawMinY));
  const maxX = Math.min(width - 1, Math.ceil(rawMaxX));
  const maxY = Math.min(height - 1, Math.ceil(rawMaxY));

  // If the clamped box is empty the triangle is fully off-screen
  if (minX > maxX || minY > maxY) return null;

  return { minX, minY, maxX, maxY };
}
