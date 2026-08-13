/**
 * Framebuffer represents our CPU-side pixel buffer VRAM.
 * It manages direct byte manipulation of RGBA pixels in memory
 * and flushes them to the HTML5 canvas display context.
 */
export class Framebuffer {
  public readonly width: number;
  public readonly height: number;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageData: ImageData;
  private pixels: Uint8ClampedArray;
  private buffer32: Uint32Array;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.canvas = canvas;
    this.width = width;
    this.height = height;

    this.canvas.width = width;
    this.canvas.height = height;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to obtain 2D rendering context for Canvas');
    }
    this.ctx = ctx;

    // Allocate 2D pixel image data buffer
    this.imageData = this.ctx.createImageData(width, height);
    this.pixels = this.imageData.data;

    // View raw ArrayBuffer as 32-bit integers for ultra-fast clear/pixel manipulation
    this.buffer32 = new Uint32Array(this.imageData.data.buffer);
  }

  /**
   * Clears the entire framebuffer color memory with a given RGBA color.
   */
  public clear(r: number, g: number, b: number, a: number = 255): void {
    // Little-endian RGBA packing for Uint32Array: 0xAABBGGRR
    const color32 = ((a & 0xff) << 24) | ((b & 0xff) << 16) | ((g & 0xff) << 8) | (r & 0xff);
    this.buffer32.fill(color32);
  }

  /**
   * Sets a single pixel color at screen coordinates (x, y).
   * Performs essential bounds checking to prevent memory corruption.
   */
  public setPixel(x: number, y: number, r: number, g: number, b: number, a: number = 255): void {
    x = Math.floor(x);
    y = Math.floor(y);

    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }

    const index = (y * this.width + x) * 4;
    this.pixels[index] = r;
    this.pixels[index + 1] = g;
    this.pixels[index + 2] = b;
    this.pixels[index + 3] = a;
  }

  /**
   * DDA (Digital Differential Analyzer) line rasterizer.
   *
   * Computes how far to step in x and y per iteration by dividing
   * the full delta by the larger of the two axes (the "driving axis").
   * That guarantees exactly one pixel lit per step with no gaps.
   *
   *   steps  = max(|dx|, |dy|)
   *   xStep  = dx / steps
   *   yStep  = dy / steps
   *
   * Then walk `steps` times, accumulating sub-pixel x/y each iteration
   * and rounding to the nearest integer before calling setPixel.
   */
  public drawLine(
    x0: number, y0: number,
    x1: number, y1: number,
    r: number, g: number, b: number, a: number = 255,
  ): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    // Degenerate case: both endpoints are the same pixel
    if (steps === 0) {
      this.setPixel(x0, y0, r, g, b, a);
      return;
    }

    const xStep = dx / steps;
    const yStep = dy / steps;

    let x = x0;
    let y = y0;

    for (let i = 0; i <= steps; i++) {
      this.setPixel(Math.round(x), Math.round(y), r, g, b, a);
      x += xStep;
      y += yStep;
    }
  }

  /**
   * Flushes the CPU memory buffer to the screen canvas via putImageData.
   */
  public present(): void {
    this.ctx.putImageData(this.imageData, 0, 0);
  }
}
