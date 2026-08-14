import { Framebuffer } from './framebuffer';
import {
  toHomogeneous, fromHomogeneous,
  mulMat4Vec4, mat4Mul,
  mat4RotationX, mat4RotationY,
  mat4Translation,
  mat4Perspective,
} from './math';
import { parseObj } from './obj-parser';
import objText from '../models/tetrahedron.obj?raw';

const WIDTH  = 640;
const HEIGHT = 480;

const canvas     = document.getElementById('render-canvas') as HTMLCanvasElement;
const fpsDisplay = document.getElementById('fps-display')   as HTMLSpanElement;

const fb = new Framebuffer(canvas, WIDTH, HEIGHT);

// ── Load OBJ ─────────────────────────────────────────────────────────────────
const mesh = parseObj(objText);

// ── Camera / View matrix ─────────────────────────────────────────────────────
// Camera fixed at (0, 0, 4) looking down −Z.
const viewMatrix = mat4Translation(0, 0, -4);

// ── Projection matrix ─────────────────────────────────────────────────────────
// 60° vertical FOV, correct aspect, near=0.1, far=100.
// This makes objects appear smaller as they move farther away (real perspective).
const projMatrix = mat4Perspective(
  Math.PI / 3,        // 60° vertical FOV
  WIDTH / HEIGHT,     // 4:3 aspect ratio
  0.1,                // near plane
  100,                // far plane
);

// ── NDC → screen pixels ───────────────────────────────────────────────────────
// After the perspective divide, x/y are in [-1, 1] (NDC).
// Map to canvas pixel coordinates, flipping Y (screen Y grows downward).
function ndcToScreen(x: number, y: number): { x: number; y: number } {
  return {
    x: (x + 1) * 0.5 * WIDTH,
    y: (1 - y) * 0.5 * HEIGHT,
  };
}

// ── Render loop ───────────────────────────────────────────────────────────────
let lastTime   = performance.now();
let frameCount = 0;
let time   = 0;   // total elapsed seconds — drives Z oscillation
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

  // Slow, easy-to-read rotation
  time   += dt;
  angleX += dt * 0.25;   // ~14°/s tilt
  angleY += dt * 0.40;   // ~23°/s spin

  fb.clear(0, 0, 0);

  // ── Build MVP ────────────────────────────────────────────────────────────────
  // Z oscillation: model drifts ±1.2 units toward/away from camera so the
  // perspective size change is clearly visible (closer = bigger, farther = smaller).
  const modelZ  = Math.sin(time * 0.5) * 1.2;
  const rotations   = mat4Mul(mat4RotationX(angleX), mat4RotationY(angleY));
  const modelMatrix = mat4Mul(mat4Translation(0, 0, modelZ), rotations);

  // MVP = projection × view × model  (applied right-to-left to each vertex)
  const mvpMatrix = mat4Mul(projMatrix, mat4Mul(viewMatrix, modelMatrix));

  // ── Transform vertices: model space → clip space → NDC → screen ─────────────
  const screen = mesh.vertices.map(v => {
    const clip = mulMat4Vec4(mvpMatrix, toHomogeneous(v));
    const ndc  = fromHomogeneous(clip);   // perspective divide: xyz / w
    return ndcToScreen(ndc.x, ndc.y);
  });

  // ── Draw wireframe edges ─────────────────────────────────────────────────────
  for (const { a, b, c } of mesh.faces) {
    fb.drawLineBresenham(screen[a].x, screen[a].y, screen[b].x, screen[b].y, 80, 200, 255);
    fb.drawLineBresenham(screen[b].x, screen[b].y, screen[c].x, screen[c].y, 80, 200, 255);
    fb.drawLineBresenham(screen[c].x, screen[c].y, screen[a].x, screen[a].y, 80, 200, 255);
  }

  fb.present();
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
