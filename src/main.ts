import { Framebuffer } from './framebuffer';
import { type Vec3, vec3, rotateX, rotateY } from './math';

const WIDTH  = 640;
const HEIGHT = 480;

const canvas = document.getElementById('render-canvas') as HTMLCanvasElement;
const fpsDisplay   = document.getElementById('fps-display')   as HTMLSpanElement;
const modeDisplay  = document.getElementById('mode-display')  as HTMLSpanElement;

if (modeDisplay) modeDisplay.textContent = 'Wireframe Cube';

const fb = new Framebuffer(canvas, WIDTH, HEIGHT);

// ── Geometry ────────────────────────────────────────────────────────────────
// 8 corners of a unit cube, each coordinate is -1 or +1.
// Think of them as the corners of a box that goes from -1 to +1 on every axis.
const vertices: Vec3[] = [
  vec3(-1, -1, -1), // 0 — back  bottom left
  vec3( 1, -1, -1), // 1 — back  bottom right
  vec3( 1,  1, -1), // 2 — back  top    right
  vec3(-1,  1, -1), // 3 — back  top    left
  vec3(-1, -1,  1), // 4 — front bottom left
  vec3( 1, -1,  1), // 5 — front bottom right
  vec3( 1,  1,  1), // 6 — front top    right
  vec3(-1,  1,  1), // 7 — front top    left
];

// 12 edges: each entry is [indexA, indexB] — two vertex indices to connect.
// 4 edges on the back face + 4 on the front face + 4 connecting them = 12.
const edges: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 0], // back  face
  [4, 5], [5, 6], [6, 7], [7, 4], // front face
  [0, 4], [1, 5], [2, 6], [3, 7], // connecting pillars
];

// ── Projection (same orthographic mapping as Stage 2) ───────────────────────
function project(v: Vec3): { x: number; y: number } {
  const scale = 150;
  return {
    x: WIDTH  / 2 + v.x * scale,
    y: HEIGHT / 2 - v.y * scale, // flip Y: screen Y grows downward
  };
}

// ── Render loop ─────────────────────────────────────────────────────────────
let lastTime  = performance.now();
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

  // 1. Rotate every vertex, project to 2D, store screen coords
  const screen: { x: number; y: number }[] = vertices.map(v => {
    const r = rotateX(rotateY(v, angleY), angleX);
    return project(r);
  });

  // 2. For each edge, draw a Bresenham line between its two projected endpoints
  for (const [a, b] of edges) {
    fb.drawLineBresenham(
      screen[a].x, screen[a].y,
      screen[b].x, screen[b].y,
      80, 200, 255,
    );
  }

  fb.present();
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
