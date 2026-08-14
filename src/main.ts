import { Framebuffer } from './framebuffer';
import {
  toHomogeneous, fromHomogeneous,
  mulMat4Vec4, mat4Mul,
  mat4RotationX, mat4RotationY,
  mat4Translation,
} from './math';
import { parseObj } from './obj-parser';
import objText from '../models/tetrahedron.obj?raw';


const WIDTH  = 640;
const HEIGHT = 480;

const canvas     = document.getElementById('render-canvas') as HTMLCanvasElement;
const fpsDisplay = document.getElementById('fps-display')   as HTMLSpanElement;
const modeDisplay = document.getElementById('mode-display') as HTMLSpanElement;

if (modeDisplay) modeDisplay.textContent = 'OBJ Wireframe — view transform';

const fb = new Framebuffer(canvas, WIDTH, HEIGHT);

// ── Load OBJ ─────────────────────────────────────────────────────────────────
const mesh = parseObj(objText);

// ── Camera / View matrix ─────────────────────────────────────────────────────
// Camera sits at world position (0, 0, 3) — 3 units in front of the origin.
// The view matrix moves the world in the opposite direction (-z) so the model
// ends up in front of the camera. No rotation yet: camera looks straight down -Z.
const CAM_Z = 3;
const viewMatrix = mat4Translation(0, 0, -CAM_Z);

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

  // 1. Model matrix: local rotations (model space → world space)
  const modelMatrix = mat4Mul(mat4RotationX(angleX), mat4RotationY(angleY));

  // 2. MV matrix: view applied after model (world space → camera space)
  //    Read right-to-left: model first, then view.
  const mvMatrix = mat4Mul(viewMatrix, modelMatrix);

  // 3. Transform every vertex through the full MV pipeline, then project
  const screen = mesh.vertices.map(v =>
    project(fromHomogeneous(mulMat4Vec4(mvMatrix, toHomogeneous(v)))),
  );

  // 4. For each triangle face, draw its 3 edges using Bresenham
  for (const { a, b, c } of mesh.faces) {
    fb.drawLineBresenham(screen[a].x, screen[a].y, screen[b].x, screen[b].y, 80, 200, 255);
    fb.drawLineBresenham(screen[b].x, screen[b].y, screen[c].x, screen[c].y, 80, 200, 255);
    fb.drawLineBresenham(screen[c].x, screen[c].y, screen[a].x, screen[a].y, 80, 200, 255);
  }

  fb.present();
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);

