import { describe, expect, it } from 'vitest';
import { BLOCK_PLANKS, BLOCK_STONE_PICKAXE } from '../blocks/BlockRegistry';
import {
  CAMPAIGN_SAVE_KEY,
  CampaignSaveStore,
  type CampaignSaveData,
  type StorageLike,
} from '../campaign/CampaignSaveStore';

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function validSave(): CampaignSaveData {
  return {
    version: 1,
    campaign: {
      currentChapterIndex: 1,
      phase: 'preparation',
      chapterStartRevision: 2,
      defenseTimeRemaining: 0,
      defeatedEnemies: 0,
      claimedChapterIds: ['establish-outpost'],
      endlessWave: 0,
      lastProgress: {
        objectiveCurrent: 0,
        objectiveTarget: 2,
        requirementsMet: false,
      },
    },
    pendingRewards: [{ blockId: BLOCK_STONE_PICKAXE, count: 1 }],
    inventory: {
      slots: [
        { blockId: BLOCK_PLANKS, count: 20 },
        ...Array.from({ length: 8 }, () => ({ blockId: 0, count: 0 })),
      ],
      selectedSlot: 0,
    },
    player: { x: 1, y: 10, z: 2 },
    spawn: { x: 0, y: 10, z: 0 },
    mutations: [
      { x: 1, y: 10, z: 1, blockId: BLOCK_PLANKS, revision: 2 },
    ],
  };
}

describe('CampaignSaveStore', () => {
  it('round trips a valid campaign save', () => {
    const storage = new MemoryStorage();
    const store = new CampaignSaveStore(storage);
    const save = validSave();

    store.save(save);

    expect(store.load()).toEqual(save);
  });

  it('returns null for missing, malformed, or unsupported saves', () => {
    const storage = new MemoryStorage();
    const store = new CampaignSaveStore(storage);

    expect(store.load()).toBeNull();

    storage.setItem(CAMPAIGN_SAVE_KEY, '{bad json');
    expect(store.load()).toBeNull();

    storage.setItem(CAMPAIGN_SAVE_KEY, JSON.stringify({ ...validSave(), version: 2 }));
    expect(store.load()).toBeNull();
  });

  it('rejects an invalid inventory as one whole save', () => {
    const storage = new MemoryStorage();
    const store = new CampaignSaveStore(storage);
    const invalid = validSave() as any;
    invalid.inventory.slots = [{ blockId: BLOCK_PLANKS, count: -1 }];
    storage.setItem(CAMPAIGN_SAVE_KEY, JSON.stringify(invalid));

    expect(store.load()).toBeNull();
  });

  it('rejects non-finite player coordinates and invalid mutations', () => {
    const storage = new MemoryStorage();
    const store = new CampaignSaveStore(storage);

    const invalidPlayer = validSave() as any;
    invalidPlayer.player.x = 'far';
    storage.setItem(CAMPAIGN_SAVE_KEY, JSON.stringify(invalidPlayer));
    expect(store.load()).toBeNull();

    const invalidMutation = validSave() as any;
    invalidMutation.mutations[0].blockId = 9999;
    storage.setItem(CAMPAIGN_SAVE_KEY, JSON.stringify(invalidMutation));
    expect(store.load()).toBeNull();
  });

  it('rejects invalid campaign and pending reward data', () => {
    const storage = new MemoryStorage();
    const store = new CampaignSaveStore(storage);

    const invalidPhase = validSave() as any;
    invalidPhase.campaign.phase = 'fighting';
    storage.setItem(CAMPAIGN_SAVE_KEY, JSON.stringify(invalidPhase));
    expect(store.load()).toBeNull();

    const invalidReward = validSave() as any;
    invalidReward.pendingRewards[0].count = 0;
    storage.setItem(CAMPAIGN_SAVE_KEY, JSON.stringify(invalidReward));
    expect(store.load()).toBeNull();
  });

  it('clears the campaign slot', () => {
    const storage = new MemoryStorage();
    const store = new CampaignSaveStore(storage);
    store.save(validSave());

    store.clear();

    expect(store.load()).toBeNull();
    expect(storage.getItem(CAMPAIGN_SAVE_KEY)).toBeNull();
  });
});
