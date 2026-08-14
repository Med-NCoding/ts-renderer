import { Framebuffer } from './framebuffer';
import { rotateX, rotateY } from './math';
import { parseObj } from './obj-parser';
import objText from '../models/tetrahedron.obj?raw';

const WIDTH  = 640;
const HEIGHT = 480;

const canvas     = document.getElementById('render-canvas') as HTMLCanvasElement;
const fpsDisplay = document.getElementById('fps-display')   as HTMLSpanElement;
const modeDisplay = document.getElementById('mode-display') as HTMLSpanElement;

if (modeDisplay) modeDisplay.textContent = 'OBJ Wireframe — tetrahedron';

const fb = new Framebuffer(canvas, WIDTH, HEIGHT);

// ── Load OBJ ─────────────────────────────────────────────────────────────────
// parseObj reads the raw text and returns { vertices: Vec3[], faces: Face[] }.
// "faces" are triangles; each triangle has 3 vertex indices (a, b, c).
const mesh = parseObj(objText);

// ── Projection ───────────────────────────────────────────────────────────────
// Orthographic: drop Z, scale ×150, centre on canvas, flip Y (screen Y is down).
function project(v: { x: number; y: number; z: number }): { x: number; y: number } {
  const scale = 150;
  return {
    x: WIDTH  / 2 + v.x * scale,
    y: HEIGHT / 2 - v.y * scale,
  };
}

// ── Render loop ──────────────────────────────────────────────────────────────
let lastTime   = performance.now();
let frameCount = 0;
let angleX = 0;
let angleY = 0;

function tick(now: number): void {
  const dt = (now - lastTime) / 1000;
  frameCount++;
  if (now - lastTime >= 1000) {
    if (fpsDisplay) fpsDisplay.textContent = `${frameCount}`;
    frameCount = 0;
    lastTime = now;
  }

  angleX += dt * 0.6;
  angleY += dt * 0.9;

  fb.clear(13, 17, 23);

  // 1. Rotate every OBJ vertex in 3D, then project to 2D screen coords
  const screen = mesh.vertices.map(v => project(rotateX(rotateY(v, angleY), angleX)));

  // 2. For each triangle face, draw its 3 edges using Bresenham
  for (const { a, b, c } of mesh.faces) {
    fb.drawLineBresenham(screen[a].x, screen[a].y, screen[b].x, screen[b].y, 80, 200, 255);
    fb.drawLineBresenham(screen[b].x, screen[b].y, screen[c].x, screen[c].y, 80, 200, 255);
    fb.drawLineBresenham(screen[c].x, screen[c].y, screen[a].x, screen[a].y, 80, 200, 255);
  }

  fb.present();
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);

