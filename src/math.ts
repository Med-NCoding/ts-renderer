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

