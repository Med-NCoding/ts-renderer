import { Framebuffer } from './framebuffer';
import {
  mat4Mul,
  mat4Translation,
  mat4Perspective,
  mat4RotationAxis,
  mat4RotationX, mat4RotationY,
  vec3Sub, vec3Cross, vec3Normalize, vec3Dot,
} from './math';
import { parseObj } from './obj-parser';
import objText from '../models/robot.obj?raw';
import { fillTriangle } from './rasterizer';

const WIDTH  = 640;
const HEIGHT = 480;

const canvas     = document.getElementById('render-canvas') as HTMLCanvasElement;
const fpsDisplay = document.getElementById('fps-display')   as HTMLSpanElement;

const fb = new Framebuffer(canvas, WIDTH, HEIGHT);

// ── Load OBJ ─────────────────────────────────────────────────────────────────
const mesh = parseObj(objText);

// ── Camera state ─────────────────────────────────────────────────────
let camX = 0, camY = 0, camZ = 4.8;  // world-space position
let camYaw   = 0;                      // left/right look (radians)
let camPitch = 0;                      // up/down look   (radians, clamped)
const CAM_SPEED  = 3.0;               // units per second
const MOUSE_SENS = 0.002;             // radians per pixel
const PITCH_MAX  = Math.PI / 2 - 0.01;

const keys = new Set<string>();
window.addEventListener('keydown', e => { keys.add(e.code); });
window.addEventListener('keyup',   e => { keys.delete(e.code); });

const hint = document.getElementById('hint') as HTMLDivElement | null;
canvas.addEventListener('click', () => canvas.requestPointerLock());
document.addEventListener('pointerlockchange', () => {
  if (hint) hint.dataset.locked = String(document.pointerLockElement === canvas);
});
document.addEventListener('mousemove', (e: MouseEvent) => {
  if (document.pointerLockElement !== canvas) return;
  camYaw   += e.movementX * MOUSE_SENS;
  camPitch -= e.movementY * MOUSE_SENS;
  camPitch  = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, camPitch));
});

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

// Pre-allocated buffers for zero-allocation vertex transformations
const numVerts = mesh.vertices.length;
const transformed: { x: number; y: number; z: number }[] = Array.from({ length: numVerts }, () => ({ x: 0, y: 0, z: 0 }));
const worldPos:    { x: number; y: number; z: number }[] = Array.from({ length: numVerts }, () => ({ x: 0, y: 0, z: 0 }));

// ── Render loop & Performance Instrumentation ────────────────────────────────
let lastTime         = performance.now();
let lastFpsTime      = lastTime;
let rafCallbacks     = 0;
let renderedFrames   = 0;
let totalRenderMs    = 0;
let time             = 0;
let angle            = 0;

function tick(now: number): void {
  rafCallbacks++;
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  time  += dt;
  angle += dt * 2.6;

  // ── Camera movement & orientation ────────────────────────────────────
  const fwdX = Math.sin(camYaw),  fwdZ = -Math.cos(camYaw);  // forward vector
  const rgtX = Math.cos(camYaw),  rgtZ =  Math.sin(camYaw);  // right (strafe)
  const spd  = CAM_SPEED * dt;

  if (keys.has('KeyW'))      { camX += fwdX * spd; camZ += fwdZ * spd; }
  if (keys.has('KeyS'))      { camX -= fwdX * spd; camZ -= fwdZ * spd; }
  if (keys.has('KeyA'))      { camX -= rgtX * spd; camZ -= rgtZ * spd; }
  if (keys.has('KeyD'))      { camX += rgtX * spd; camZ += rgtZ * spd; }
  if (keys.has('ArrowUp'))   { camY += spd; }
  if (keys.has('ArrowDown')) { camY -= spd; }

  // Clamp camera position within spatial boundary box around scene
  camX = Math.max(-5.5, Math.min(5.5, camX));
  camY = Math.max(-2.5, Math.min(4.0, camY));
  camZ = Math.max(0.5,  Math.min(9.0, camZ));

  // View matrix: combined pitch, yaw, and camera translation
  const viewMatrix = mat4Mul(
    mat4Mul(mat4RotationX(camPitch), mat4RotationY(camYaw)),
    mat4Translation(-camX, -camY, -camZ),
  );

  const renderStart = performance.now();

  fb.clear(0, 0, 0);

  // ── 4 robot instances — shared mesh, unique world offset + local transform ───
  //   1. Diagonal-axis spin  (original feel)       — left-front
  //   2. Bob up/down + slow yaw                    — right-front
  //   3. Move front/back (Z oscillation) + yaw     — left-back
  //   4. Pitch + roll oscillation                  — right-back
  const instances = [
    {
      px: -1.8, py: 0, pz:  0.0,
      local: mat4RotationAxis(AXIS.x, AXIS.y, AXIS.z, angle),
    },
    {
      px:  1.8, py: 0, pz:  0.0,
      local: mat4Mul(
        mat4Translation(0, Math.sin(time * 1.8) * 0.4, 0),
        mat4RotationAxis(0, 1, 0, time * 0.8),
      ),
    },
    {
      px: -1.8, py: 0, pz: -1.8,
      local: mat4Mul(
        mat4Translation(0, 0, Math.sin(time * 1.3) * 0.6),
        mat4RotationAxis(0, 1, 0, time * 0.6),
      ),
    },
    {
      px:  1.8, py: 0, pz: -1.8,
      local: mat4Mul(
        mat4RotationAxis(1, 0, 0, Math.sin(time * 1.1) * 0.4),
        mat4RotationAxis(0, 0, 1, Math.sin(time * 0.9) * 0.4),
      ),
    },
  ];

  for (const inst of instances) {
    const modelMatrix = mat4Mul(mat4Translation(inst.px, inst.py, inst.pz), inst.local);
    const mvpMatrix   = mat4Mul(projMatrix, mat4Mul(viewMatrix, modelMatrix));

    for (let i = 0; i < numVerts; i++) {
      const v = mesh.vertices[i];
      const vx = v.x, vy = v.y, vz = v.z;

      // Model → world (for diffuse normal calculation)
      const wp = worldPos[i];
      wp.x = modelMatrix[0]*vx + modelMatrix[1]*vy + modelMatrix[2]*vz + modelMatrix[3];
      wp.y = modelMatrix[4]*vx + modelMatrix[5]*vy + modelMatrix[6]*vz + modelMatrix[7];
      wp.z = modelMatrix[8]*vx + modelMatrix[9]*vy + modelMatrix[10]*vz + modelMatrix[11];

      // Model → clip → NDC → screen
      const cx = mvpMatrix[0]*vx + mvpMatrix[1]*vy + mvpMatrix[2]*vz + mvpMatrix[3];
      const cy = mvpMatrix[4]*vx + mvpMatrix[5]*vy + mvpMatrix[6]*vz + mvpMatrix[7];
      const cz = mvpMatrix[8]*vx + mvpMatrix[9]*vy + mvpMatrix[10]*vz + mvpMatrix[11];
      const cw = mvpMatrix[12]*vx + mvpMatrix[13]*vy + mvpMatrix[14]*vz + mvpMatrix[15];

      const invW = 1 / cw;
      const tp = transformed[i];
      tp.x = (cx * invW + 1) * 0.5 * WIDTH;
      tp.y = (1 - cy * invW) * 0.5 * HEIGHT;
      tp.z = cz * invW;
    }

    // Flat-shaded diffuse + ambient per face
    for (const { a, b, c } of mesh.faces) {
      const vA = transformed[a];
      const vB = transformed[b];
      const vC = transformed[c];

      // Back-face culling: 2D screen-space cross product (skip facing away / degenerate)
      const cross2D = (vB.x - vA.x) * (vC.y - vA.y) - (vB.y - vA.y) * (vC.x - vA.x);
      if (cross2D <= 0) continue;

      const edge1  = vec3Sub(worldPos[b], worldPos[a]);
      const edge2  = vec3Sub(worldPos[c], worldPos[a]);
      const normal = vec3Normalize(vec3Cross(edge1, edge2));

      const diffuse = Math.max(0, vec3Dot(normal, LIGHT_DIR));
      const ambient = 0.15;
      const factor  = ambient + (1.0 - ambient) * diffuse;

      const r      = Math.round(MATERIAL_R * factor);
      const g      = Math.round(MATERIAL_G * factor);
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
  }

  fb.present();

  const renderEnd = performance.now();
  totalRenderMs += (renderEnd - renderStart);
  renderedFrames++;

  if (now - lastFpsTime >= 1000) {
    const avgMs = renderedFrames > 0 ? (totalRenderMs / renderedFrames).toFixed(2) : '0.00';
    const text  = `RAF: ${rafCallbacks} | Render FPS: ${renderedFrames} | CPU: ${avgMs}ms`;
    if (fpsDisplay) fpsDisplay.textContent = text;
    console.log(`[PERF METRICS] ${text}`);
    rafCallbacks   = 0;
    renderedFrames = 0;
    totalRenderMs  = 0;
    lastFpsTime    = now;
  }

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
