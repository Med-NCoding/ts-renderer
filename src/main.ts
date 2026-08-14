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
import { fillTriangle } from './rasterizer';

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
const axisLen = Math.sqrt(1**2 + 1.6**2 + 0.5**2);
const AXIS = { x: 1 / axisLen, y: 1.6 / axisLen, z: 0.5 / axisLen };

// Single grey fill — will stay this colour until lighting is added.
const FILL_R = 150, FILL_G = 150, FILL_B = 150;

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
let angle = 0;

function tick(now: number): void {
  const dt = (now - lastTime) / 1000;
  frameCount++;
  if (now - lastTime >= 1000) {
    if (fpsDisplay) fpsDisplay.textContent = `${frameCount}`;
    frameCount = 0;
    lastTime = now;
  }

  time  += dt;
  angle += dt * 0.05;

  fb.clear(0, 0, 0);

  // ── Build MVP ────────────────────────────────────────────────────────────────
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

  // ── Fill each face with flat grey ──────────────────────────────────────────
  for (const { a, b, c } of mesh.faces) {
    fillTriangle(fb, screen[a], screen[b], screen[c], FILL_R, FILL_G, FILL_B);
  }

  // ── DEBUG wireframe (uncomment to overlay edges) ─────────────────────────
  // for (const { a, b, c } of mesh.faces) {
  //   fb.drawLineBresenham(screen[a].x, screen[a].y, screen[b].x, screen[b].y, 255, 80, 80);
  //   fb.drawLineBresenham(screen[b].x, screen[b].y, screen[c].x, screen[c].y, 255, 80, 80);
  //   fb.drawLineBresenham(screen[c].x, screen[c].y, screen[a].x, screen[a].y, 255, 80, 80);
  // }

  fb.present();
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
