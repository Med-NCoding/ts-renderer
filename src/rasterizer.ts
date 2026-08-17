import type { Framebuffer } from './framebuffer';

/**
 * rasterizer.ts
 *
 * Triangle rasterization pipeline.
 * Stage 6b: screen-space bounding box computation.
 * Stage 6c: edge-function and barycentric coordinate pixel-inside test.
 * Stage 6d: flat triangle filling via bounding box & inside test.
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

/**
 * Barycentric coordinates (w0, w1, w2) representing a point's relative position
 * with respect to triangle vertices (v0, v1, v2).
 *
 * w0 + w1 + w2 = 1
 */
export interface BarycentricCoords {
  w0: number;
  w1: number;
  w2: number;
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

// ── Edge function & Barycentric coordinates ───────────────────────────────────

/**
 * 2D cross product edge function for line segment (a -> b) and point c.
 *
 *   edgeFunction(a, b, c) = (c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)
 *
 * Returns a value proportional to the signed area of triangle (a, b, c).
 * The sign indicates which side of line ab point c lies on.
 */
export function edgeFunction(a: ScreenPoint, b: ScreenPoint, c: ScreenPoint): number {
  return (c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x);
}

/**
 * Computes barycentric coordinates (w0, w1, w2) for point p relative to triangle (v0, v1, v2).
 *
 * Returns null if the triangle is degenerate (zero area).
 */
export function barycentric(
  v0: ScreenPoint,
  v1: ScreenPoint,
  v2: ScreenPoint,
  p: ScreenPoint,
): BarycentricCoords | null {
  const area = edgeFunction(v0, v1, v2);
  if (area === 0) return null;

  const invArea = 1 / area;
  const w0 = edgeFunction(v1, v2, p) * invArea;
  const w1 = edgeFunction(v2, v0, p) * invArea;
  const w2 = edgeFunction(v0, v1, p) * invArea;

  return { w0, w1, w2 };
}

/**
 * Tests whether pixel/point p lies inside or on the boundary of triangle (v0, v1, v2).
 */
export function isPixelInsideTriangle(
  v0: ScreenPoint,
  v1: ScreenPoint,
  v2: ScreenPoint,
  p: ScreenPoint,
): boolean {
  const coords = barycentric(v0, v1, v2, p);
  if (!coords) return false;

  return coords.w0 >= 0 && coords.w1 >= 0 && coords.w2 >= 0;
}

// ── Triangle filling ──────────────────────────────────────────────────────────

/**
 * Rasterizes (fills) a 2D projected triangle into the framebuffer with a flat RGBA color.
 * Iterates only over the pixels within the triangle's screen bounding box, tests
 * each pixel center against the edge functions, interpolates depth, and performs
 * depth testing.
 */
export function fillTriangle(
  fb: Framebuffer,
  v0: ScreenPoint,
  v1: ScreenPoint,
  v2: ScreenPoint,
  z0: number,
  z1: number,
  z2: number,
  r: number,
  g: number,
  b: number,
  a: number = 255,
): void {
  const box = triangleBoundingBox(v0, v1, v2, fb.width, fb.height);
  if (!box) return;

  for (let y = box.minY; y <= box.maxY; y++) {
    for (let x = box.minX; x <= box.maxX; x++) {
      const pixelCenter: ScreenPoint = { x: x + 0.5, y: y + 0.5 };
      const coords = barycentric(v0, v1, v2, pixelCenter);
      if (coords && coords.w0 >= 0 && coords.w1 >= 0 && coords.w2 >= 0) {
        // Interpolate 1/z linearly in screen space for perspective-correct depth
        const invZ = coords.w0 * (1 / z0) + coords.w1 * (1 / z1) + coords.w2 * (1 / z2);
        const depth = 1 / invZ;

        // Depth test: LEQUAL with float precision tolerance to eliminate Z-fighting stitch lines
        if (depth <= fb.getDepth(x, y) + 1e-5) {
          fb.setDepth(x, y, depth);
          fb.setPixel(x, y, r, g, b, a);
        }
      }
    }
  }
}

