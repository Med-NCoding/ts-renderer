import { Framebuffer } from './framebuffer';

const WIDTH  = 640;
const HEIGHT = 480;

const canvas = document.getElementById('render-canvas') as HTMLCanvasElement;
const modeDisplay = document.getElementById('mode-display') as HTMLSpanElement;

if (modeDisplay) modeDisplay.textContent = 'DDA (left) vs Bresenham (right)';

const fb = new Framebuffer(canvas, WIDTH, HEIGHT);
fb.clear(13, 17, 23);

// ── Divider ─────────────────────────────────────────────────────────────────
for (let y = 0; y < HEIGHT; y++) fb.setPixel(WIDTH / 2, y, 50, 50, 60);

// ── Shared line definitions (relative coords, applied to each half) ──────────
// Each entry: [x0, y0, x1, y1, r, g, b]
const lines: [number, number, number, number, number, number, number][] = [
  [20,  30, 270,  30, 255,  80,  80],   // horizontal
  [150,  20, 150, 450,  80, 255,  80],   // vertical
  [20, 450, 270,  30, 255, 220,  50],   // 45° diagonal
  [20, 240, 270, 140,  80, 180, 255],   // shallow (|dx| >> |dy|)
  [220,  30, 180, 450, 200,  80, 255],  // steep   (|dy| >> |dx|)
  [270, 360,  20, 360, 255, 140,  60],  // reverse horizontal
];

const HALF = WIDTH / 2;

for (const [x0, y0, x1, y1, r, g, b] of lines) {
  // Left half — DDA
  fb.drawLine(x0, y0, x1, y1, r, g, b);

  // Right half — Bresenham (shift x coords by HALF)
  fb.drawLineBresenham(x0 + HALF, y0, x1 + HALF, y1, r, g, b);
}

// Labels drawn pixel-by-pixel via tiny dot markers (no font needed)
// Just a small crosshair at top-centre of each half to mark them
const markY = 12;
for (let i = -6; i <= 6; i++) {
  fb.setPixel(HALF / 2 + i, markY, 255, 255, 255);
  fb.setPixel(HALF / 2,     markY + i, 255, 255, 255);
  fb.setPixel(HALF + HALF / 2 + i, markY, 255, 255, 255);
  fb.setPixel(HALF + HALF / 2,     markY + i, 255, 255, 255);
}

fb.present();
