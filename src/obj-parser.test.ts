import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseObj } from './obj-parser';

// ── Load the fixture ─────────────────────────────────────────────────────────
const OBJ_PATH = resolve(__dirname, '../models/tetrahedron.obj');
const objText  = readFileSync(OBJ_PATH, 'utf8');

describe('parseObj — tetrahedron', () => {

  it('returns exactly 4 vertices', () => {
    const { vertices } = parseObj(objText);
    expect(vertices).toHaveLength(4);
  });

  it('returns exactly 4 triangular faces', () => {
    const { faces } = parseObj(objText);
    expect(faces).toHaveLength(4);
  });

  it('vertex 0 is the top apex  (0, 1, 0)', () => {
    const { vertices } = parseObj(objText);
    expect(vertices[0]).toEqual({ x: 0, y: 1, z: 0 });
  });

  it('vertex 1 is front-right base  (1, -1, 1)', () => {
    const { vertices } = parseObj(objText);
    expect(vertices[1]).toEqual({ x: 1, y: -1, z: 1 });
  });

  it('vertex 3 is back base  (0, -1, -2)', () => {
    const { vertices } = parseObj(objText);
    expect(vertices[3]).toEqual({ x: 0, y: -1, z: -2 });
  });

  it('all face indices are within [0, 3]', () => {
    const { faces } = parseObj(objText);
    for (const f of faces) {
      expect(f.a).toBeGreaterThanOrEqual(0);
      expect(f.b).toBeGreaterThanOrEqual(0);
      expect(f.c).toBeGreaterThanOrEqual(0);
      expect(f.a).toBeLessThanOrEqual(3);
      expect(f.b).toBeLessThanOrEqual(3);
      expect(f.c).toBeLessThanOrEqual(3);
    }
  });

  it('OBJ 1-based indices are converted to 0-based correctly', () => {
    // First face line: "f 1 3 2"  →  { a:0, b:2, c:1 }
    const { faces } = parseObj(objText);
    expect(faces[0]).toEqual({ a: 0, b: 2, c: 1 });
  });

  it('ignores comment and blank lines without crashing', () => {
    const stub = `
# this is a comment
v 1 0 0
v 0 1 0
v 0 0 1

f 1 2 3
    `;
    const mesh = parseObj(stub);
    expect(mesh.vertices).toHaveLength(3);
    expect(mesh.faces).toHaveLength(1);
  });

  it('fan-triangulates a quad face into 2 triangles', () => {
    const quad = `
v 0 0 0
v 1 0 0
v 1 1 0
v 0 1 0
f 1 2 3 4
    `;
    const { faces } = parseObj(quad);
    // Fan from v0: (0,1,2) and (0,2,3)
    expect(faces).toHaveLength(2);
    expect(faces[0]).toEqual({ a: 0, b: 1, c: 2 });
    expect(faces[1]).toEqual({ a: 0, b: 2, c: 3 });
  });

});
