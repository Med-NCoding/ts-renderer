import { describe, it, expect } from 'vitest';
import {
  triangleBoundingBox,
  edgeFunction,
  barycentric,
  isPixelInsideTriangle,
  type ScreenPoint,
} from './rasterizer';

describe('rasterizer — bounding box & barycentrics', () => {

  const v0: ScreenPoint = { x: 10, y: 10 };
  const v1: ScreenPoint = { x: 50, y: 10 };
  const v2: ScreenPoint = { x: 30, y: 50 };

  it('computes correct bounding box clamped to viewport', () => {
    const box = triangleBoundingBox(v0, v1, v2, 640, 480);
    expect(box).toEqual({
      minX: 10,
      minY: 10,
      maxX: 50,
      maxY: 50,
    });
  });

  it('correctly identifies a point inside the triangle', () => {
    const insidePoint: ScreenPoint = { x: 30, y: 20 };
    expect(isPixelInsideTriangle(v0, v1, v2, insidePoint)).toBe(true);

    const coords = barycentric(v0, v1, v2, insidePoint);
    expect(coords).not.toBeNull();
    if (coords) {
      expect(coords.w0 + coords.w1 + coords.w2).toBeCloseTo(1.0);
      expect(coords.w0).toBeGreaterThanOrEqual(0);
      expect(coords.w1).toBeGreaterThanOrEqual(0);
      expect(coords.w2).toBeGreaterThanOrEqual(0);
    }
  });

  it('correctly identifies a point outside the triangle', () => {
    const outsidePoint: ScreenPoint = { x: 5, y: 5 };
    expect(isPixelInsideTriangle(v0, v1, v2, outsidePoint)).toBe(false);
  });

  it('identifies vertices as inside (barycentric weights 1, 0, 0 etc)', () => {
    expect(isPixelInsideTriangle(v0, v1, v2, v0)).toBe(true);
    expect(isPixelInsideTriangle(v0, v1, v2, v1)).toBe(true);
    expect(isPixelInsideTriangle(v0, v1, v2, v2)).toBe(true);
  });

});
