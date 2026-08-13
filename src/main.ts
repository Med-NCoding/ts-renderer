import { Framebuffer } from './framebuffer';

const WIDTH = 640;
const HEIGHT = 480;

const canvas = document.getElementById('render-canvas') as HTMLCanvasElement;
const fpsDisplay = document.getElementById('fps-display') as HTMLSpanElement;

if (!canvas) {
  throw new Error('Canvas element #render-canvas not found');
}

const fb = new Framebuffer(canvas, WIDTH, HEIGHT);

let lastTime = performance.now();
let frameCount = 0;

/**
 * Draws a dynamic CPU plasma / pixel pattern to demonstrate direct byte-level
 * pixel manipulation in our software framebuffer.
 */
function renderPattern(time: number): void {
  const t = time * 0.001;

  // 1. Clear screen to dark background
  fb.clear(15, 18, 25);

  // 2. Render dynamic CPU pixel pattern
  for (let y = 0; y < HEIGHT; y += 4) {
    for (let x = 0; x < WIDTH; x += 4) {
      // Calculate a dynamic color spectrum per-pixel block
      const r = Math.sin(x * 0.02 + t) * 127 + 128;
      const g = Math.cos(y * 0.02 + t) * 127 + 128;
      const b = Math.sin((x + y) * 0.01 + t * 2) * 127 + 128;

      // Set individual pixels in CPU RAM
      for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 3; dx++) {
          fb.setPixel(x + dx, y + dy, r, g, b);
        }
      }
    }
  }

  // 3. Draw a bouncing target marker using setPixel
  const targetX = Math.floor((Math.sin(t * 2) * 0.4 + 0.5) * WIDTH);
  const targetY = Math.floor((Math.cos(t * 1.5) * 0.4 + 0.5) * HEIGHT);

  const crosshairSize = 15;
  for (let i = -crosshairSize; i <= crosshairSize; i++) {
    fb.setPixel(targetX + i, targetY, 255, 255, 255); // Horizontal white line
    fb.setPixel(targetX, targetY + i, 255, 255, 255); // Vertical white line
  }

  // Draw bright center dot
  fb.setPixel(targetX, targetY, 255, 80, 80);
}

function tick(now: number): void {
  // Update FPS counter
  frameCount++;
  if (now - lastTime >= 1000) {
    if (fpsDisplay) {
      fpsDisplay.textContent = `${frameCount}`;
    }
    frameCount = 0;
    lastTime = now;
  }

  // Render frame to CPU buffer
  renderPattern(now);

  // Flush CPU buffer to screen GPU display
  fb.present();

  requestAnimationFrame(tick);
}

// Start main software render loop
requestAnimationFrame(tick);
