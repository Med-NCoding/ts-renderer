export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Creates a new 3D vector.
 */
export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

/**
 * Rotates a 3D point around the Y axis by angle theta (radians).
 */
export function rotateY(v: Vec3, angle: number): Vec3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: v.x * cos + v.z * sin,
    y: v.y,
    z: -v.x * sin + v.z * cos,
  };
}

/**
 * Rotates a 3D point around the X axis by angle theta (radians).
 */
export function rotateX(v: Vec3, angle: number): Vec3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: v.x,
    y: v.y * cos - v.z * sin,
    z: v.y * sin + v.z * cos,
  };
}

// ── Homogeneous coordinates (Vec4) ───────────────────────────────────────────

/**
 * A 4-component homogeneous coordinate vector.
 *
 * In homogeneous space a 3D point (x, y, z) is represented as (x, y, z, 1).
 * Multiplying a homogeneous vector by a projection matrix produces a new
 * vector whose w component encodes depth; dividing xyz by w (the "perspective
 * divide") then gives the final 2D Cartesian position.
 */
export interface Vec4 {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * Creates a new 4-component homogeneous vector.
 */
export function vec4(x: number, y: number, z: number, w: number): Vec4 {
  return { x, y, z, w };
}

/**
 * Lifts a Vec3 point into homogeneous space by setting w = 1.
 *
 * w = 1 means "this is a position" (as opposed to w = 0 which would mean
 * "this is a direction / vector at infinity").
 */
export function toHomogeneous(v: Vec3): Vec4 {
  return { x: v.x, y: v.y, z: v.z, w: 1 };
}

/**
 * Converts a homogeneous Vec4 back to Cartesian Vec3 via the perspective divide.
 *
 *   result = (x/w, y/w, z/w)
 *
 * When w = 1 (orthographic, no projection applied yet) this is a no-op.
 * When w ≠ 1 (after a perspective projection matrix is applied) dividing
 * by w is what causes distant objects to appear smaller — it IS the perspective.
 *
 * Throws if w = 0 (a direction vector has no Cartesian position).
 */
export function fromHomogeneous(v: Vec4): Vec3 {
  if (v.w === 0) throw new RangeError('fromHomogeneous: w = 0 (direction vector has no Cartesian position)');
  const invW = 1 / v.w;
  return { x: v.x * invW, y: v.y * invW, z: v.z * invW };
}

// ── 4×4 Matrix ───────────────────────────────────────────────────────────────

/**
 * A 4×4 matrix stored as a flat, row-major array of 16 numbers.
 *
 * Row-major layout means the array reads left-to-right, top-to-bottom:
 *
 *   index:  [ 0,  1,  2,  3,   ← row 0
 *             4,  5,  6,  7,   ← row 1
 *             8,  9, 10, 11,   ← row 2
 *            12, 13, 14, 15 ]  ← row 3
 *
 * Visually as a matrix:
 *   | m[0]  m[1]  m[2]  m[3]  |
 *   | m[4]  m[5]  m[6]  m[7]  |
 *   | m[8]  m[9]  m[10] m[11] |
 *   | m[12] m[13] m[14] m[15] |
 */
export type Mat4 = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
];

/**
 * Returns the 4×4 identity matrix — the "do nothing" transform.
 *
 *   | 1 0 0 0 |
 *   | 0 1 0 0 |
 *   | 0 0 1 0 |
 *   | 0 0 0 1 |
 *
 * Any vector multiplied by the identity comes out unchanged.
 * Used as a starting point before applying rotations, projections, etc.
 */
export function mat4Identity(): Mat4 {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
}

/**
 * Multiplies a 4×4 matrix by a Vec4 column vector: result = M · v
 *
 * Each output component is the dot product of one matrix row with v:
 *
 *   result.x = m[0]·v.x  + m[1]·v.y  + m[2]·v.z  + m[3]·v.w
 *   result.y = m[4]·v.x  + m[5]·v.y  + m[6]·v.z  + m[7]·v.w
 *   result.z = m[8]·v.x  + m[9]·v.y  + m[10]·v.z + m[11]·v.w
 *   result.w = m[12]·v.x + m[13]·v.y + m[14]·v.z + m[15]·v.w
 *
 * This is the core operation that will power every transform stage:
 * model → world → camera → clip space.
 */
export function mulMat4Vec4(m: Mat4, v: Vec4): Vec4 {
  return {
    x: m[0]  * v.x + m[1]  * v.y + m[2]  * v.z + m[3]  * v.w,
    y: m[4]  * v.x + m[5]  * v.y + m[6]  * v.z + m[7]  * v.w,
    z: m[8]  * v.x + m[9]  * v.y + m[10] * v.z + m[11] * v.w,
    w: m[12] * v.x + m[13] * v.y + m[14] * v.z + m[15] * v.w,
  };
}

/**
 * Multiplies two 4×4 matrices: result = a · b
 *
 * Used to combine transforms into a single matrix before applying to vertices.
 * Order matters: a · b applies b first, then a.
 *
 * Example:  mat4Mul(mat4RotationX(ax), mat4RotationY(ay))
 *   → rotates Y first, then X  (same order as the old rotateX(rotateY(...)))
 */
export function mat4Mul(a: Mat4, b: Mat4): Mat4 {
  return [
    a[0]*b[0]  + a[1]*b[4]  + a[2]*b[8]  + a[3]*b[12],
    a[0]*b[1]  + a[1]*b[5]  + a[2]*b[9]  + a[3]*b[13],
    a[0]*b[2]  + a[1]*b[6]  + a[2]*b[10] + a[3]*b[14],
    a[0]*b[3]  + a[1]*b[7]  + a[2]*b[11] + a[3]*b[15],

    a[4]*b[0]  + a[5]*b[4]  + a[6]*b[8]  + a[7]*b[12],
    a[4]*b[1]  + a[5]*b[5]  + a[6]*b[9]  + a[7]*b[13],
    a[4]*b[2]  + a[5]*b[6]  + a[6]*b[10] + a[7]*b[14],
    a[4]*b[3]  + a[5]*b[7]  + a[6]*b[11] + a[7]*b[15],

    a[8]*b[0]  + a[9]*b[4]  + a[10]*b[8]  + a[11]*b[12],
    a[8]*b[1]  + a[9]*b[5]  + a[10]*b[9]  + a[11]*b[13],
    a[8]*b[2]  + a[9]*b[6]  + a[10]*b[10] + a[11]*b[14],
    a[8]*b[3]  + a[9]*b[7]  + a[10]*b[11] + a[11]*b[15],

    a[12]*b[0] + a[13]*b[4] + a[14]*b[8]  + a[15]*b[12],
    a[12]*b[1] + a[13]*b[5] + a[14]*b[9]  + a[15]*b[13],
    a[12]*b[2] + a[13]*b[6] + a[14]*b[10] + a[15]*b[14],
    a[12]*b[3] + a[13]*b[7] + a[14]*b[11] + a[15]*b[15],
  ];
}

/**
 * Returns a rotation matrix around the X axis by `angle` radians.
 *
 *   | 1    0       0    0 |
 *   | 0  cos θ  -sin θ  0 |
 *   | 0  sin θ   cos θ  0 |
 *   | 0    0       0    1 |
 */
export function mat4RotationX(angle: number): Mat4 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    1,  0,  0,  0,
    0,  c, -s,  0,
    0,  s,  c,  0,
    0,  0,  0,  1,
  ];
}

/**
 * Returns a rotation matrix around the Y axis by `angle` radians.
 *
 *   |  cos θ  0  sin θ  0 |
 *   |    0    1    0    0 |
 *   | -sin θ  0  cos θ  0 |
 *   |    0    0    0    1 |
 */
export function mat4RotationY(angle: number): Mat4 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
     c,  0,  s,  0,
     0,  1,  0,  0,
    -s,  0,  c,  0,
     0,  0,  0,  1,
  ];
}

/**
 * Returns a translation matrix that moves points by (tx, ty, tz).
 *
 *   | 1  0  0  tx |
 *   | 0  1  0  ty |
 *   | 0  0  1  tz |
 *   | 0  0  0   1 |
 *
 * To express a camera at position (cx, cy, cz), translate the world by
 * (-cx, -cy, -cz) — that is, move everything relative to the camera,
 * not the camera relative to everything.
 */
export function mat4Translation(tx: number, ty: number, tz: number): Mat4 {
  return [
    1, 0, 0, tx,
    0, 1, 0, ty,
    0, 0, 1, tz,
    0, 0, 0,  1,
  ];
}

/**
 * Returns the standard right-handed perspective projection matrix.
 *
 * Parameters:
 *   fovY   — vertical field of view in radians (e.g. Math.PI / 3  for 60°)
 *   aspect — viewport width / height            (e.g. 640 / 480)
 *   near   — distance to the near clip plane    (e.g. 0.1)
 *   far    — distance to the far clip plane     (e.g. 100)
 *
 * The camera looks down the −Z axis (right-handed convention).
 * Input points must be in camera space with z ∈ (−far, −near).
 *
 * The matrix (row-major, applied as M · v):
 *
 *   f = 1 / tan(fovY / 2)          ← "focal length" — how zoomed in we are
 *   d = near − far                 ← depth range (always negative)
 *
 *   | f/aspect   0        0              0         |
 *   |   0        f        0              0         |
 *   |   0        0   (far+near)/d    2·far·near/d  |
 *   |   0        0       −1              0         |
 *
 * After multiplying a camera-space point (x,y,z,1):
 *   clip.w = −z                  ← depth encoded in w
 *
 * After fromHomogeneous() divides by w (the perspective divide):
 *   NDC.x = (f/aspect · x) / −z  → smaller when z is more negative (farther)
 *   NDC.y = (f · y)       / −z  → same — this IS the perspective shrinkage
 *   NDC.z = depth value in [−1, 1] for clipping
 */
export function mat4Perspective(
  fovY: number,
  aspect: number,
  near: number,
  far: number,
): Mat4 {
  const f = 1.0 / Math.tan(fovY / 2);   // focal length
  const d = near - far;                  // always negative

  return [
    f / aspect,  0,              0,                    0,
    0,           f,              0,                    0,
    0,           0,  (far + near) / d,  (2 * far * near) / d,
    0,           0,             -1,                    0,
  ];
}

