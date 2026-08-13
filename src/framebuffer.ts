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
   * Flushes the CPU memory buffer to the screen canvas via putImageData.
   */
  public present(): void {
    this.ctx.putImageData(this.imageData, 0, 0);
  }
}
