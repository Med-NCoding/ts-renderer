import { describe, it, expect } from 'vitest';
import {
  triangleBoundingBox,
  edgeFunction,
  barycentric,
  isPixelInsideTriangle,
  fillTriangle,
  type ScreenPoint,
} from './rasterizer';
import { Framebuffer } from './framebuffer';

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

  it('performs depth testing correctly (only drawing closer pixels)', () => {
    // Create a mock canvas for Framebuffer
    const dummyCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        createImageData: (w: number, h: number) => ({
          data: new Uint8ClampedArray(w * h * 4),
        }),
      }),
    } as unknown as HTMLCanvasElement;

    const fb = new Framebuffer(dummyCanvas, 100, 100);
    fb.clear(0, 0, 0); // resets colors to black and depth to Infinity

    // Define a triangle covering (10,10) to (50,50) at depth = 2.0 (farther)
    const t0_v0 = { x: 10, y: 10 };
    const t0_v1 = { x: 50, y: 10 };
    const t0_v2 = { x: 30, y: 50 };
    fillTriangle(fb, t0_v0, t0_v1, t0_v2, 2.0, 2.0, 2.0, 255, 0, 0); // Red

    // Pixel inside should be red (255, 0, 0) and depth should be 2.0
    expect(fb.getDepth(30, 20)).toBe(2.0);

    // Try to draw a green triangle (0, 255, 0) at the same position but at depth = 3.0 (farther away)
    fillTriangle(fb, t0_v0, t0_v1, t0_v2, 3.0, 3.0, 3.0, 0, 255, 0); // Green
    // It should STILL be red because the green triangle was farther
    expect(fb.getDepth(30, 20)).toBe(2.0);

    // Now draw a blue triangle (0, 0, 255) at the same position but at depth = 1.0 (closer)
    fillTriangle(fb, t0_v0, t0_v1, t0_v2, 1.0, 1.0, 1.0, 0, 0, 255); // Blue
    // It should now be blue (and depth = 1.0) because the blue triangle was closer
    expect(fb.getDepth(30, 20)).toBe(1.0);
  });

});
