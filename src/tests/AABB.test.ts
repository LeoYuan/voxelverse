import { describe, it, expect } from 'vitest';
import { AABB } from '../utils/AABB';
import { Vec3 } from '../utils/Vec3';

describe('AABB', () => {
  it('should intersect when overlapping', () => {
    const a = new AABB(0, 0, 0, 2, 2, 2);
    const b = new AABB(1, 1, 1, 3, 3, 3);
    expect(a.intersects(b)).toBe(true);
  });

  it('should not intersect when separated', () => {
    const a = new AABB(0, 0, 0, 1, 1, 1);
    const b = new AABB(2, 2, 2, 3, 3, 3);
    expect(a.intersects(b)).toBe(false);
  });

  it('should create from block coordinates', () => {
    const a = AABB.fromBlock(5, 6, 7);
    expect(a.minX).toBe(5);
    expect(a.minY).toBe(6);
    expect(a.minZ).toBe(7);
    expect(a.maxX).toBe(6);
    expect(a.maxY).toBe(7);
    expect(a.maxZ).toBe(8);
  });

  it('should contain a point inside', () => {
    const a = new AABB(0, 0, 0, 2, 2, 2);
    expect(a.containsPoint(new Vec3(1, 1, 1))).toBe(true);
  });

  it('should not contain a point outside', () => {
    const a = new AABB(0, 0, 0, 1, 1, 1);
    expect(a.containsPoint(new Vec3(2, 2, 2))).toBe(false);
  });

  it('should translate correctly', () => {
    const a = new AABB(0, 0, 0, 1, 1, 1);
    const b = a.translate(new Vec3(2, 3, 4));
    expect(b.minX).toBe(2);
    expect(b.minY).toBe(3);
    expect(b.minZ).toBe(4);
    expect(b.maxX).toBe(3);
    expect(b.maxY).toBe(4);
    expect(b.maxZ).toBe(5);
  });
});
