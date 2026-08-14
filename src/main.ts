import { Framebuffer } from './framebuffer';
import {
  toHomogeneous, fromHomogeneous,
  mulMat4Vec4, mat4Mul,
  mat4Translation,
  mat4Perspective,
  mat4RotationAxis,
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
const viewMatrix = mat4Translation(0, 0, -4);

// ── Projection matrix ─────────────────────────────────────────────────────────
const projMatrix = mat4Perspective(
  Math.PI / 3,        // 60° vertical FOV
  WIDTH / HEIGHT,     // 4:3 aspect ratio
  0.1,                // near plane
  100,                // far plane
);

// ── Rotation axis ─────────────────────────────────────────────────────────────
// A single tilted axis gives perfectly constant angular velocity — no gimbal
// lock spikes. The axis (1, 1.6, 0.5) is normalised below; its tilt means the
// model tumbles through many orientations (top, sides, and bottom all visible).
const axisLen = Math.sqrt(1**2 + 1.6**2 + 0.5**2);
const AXIS = { x: 1 / axisLen, y: 1.6 / axisLen, z: 0.5 / axisLen };

// ── NDC → screen pixels ───────────────────────────────────────────────────────
function ndcToScreen(x: number, y: number): { x: number; y: number } {
  return {
    x: (x + 1) * 0.5 * WIDTH,
    y: (1 - y) * 0.5 * HEIGHT,
  };
}

// ── Render loop ───────────────────────────────────────────────────────────────
let lastTime   = performance.now();
let frameCount = 0;
let time  = 0;
let angle = 0;  // single accumulator — constant angular velocity guaranteed

function tick(now: number): void {
  const dt = (now - lastTime) / 1000;
  frameCount++;
  if (now - lastTime >= 1000) {
    if (fpsDisplay) fpsDisplay.textContent = `${frameCount}`;
    frameCount = 0;
    lastTime = now;
  }

  time  += dt;
  angle += dt * 0.05;   // ~2.9°/s — full rotation every ~125 s; very slow, no spikes

  fb.clear(0, 0, 0);

  // ── Build MVP ────────────────────────────────────────────────────────────────
  // Subtle Z oscillation (±0.4) so perspective depth is visible but doesn't
  // cause perceived speed changes the way ±1.2 did.
  const modelZ      = Math.sin(time * 0.2) * 0.4;
  const rotation    = mat4RotationAxis(AXIS.x, AXIS.y, AXIS.z, angle);
  const modelMatrix = mat4Mul(mat4Translation(0, 0, modelZ), rotation);

  const mvpMatrix = mat4Mul(projMatrix, mat4Mul(viewMatrix, modelMatrix));

  // ── Transform vertices: model space → clip space → NDC → screen ─────────────
  const screen = mesh.vertices.map(v => {
    const clip = mulMat4Vec4(mvpMatrix, toHomogeneous(v));
    const ndc  = fromHomogeneous(clip);
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
