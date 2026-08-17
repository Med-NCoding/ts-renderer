# ts-renderer

CPU software 3D renderer in TypeScript — no WebGL, Three.js, or GPU rendering API.

## Live Demo

[Live Demo](https://ts-renderer.vercel.app/)

## Gallery

https://github.com/user-attachments/assets/478801cf-72cb-4818-a3d4-e775985c40ad



https://github.com/user-attachments/assets/7f2e173c-f184-4f62-adce-05d20bdd9fba


## Features

- OBJ parser with fan triangulation
- 4x4 matrix transforms over homogeneous coordinates (model → view → projection)
- Perspective projection with divide-by-w
- Bounding-box triangle traversal with edge-function / barycentric coverage tests
- Per-pixel z-buffer depth testing
- Flat Lambertian diffuse lighting from face normals
- Back-face culling
- DDA + integer Bresenham line rasterization (wireframe mode)
- WASD + mouse-look camera
- Animated multi-object scene
- FPS / CPU frame-time instrumentation

## Rendering Pipeline

​```
OBJ → Model Transform → View Transform → Projection → Perspective Divide →
Screen Space → Back-Face Culling → Triangle Rasterization → Z-Buffer →
Diffuse Lighting → Framebuffer → Canvas
​```


Framebuffer is a fixed 640x480 RGBA buffer computed entirely on the CPU. HTML Canvas `ImageData` is used only to present the finished buffer — no canvas 2D drawing APIs are used for rendering.

## Perspective Divide

​```
invW    = 1 / cw
screenX = (cx * invW + 1) * 0.5 * WIDTH
screenY = (1 - cy * invW) * 0.5 * HEIGHT
depth   = cz * invW
​```

Clip-space `w` corresponds to `-camera-space z`; dividing x/y/z by `w` produces perspective foreshortening.

## Testing

14 passing Vitest tests covering OBJ parsing/index conversion/triangulation, triangle bounding boxes, barycentric coverage, inside/outside tests, and z-buffer depth behavior.

## Implementation Notes

- Preallocated transformed/world-position vertex buffers (no per-frame allocation)
- Inlined matrix-vector transforms and perspective divide
- Screen-space back-face culling
- Bounding-box viewport clamping
- Edge-function pixel rejection
- Early z-buffer depth testing
- `Uint32Array` framebuffer clearing, `Float32Array` depth clearing
- Direct `putImageData` presentation

## Controls

- Click canvas to lock pointer
- `WASD` — move
- Mouse — look
- `Esc` — release pointer lock

## Scene / Assets

Active scene: 4 animated robot instances (`robot.obj`, 111 vertices / 147
triangles each — 444 vertices / 588 triangles total).

Also included: `suzanne.obj` (507 vertices / 968 triangles), `cube.obj`
(8 vertices / 12 triangles, used for wireframe mode).

## Running Locally

​```
git clone https://github.com/Med-NCoding/ts-renderer
cd ts-renderer
npm install
npm run dev
​```

## Limitations

- No near/far-plane geometry clipping
- Screen-space depth interpolation, not perspective-correct 1/z interpolation
- Single-threaded CPU rendering
- Flat per-face shading, no textures/UVs
