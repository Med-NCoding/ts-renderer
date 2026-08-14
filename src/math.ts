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
