import { describe, it, expect } from 'vitest';
import { DayNightCycle, DAY_LENGTH } from '../engine/DayNightCycle';

describe('DayNightCycle', () => {
  it('should initialize with default values', () => {
    const cycle = new DayNightCycle();
    expect(cycle.timeOfDay).toBe(0);
    expect(cycle.dayCount).toBe(1);
    expect(cycle.isDay).toBe(false);
    expect(cycle.isNight).toBe(true);
  });

  it('should update timeOfDay when not paused', () => {
    const cycle = new DayNightCycle();
    cycle.update(10);
    expect(cycle.timeOfDay).toBe(10);
  });

  it('should not update timeOfDay when paused', () => {
    const cycle = new DayNightCycle();
    cycle.pause();
    cycle.update(10);
    expect(cycle.timeOfDay).toBe(0);
    cycle.resume();
    cycle.update(10);
    expect(cycle.timeOfDay).toBe(10);
  });

  it('should increment dayCount when timeOfDay reaches DAY_LENGTH', () => {
    const cycle = new DayNightCycle();
    cycle.update(DAY_LENGTH + 5);
    expect(cycle.timeOfDay).toBe(5);
    expect(cycle.dayCount).toBe(2);
  });

  it('should compute sunAngle correctly at sunrise (timeOfDay = 0)', () => {
    const cycle = new DayNightCycle();
    expect(cycle.sunAngle).toBeCloseTo(-Math.PI / 2, 5);
  });

  it('should compute sunAngle correctly at noon', () => {
    const cycle = new DayNightCycle();
    cycle.update(DAY_LENGTH / 2);
    expect(cycle.sunAngle).toBeCloseTo(Math.PI / 2, 5);
  });

  it('should compute sunAngle correctly at sunset', () => {
    const cycle = new DayNightCycle();
    cycle.update(DAY_LENGTH / 4);
    expect(cycle.sunAngle).toBeCloseTo(0, 5);
  });

  it('should be day during day period', () => {
    const cycle = new DayNightCycle();
    // Day starts after t=0.25 and ends before t=0.75
    cycle.timeOfDay = DAY_LENGTH * 0.3;
    expect(cycle.isDay).toBe(true);
    expect(cycle.isNight).toBe(false);
  });

  it('should be night during night period', () => {
    const cycle = new DayNightCycle();
    cycle.timeOfDay = DAY_LENGTH * 0.1;
    expect(cycle.isDay).toBe(false);
    expect(cycle.isNight).toBe(true);
  });

  it('should return max lightLevel at noon', () => {
    const cycle = new DayNightCycle();
    cycle.timeOfDay = DAY_LENGTH * 0.5;
    expect(cycle.lightLevel).toBe(1.0);
  });

  it('should return min lightLevel at midnight', () => {
    const cycle = new DayNightCycle();
    cycle.timeOfDay = DAY_LENGTH * 0;
    expect(cycle.lightLevel).toBeCloseTo(0.2, 5);
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
    // At t=0, dawn interpolation p=0 gives the night color
    cycle.timeOfDay = 0;
    const color = cycle.skyColor;
    expect(color.r).toBeCloseTo(10 / 255, 5);
    expect(color.g).toBeCloseTo(10 / 255, 5);
    expect(color.b).toBeCloseTo(26 / 255, 5);
  });

  it('should interpolate sky color during dawn', () => {
    const cycle = new DayNightCycle();
    cycle.timeOfDay = DAY_LENGTH * 0.1;
    const color = cycle.skyColor;
    // At t=0.1, p = 0.1 / 0.2 = 0.5
    expect(color.r).toBeCloseTo((10 + (135 - 10) * 0.5) / 255, 5);
    expect(color.g).toBeCloseTo((10 + (206 - 10) * 0.5) / 255, 5);
    expect(color.b).toBeCloseTo((26 + (235 - 26) * 0.5) / 255, 5);
  });

  it('should handle multiple days correctly', () => {
    const cycle = new DayNightCycle();
    // Wraps once per update call, so step through days
    for (let i = 0; i < 3; i++) {
      cycle.update(DAY_LENGTH);
    }
    cycle.update(DAY_LENGTH * 0.5);
    expect(cycle.dayCount).toBe(4);
    expect(cycle.timeOfDay).toBeCloseTo(DAY_LENGTH * 0.5, 5);
    expect(cycle.isDay).toBe(true);
  });
});
