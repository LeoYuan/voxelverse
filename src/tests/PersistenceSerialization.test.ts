import { describe, expect, it } from 'vitest';
import { ChunkManager } from '../engine/ChunkManager';
import { RedstoneEngine } from '../redstone/RedstoneEngine';

describe('persistence serialization', () => {
  it('round-trips player block deltas', () => {
    const source = new ChunkManager(42);
    source.updatePlayerPosition(0, 0, 1);
    source.setBlock(1, 8, 1, 10);
    source.markPlayerPlaced(1, 8, 1);
    source.setBlock(2, 8, 1, 0);
    source.markPlayerRemoved(2, 8, 1);

    const snapshot = source.getBlockDeltas();
    const target = new ChunkManager(42);
    target.updatePlayerPosition(0, 0, 1);
    target.applyBlockDeltas(snapshot);

    expect(target.getBlock(1, 8, 1)).toBe(10);
    expect(target.isPlayerPlaced(1, 8, 1)).toBe(true);
    expect(target.getBlock(2, 8, 1)).toBe(0);
    expect(target.isPlayerRemoved(2, 8, 1)).toBe(true);
  });

  it('round-trips redstone components and power state', () => {
    const source = new RedstoneEngine();
    source.registerComponent({ x: 0, y: 0, z: 0, type: 'lever', active: true });
    source.registerComponent({ x: 1, y: 0, z: 0, type: 'dust' });
    source.registerComponent({ x: 2, y: 0, z: 0, type: 'lamp' });
    source.tick();
    source.tick();

    const target = new RedstoneEngine();
    target.restore(source.snapshot());

    expect(target.getComponent(0, 0, 0)?.type).toBe('lever');
    expect(target.getPower(1, 0, 0)).toBeGreaterThan(0);
    expect(target.isLampLit(2, 0, 0)).toBe(true);
  });
});
