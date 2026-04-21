import { describe, it, expect } from 'vitest';
import { PerlinNoise } from '../utils/PerlinNoise';

describe('PerlinNoise', () => {
  it('should generate consistent values for the same seed and coordinates', () => {
    const noise = new PerlinNoise(42);
    const v1 = noise.noise2D(1.5, 2.5);
    const v2 = noise.noise2D(1.5, 2.5);
    expect(v1).toBe(v2);
  });

  it('should generate different values for different seeds', () => {
    const noise1 = new PerlinNoise(42);
    const noise2 = new PerlinNoise(99);
    const v1 = noise1.noise2D(1.5, 2.5);
    const v2 = noise2.noise2D(1.5, 2.5);
    expect(v1).not.toBe(v2);
  });

  it('should return values in range [-1, 1]', () => {
    const noise = new PerlinNoise(42);
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        const v = noise.noise2D(x, y);
        expect(v).toBeGreaterThanOrEqual(-1);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('fbm2D should return values in range [-1, 1]', () => {
    const noise = new PerlinNoise(42);
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        const v = noise.fbm2D(x, y, 4, 0.5, 2);
        expect(v).toBeGreaterThanOrEqual(-1);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});
