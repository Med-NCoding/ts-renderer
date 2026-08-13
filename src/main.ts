import { Framebuffer } from './framebuffer';

const WIDTH = 640;
const HEIGHT = 480;

const canvas = document.getElementById('render-canvas') as HTMLCanvasElement;
const modeDisplay = document.getElementById('mode-display') as HTMLSpanElement;
const fpsDisplay  = document.getElementById('fps-display')  as HTMLSpanElement;

if (modeDisplay) modeDisplay.textContent = 'DDA drawLine test';

const fb = new Framebuffer(canvas, WIDTH, HEIGHT);

// ── Static line test (drawn once) ──────────────────────────────────────────

fb.clear(13, 17, 23);

// 1. Horizontal line (pure X walk, yStep = 0)
fb.drawLine(60, 100, 580, 100, 255, 80, 80);

// 2. Vertical line (pure Y walk, xStep = 0)
fb.drawLine(320, 60, 320, 420, 80, 255, 80);

// 3. Diagonal 45° (dx == dy, both steps are 1)
fb.drawLine(60, 420, 580, 60, 255, 220, 50);

// 4. Shallow diagonal (|dx| >> |dy|, X is the driving axis)
fb.drawLine(60, 260, 580, 180, 80, 180, 255);

// 5. Steep diagonal (|dy| >> |dx|, Y is the driving axis)
fb.drawLine(500, 60, 450, 420, 200, 80, 255);

// 6. Reverse direction (x1 < x0 — should be identical to case 1 reversed)
fb.drawLine(580, 320, 60, 320, 255, 140, 60);

// 7. Single pixel degenerate case (steps == 0)
fb.drawLine(320, 240, 320, 240, 255, 255, 255);

fb.present();

// ── Keep a minimal tick so FPS counter works ────────────────────────────────
let frameCount = 0;
let lastTime = performance.now();

function tick(now: number): void {
  frameCount++;
  if (now - lastTime >= 1000) {
    if (fpsDisplay) fpsDisplay.textContent = `${frameCount}`;
    frameCount = 0;
    lastTime = now;
  }
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
