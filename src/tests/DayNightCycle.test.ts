import { describe, it, expect } from 'vitest';
import { DayNightCycle, DAY_LENGTH } from '../engine/DayNightCycle';

describe('DayNightCycle', () => {
  it('should start at noon', () => {
    const cycle = new DayNightCycle();
    expect(cycle.timeOfDay).toBe(DAY_LENGTH * 0.5);
    expect(cycle.dayCount).toBe(1);
  });

  it('should be day at noon', () => {
    const cycle = new DayNightCycle();
    expect(cycle.isDay).toBe(true);
    expect(cycle.isNight).toBe(false);
  });

  it('should update timeOfDay when not paused', () => {
    const cycle = new DayNightCycle();
    const start = cycle.timeOfDay;
    cycle.update(10);
    expect(cycle.timeOfDay).toBe(start + 10);
  });

  it('should not update timeOfDay when paused', () => {
    const cycle = new DayNightCycle();
    cycle.pause();
    const start = cycle.timeOfDay;
    cycle.update(10);
    expect(cycle.timeOfDay).toBe(start);
    cycle.resume();
    cycle.update(10);
    expect(cycle.timeOfDay).toBe(start + 10);
  });

  it('should increment dayCount when timeOfDay reaches DAY_LENGTH', () => {
    const cycle = new DayNightCycle();
    cycle.timeOfDay = DAY_LENGTH - 5;
    cycle.update(10);
    expect(cycle.timeOfDay).toBe(5);
    expect(cycle.dayCount).toBe(2);
  });

  it('should compute sunAngle correctly at sunrise', () => {
    const cycle = new DayNightCycle();
    cycle.timeOfDay = 0;
    expect(cycle.sunAngle).toBeCloseTo(-Math.PI / 2, 5);
  });

  it('should compute sunAngle correctly at noon', () => {
    const cycle = new DayNightCycle();
    cycle.timeOfDay = DAY_LENGTH * 0.5;
    expect(cycle.sunAngle).toBeCloseTo(Math.PI / 2, 5);
  });

  it('should compute sunAngle correctly at sunset', () => {
    const cycle = new DayNightCycle();
    cycle.timeOfDay = DAY_LENGTH * 0.75;
    expect(cycle.sunAngle).toBeCloseTo(Math.PI, 5);
  });

  it('should return max lightLevel at noon', () => {
    const cycle = new DayNightCycle();
    cycle.timeOfDay = DAY_LENGTH * 0.5;
    expect(cycle.lightLevel).toBe(1.0);
  });

  it('should return dawn lightLevel at sunrise', () => {
    const cycle = new DayNightCycle();
    cycle.timeOfDay = 0;
    expect(cycle.lightLevel).toBeCloseTo(0.45, 5);
  });

  it('should return day sky color during day', () => {
    const cycle = new DayNightCycle();
    cycle.timeOfDay = DAY_LENGTH * 0.5;
    const color = cycle.skyColor;
    expect(color.r).toBeCloseTo(135 / 255, 5);
    expect(color.g).toBeCloseTo(206 / 255, 5);
    expect(color.b).toBeCloseTo(235 / 255, 5);
  });

  it('should return night sky color during night', () => {
    const cycle = new DayNightCycle();
    cycle.timeOfDay = DAY_LENGTH; // t = 1.0, fully dusk -> night
    const color = cycle.skyColor;
    expect(color.r).toBeCloseTo(10 / 255, 5);
    expect(color.g).toBeCloseTo(10 / 255, 5);
    expect(color.b).toBeCloseTo(26 / 255, 5);
  });

  it('should interpolate sky color during dawn', () => {
    const cycle = new DayNightCycle();
    cycle.timeOfDay = DAY_LENGTH * 0.1;
    const color = cycle.skyColor;
    const p = 0.1 / 0.2;
    expect(color.r).toBeCloseTo((10 + (135 - 10) * p) / 255, 5);
    expect(color.g).toBeCloseTo((10 + (206 - 10) * p) / 255, 5);
    expect(color.b).toBeCloseTo((26 + (235 - 26) * p) / 255, 5);
  });

  it('should handle multiple days correctly', () => {
    const cycle = new DayNightCycle();
    cycle.timeOfDay = 0;
    for (let i = 0; i < 3; i++) {
      cycle.update(DAY_LENGTH);
    }
    cycle.update(DAY_LENGTH * 0.5);
    expect(cycle.dayCount).toBe(4);
    expect(cycle.timeOfDay).toBeCloseTo(DAY_LENGTH * 0.5, 5);
    expect(cycle.isDay).toBe(true);
  });
});
