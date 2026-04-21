import { describe, it, expect } from 'vitest';
import { Vec3 } from '../utils/Vec3';

describe('Vec3', () => {
  it('should construct with correct values', () => {
    const v = new Vec3(1, 2, 3);
    expect(v.x).toBe(1);
    expect(v.y).toBe(2);
    expect(v.z).toBe(3);
  });

  it('should add vectors', () => {
    const a = new Vec3(1, 2, 3);
    const b = new Vec3(4, 5, 6);
    const c = a.add(b);
    expect(c.x).toBe(5);
    expect(c.y).toBe(7);
    expect(c.z).toBe(9);
  });

  it('should subtract vectors', () => {
    const a = new Vec3(5, 7, 9);
    const b = new Vec3(1, 2, 3);
    const c = a.sub(b);
    expect(c.x).toBe(4);
    expect(c.y).toBe(5);
    expect(c.z).toBe(6);
  });

  it('should multiply by scalar', () => {
    const v = new Vec3(1, 2, 3);
    const c = v.mul(2);
    expect(c.x).toBe(2);
    expect(c.y).toBe(4);
    expect(c.z).toBe(6);
  });

  it('should calculate length correctly', () => {
    const v = new Vec3(3, 4, 0);
    expect(v.length()).toBe(5);
  });

  it('should normalize to unit length', () => {
    const v = new Vec3(3, 4, 0);
    const n = v.normalize();
    expect(n.length()).toBeCloseTo(1);
  });

  it('should clone correctly', () => {
    const v = new Vec3(1, 2, 3);
    const c = v.clone();
    expect(c.x).toBe(v.x);
    expect(c.y).toBe(v.y);
    expect(c.z).toBe(v.z);
  });
});
