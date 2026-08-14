import { type Vec3, vec3 } from './math';

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * A triangle face: three 0-based indices into the vertex array.
 * OBJ faces can be quads or higher; the parser fans them into triangles.
 */
export interface Face {
  a: number;
  b: number;
  c: number;
}

/**
 * The parsed output of an OBJ file (vertices + triangulated faces only).
 */
export interface ObjMesh {
  vertices: Vec3[];
  faces: Face[];
}

// ── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parses the text content of a .obj file and returns only the geometric data
 * (vertex positions and triangulated faces).
 *
 * Supported OBJ tokens:
 *   v  x y z      — vertex position (w component ignored if present)
 *   f  i j k ...  — polygon face using 1-based vertex indices
 *                   vertex/texture and vertex/texture/normal shorthand
 *                   (e.g. "1/2/3") are handled — only the vertex index is kept.
 *
 * Everything else (vn, vt, mtllib, usemtl, s, o, g, #) is silently skipped.
 *
 * Faces with more than 3 vertices are fan-triangulated:
 *   [v0, v1, v2, v3]  →  (v0,v1,v2)  (v0,v2,v3)
 *
 * @param text  Raw string content of the .obj file.
 * @returns     An ObjMesh with 0-based vertex indices.
 */
export function parseObj(text: string): ObjMesh {
  const vertices: Vec3[] = [];
  const faces: Face[] = [];

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();

    // Skip blank lines and comments
    if (line === '' || line.startsWith('#')) continue;

    const tokens = line.split(/\s+/);
    const token = tokens[0];

    // ── Vertex position ──────────────────────────────────────────────────────
    if (token === 'v') {
      const x = parseFloat(tokens[1]);
      const y = parseFloat(tokens[2]);
      const z = parseFloat(tokens[3]);
      // tokens[4] would be the optional w — ignored
      vertices.push(vec3(x, y, z));
      continue;
    }

    // ── Face ─────────────────────────────────────────────────────────────────
    if (token === 'f') {
      // Each face token may look like:  "3"  "3/1"  "3/1/2"  "3//2"
      // We only need the first number (vertex index) in each.
      const indices: number[] = [];

      for (let i = 1; i < tokens.length; i++) {
        // Split on '/' and take the first element (vertex index)
        const vertexIndex = parseInt(tokens[i].split('/')[0], 10);
        // OBJ uses 1-based indices; convert to 0-based
        indices.push(vertexIndex - 1);
      }

      // Fan-triangulate: anchor at indices[0], walk the rest in pairs
      for (let i = 1; i + 1 < indices.length; i++) {
        faces.push({ a: indices[0], b: indices[i], c: indices[i + 1] });
      }

      continue;
    }

    // Everything else (vn, vt, usemtl, o, g, s, …) — silently ignore
  }

  return { vertices, faces };
}
