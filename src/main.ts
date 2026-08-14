import { Framebuffer } from './framebuffer';
import {
  toHomogeneous, fromHomogeneous,
  mulMat4Vec4, mat4Mul,
  mat4Translation,
  mat4Perspective,
  mat4RotationAxis,
  vec3Sub, vec3Cross, vec3Normalize, vec3Dot,
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
const viewMatrix = mat4Translation(0, 0, -4.8);

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

// Directional light vector pointing towards the light source (top-right-front)
const LIGHT_DIR = vec3Normalize({ x: 1.0, y: 2.0, z: 1.0 });

// Base material color (grey)
const MATERIAL_R = 150, MATERIAL_G = 150, MATERIAL_B = 150;

// ── NDC → screen pixels ───────────────────────────────────────────────────────
function ndcToScreen(x: number, y: number): { x: number; y: number } {
  return {
    x: (x + 1) * 0.5 * WIDTH,
    y: (1 - y) * 0.5 * HEIGHT,
  };
}

// ── Render loop ───────────────────────────────────────────────────────────────
let lastTime    = performance.now();
let lastFpsTime = lastTime;
let frameCount  = 0;
let time  = 0;
let angle = 0;

function tick(now: number): void {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  frameCount++;
  if (now - lastFpsTime >= 1000) {
    if (fpsDisplay) fpsDisplay.textContent = `${frameCount}`;
    frameCount = 0;
    lastFpsTime = now;
  }

  time  += dt;
  angle += dt * 0.6;

  fb.clear(0, 0, 0);

  // ── Build MVP ────────────────────────────────────────────────────────────────
  const modelZ      = Math.sin(time * 0.2) * 0.4;
  const rotation    = mat4RotationAxis(AXIS.x, AXIS.y, AXIS.z, angle);
  const modelMatrix = mat4Mul(mat4Translation(0, 0, modelZ), rotation);

  const mvpMatrix = mat4Mul(projMatrix, mat4Mul(viewMatrix, modelMatrix));

  // ── Transform vertices: model space → clip space → NDC → screen ─────────────
  const transformed = mesh.vertices.map(v => {
    const clip = mulMat4Vec4(mvpMatrix, toHomogeneous(v));
    const ndc  = fromHomogeneous(clip);
    const screenPt = ndcToScreen(ndc.x, ndc.y);
    return { x: screenPt.x, y: screenPt.y, z: ndc.z };
  });

  // ── Transform vertices to world space for normal calculation ───────────────
  const worldPos = mesh.vertices.map(v => {
    const world4 = mulMat4Vec4(modelMatrix, toHomogeneous(v));
    return fromHomogeneous(world4);
  });

  // ── Fill each face with flat grey modulated by diffuse lighting ───────────
  for (const { a, b, c } of mesh.faces) {
    // Compute face normal in world space
    const edge1 = vec3Sub(worldPos[b], worldPos[a]);
    const edge2 = vec3Sub(worldPos[c], worldPos[a]);
    const normal = vec3Normalize(vec3Cross(edge1, edge2));
    
    // Diffuse lighting intensity: dot(normal, lightDir)
    const diffuse = Math.max(0, vec3Dot(normal, LIGHT_DIR));
    
    // Add ambient component so unlit faces remain slightly visible
    const ambient = 0.15;
    const factor = ambient + (1.0 - ambient) * diffuse;

    const r = Math.round(MATERIAL_R * factor);
    const g = Math.round(MATERIAL_G * factor);
    const bColor = Math.round(MATERIAL_B * factor);

    fillTriangle(
      fb,
      transformed[a],
      transformed[b],
      transformed[c],
      transformed[a].z,
      transformed[b].z,
      transformed[c].z,
      r,
      g,
      bColor,
    );
  }

  // ── DEBUG wireframe (uncomment to overlay edges) ─────────────────────────
  // for (const { a, b, c } of mesh.faces) {
  //   fb.drawLineBresenham(transformed[a].x, transformed[a].y, transformed[b].x, transformed[b].y, 255, 80, 80);
  //   fb.drawLineBresenham(transformed[b].x, transformed[b].y, transformed[c].x, transformed[c].y, 255, 80, 80);
  //   fb.drawLineBresenham(transformed[c].x, transformed[c].y, transformed[a].x, transformed[a].y, 255, 80, 80);
  // }

  fb.present();
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
