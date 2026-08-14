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
   * Bresenham line rasterizer — integer-only, zero floating-point per step.
   *
   * Core idea: track an integer error accumulator that represents how far
   * the ideal (real-valued) line has drifted from the pixel grid row we
   * are currently on.  When the accumulated error exceeds half a pixel,
   * step the minor axis by one and subtract a full pixel from the error.
   *
   *   error starts at 2·|dy| − |dx|   (pre-biased by −½ pixel, scaled ×2)
   *   each X step:  error += 2·|dy|
   *   when error > 0: step Y, error −= 2·|dx|
   *
   * Everything is scaled ×2 so we stay in integers (no 0.5 comparisons).
   * The algorithm is generalised to all octants via axis swapping + sign
   * tracking before the loop runs.
   */
  public drawLineBresenham(
    x0: number, y0: number,
    x1: number, y1: number,
    r: number, g: number, b: number, a: number = 255,
  ): void {
    x0 = Math.round(x0); y0 = Math.round(y0);
    x1 = Math.round(x1); y1 = Math.round(y1);

    const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);

    // For steep lines, swap x and y so we always drive along the longer axis
    if (steep) {
      [x0, y0] = [y0, x0];
      [x1, y1] = [y1, x1];
    }

    // Always draw left-to-right
    if (x0 > x1) {
      [x0, x1] = [x1, x0];
      [y0, y1] = [y1, y0];
    }

    const dx = x1 - x0;
    const dy = Math.abs(y1 - y0);
    const yStep = y0 < y1 ? 1 : -1;

    // Error starts at 2dy − dx (pre-biased so we compare against 0, not 0.5)
    let error = 2 * dy - dx;
    let y = y0;

    for (let x = x0; x <= x1; x++) {
      // Undo the swap if we swapped axes
      if (steep) {
        this.setPixel(y, x, r, g, b, a);
      } else {
        this.setPixel(x, y, r, g, b, a);
      }

      error += 2 * dy;
      if (error > 0) {
        y += yStep;
        error -= 2 * dx;
      }
    }
  }

  /**
   * Flushes the CPU memory buffer to the screen canvas via putImageData.
   */
  public present(): void {
    this.ctx.putImageData(this.imageData, 0, 0);
  }
}
