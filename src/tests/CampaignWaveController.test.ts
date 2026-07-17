import { describe, expect, it } from 'vitest';
import type { CampaignDefense } from '../campaign/CampaignConfig';
import { CampaignWaveController } from '../campaign/CampaignWaveController';

const defense: CampaignDefense = {
  duration: 30,
  killTarget: 3,
  spawnInterval: 2,
  composition: {
    zombie: 0.5,
    skeleton: 0.3,
    creeper: 0.2,
  },
};

describe('CampaignWaveController', () => {
  it('spawns at the configured interval without exceeding the target', () => {
    const controller = new CampaignWaveController(() => 0.1);
    controller.start(defense);
    const spawned: string[] = [];

    controller.tick(1.9, kind => {
      spawned.push(kind);
      return `mob-${spawned.length}`;
    });
    expect(spawned).toEqual([]);

    controller.tick(0.1, kind => {
      spawned.push(kind);
      return `mob-${spawned.length}`;
    });
    controller.tick(10, kind => {
      spawned.push(kind);
      return `mob-${spawned.length}`;
    });

    expect(spawned).toEqual(['zombie', 'zombie', 'zombie']);
    expect(controller.getProgress()).toEqual({
      spawned: 3,
      active: 3,
      defeated: 0,
      target: 3,
    });
  });

  it('does not consume a spawn when the game cannot create the mob', () => {
    const controller = new CampaignWaveController(() => 0.6);
    controller.start(defense);

    controller.tick(2, () => null);
    expect(controller.getProgress().spawned).toBe(0);

    controller.tick(2, kind => `created-${kind}`);
    expect(controller.getProgress().spawned).toBe(1);
  });

  it('counts each campaign mob death once and ignores ambient IDs', () => {
    const controller = new CampaignWaveController(() => 0.6);
    controller.start(defense);
    controller.tick(6, (_, index) => `mob-${index}`);

    expect(controller.recordDeath('mob-0')).toBe(true);
    expect(controller.recordDeath('mob-0')).toBe(false);
    expect(controller.recordDeath('ambient-1')).toBe(false);
    expect(controller.getProgress()).toEqual({
      spawned: 3,
      active: 2,
      defeated: 1,
      target: 3,
    });
  });

  it('clears active IDs and resets accounting', () => {
    const controller = new CampaignWaveController(() => 0.95);
    controller.start(defense);
    controller.tick(4, (_, index) => `mob-${index}`);

    expect(controller.clear().sort()).toEqual(['mob-0', 'mob-1']);
    expect(controller.getProgress()).toEqual({
      spawned: 0,
      active: 0,
      defeated: 0,
      target: 0,
    });
  });

  it('starting a new wave resets prior counters and uses weighted enemy kinds', () => {
    const rolls = [0.1, 0.65, 0.95];
    const controller = new CampaignWaveController(() => rolls.shift() ?? 0);
    controller.start(defense);
    const kinds: string[] = [];
    controller.tick(6, (kind, index) => {
      kinds.push(kind);
      return `first-${index}`;
    });

    expect(kinds).toEqual(['zombie', 'skeleton', 'creeper']);

    controller.start({ ...defense, killTarget: 1 });
    expect(controller.getProgress()).toEqual({
      spawned: 0,
      active: 0,
      defeated: 0,
      target: 1,
    });
  });
});
