import { Framebuffer } from './framebuffer';
import { type Vec3, vec3, rotateX, rotateY } from './math';

const WIDTH = 640;
const HEIGHT = 480;

const canvas = document.getElementById('render-canvas') as HTMLCanvasElement;
const fpsDisplay = document.getElementById('fps-display') as HTMLSpanElement;
const modeDisplay = document.getElementById('mode-display') as HTMLSpanElement;

if (!canvas) {
  throw new Error('Canvas element #render-canvas not found');
}

if (modeDisplay) {
  modeDisplay.textContent = '3D Points → Screen Dots';
}

const fb = new Framebuffer(canvas, WIDTH, HEIGHT);

// 1. Define 3D point cloud (Cube vertices + internal grid points)
const points: Vec3[] = [
  // 8 vertices of a unit cube (-1 to 1)
  vec3(-1, -1, -1),
  vec3(1, -1, -1),
  vec3(1, 1, -1),
  vec3(-1, 1, -1),
  vec3(-1, -1, 1),
  vec3(1, -1, 1),
  vec3(1, 1, 1),
  vec3(-1, 1, 1),
];

// Add extra points along edges for visual density
for (let i = -1; i <= 1; i += 0.4) {
  for (let j = -1; j <= 1; j += 0.4) {
    points.push(vec3(i, j, -1));
    points.push(vec3(i, j, 1));
    points.push(vec3(i, -1, j));
    points.push(vec3(i, 1, j));
    points.push(vec3(-1, i, j));
    points.push(vec3(1, i, j));
  }
}

let lastTime = performance.now();
let frameCount = 0;
let angleX = 0;
let angleY = 0;

/**
 * Projects a 3D point (x, y, z) into 2D screen pixel space (x_screen, y_screen).
 */
function project(v: Vec3, scale: number = 140): { x: number; y: number } {
  const halfW = WIDTH / 2;
  const halfH = HEIGHT / 2;

  // Orthographic coordinate mapping:
  // Note: Y is flipped because screen coordinates go top-to-bottom.
  const xScreen = halfW + v.x * scale;
  const yScreen = halfH - v.y * scale;

  return { x: xScreen, y: yScreen };
}

/**
 * Draws a multi-pixel dot at (x, y) with color brightness mapped to depth.
 */
function drawDot(x: number, y: number, r: number, g: number, b: number, size: number = 3): void {
  const halfSize = Math.floor(size / 2);
  for (let dy = -halfSize; dy <= halfSize; dy++) {
    for (let dx = -halfSize; dx <= halfSize; dx++) {
      fb.setPixel(x + dx, y + dy, r, g, b);
    }
  }
}

function render(deltaTime: number): void {
  // Clear screen to dark background
  fb.clear(13, 17, 23);

  // Update rotation angles
  angleX += deltaTime * 0.8;
  angleY += deltaTime * 1.2;

  // Render all 3D points
  for (const pt of points) {
    // 1. Rotate in 3D world space
    let rotated = rotateY(pt, angleY);
    rotated = rotateX(rotated, angleX);

    // 2. Project 3D point -> 2D screen coordinate
    const screen = project(rotated);

    // 3. Depth-based color shading (Z distance gives depth visual cue)
    const depthFactor = (rotated.z + 2) / 4; // Normalize to roughly 0..1
    const brightness = Math.floor(Math.max(0.2, Math.min(1.0, depthFactor)) * 255);

    // 4. Draw to Framebuffer
    drawDot(screen.x, screen.y, 88, brightness, 255);
  }

  fb.present();
}

function tick(now: number): void {
  const deltaTime = (now - lastTime) * 0.001;
  frameCount++;

  if (now - lastTime >= 1000) {
    if (fpsDisplay) {
      fpsDisplay.textContent = `${frameCount}`;
    }
    frameCount = 0;
    lastTime = now;
  }

  render(deltaTime);
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
