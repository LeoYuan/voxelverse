import { BlockRegistry } from '../blocks/BlockRegistry';
import type { WorldMutation } from '../engine/ChunkManager';
import { CHUNK_HEIGHT } from '../engine/Chunk';
import type { InventorySlot } from '../player/Inventory';
import type { CampaignReward } from './CampaignConfig';
import { CAMPAIGN_CHAPTERS } from './CampaignConfig';
import type {
  CampaignPhase,
  CampaignProgress,
  CampaignSnapshot,
} from './CampaignManager';

export const CAMPAIGN_SAVE_KEY = 'voxelverse-campaign-v1';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface CampaignSaveData {
  version: 1;
  campaign: CampaignSnapshot;
  pendingRewards: CampaignReward[];
  inventory: {
    slots: InventorySlot[];
    selectedSlot: number;
  };
  player: { x: number; y: number; z: number };
  spawn: { x: number; y: number; z: number };
  mutations: WorldMutation[];
}

const VALID_PHASES = new Set<CampaignPhase>([
  'preparation',
  'ready',
  'defense',
  'complete',
]);

export class CampaignSaveStore {
  private readonly storage: StorageLike;

  constructor(storage: StorageLike) {
    this.storage = storage;
  }

  load(): CampaignSaveData | null {
    const raw = this.storage.getItem(CAMPAIGN_SAVE_KEY);
    if (!raw) return null;

    try {
      const value: unknown = JSON.parse(raw);
      return isCampaignSaveData(value) ? value : null;
    } catch {
      return null;
    }
  }

  save(data: CampaignSaveData) {
    this.storage.setItem(CAMPAIGN_SAVE_KEY, JSON.stringify(data));
  }

  clear() {
    this.storage.removeItem(CAMPAIGN_SAVE_KEY);
  }
}

function isCampaignSaveData(value: unknown): value is CampaignSaveData {
  if (!isRecord(value) || value.version !== 1) return false;
  if (!isCampaignSnapshot(value.campaign)) return false;
  if (!isRewardArray(value.pendingRewards)) return false;
  if (!isInventorySnapshot(value.inventory)) return false;
  if (!isPosition(value.player) || !isPosition(value.spawn)) return false;
  if (!isMutationArray(value.mutations)) return false;
  return true;
}

function isCampaignSnapshot(value: unknown): value is CampaignSnapshot {
  if (!isRecord(value)) return false;
  if (
    !isIntegerInRange(value.currentChapterIndex, 0, CAMPAIGN_CHAPTERS.length) ||
    typeof value.phase !== 'string' ||
    !VALID_PHASES.has(value.phase as CampaignPhase) ||
    !isNonNegativeInteger(value.chapterStartRevision) ||
    !isNonNegativeFinite(value.defenseTimeRemaining) ||
    !isNonNegativeInteger(value.defeatedEnemies) ||
    !isNonNegativeInteger(value.endlessWave) ||
    !isStringArray(value.claimedChapterIds) ||
    !isCampaignProgress(value.lastProgress)
  ) {
    return false;
  }
  return true;
}

function isCampaignProgress(value: unknown): value is CampaignProgress {
  return (
    isRecord(value) &&
    isNonNegativeFinite(value.objectiveCurrent) &&
    isNonNegativeFinite(value.objectiveTarget) &&
    typeof value.requirementsMet === 'boolean'
  );
}

function isRewardArray(value: unknown): value is CampaignReward[] {
  return (
    Array.isArray(value) &&
    value.length <= 100 &&
    value.every(reward =>
      isRecord(reward) &&
      isKnownBlockId(reward.blockId) &&
      isIntegerInRange(reward.count, 1, 64),
    )
  );
}

function isInventorySnapshot(
  value: unknown,
): value is { slots: InventorySlot[]; selectedSlot: number } {
  if (!isRecord(value) || !Array.isArray(value.slots) || value.slots.length !== 9) {
    return false;
  }
  if (!isIntegerInRange(value.selectedSlot, 0, 8)) return false;

  return value.slots.every(slot => {
    if (!isRecord(slot) || !isKnownBlockId(slot.blockId)) return false;
    if (slot.blockId === 0) return slot.count === 0;
    return isIntegerInRange(slot.count, 1, 64);
  });
}

function isPosition(value: unknown): value is { x: number; y: number; z: number } {
  return (
    isRecord(value) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.z)
  );
}

function isMutationArray(value: unknown): value is WorldMutation[] {
  return (
    Array.isArray(value) &&
    value.length <= 20_000 &&
    value.every(mutation =>
      isRecord(mutation) &&
      Number.isInteger(mutation.x) &&
      Number.isInteger(mutation.y) &&
      mutation.y >= 0 &&
      mutation.y < CHUNK_HEIGHT &&
      Number.isInteger(mutation.z) &&
      isKnownBlockId(mutation.blockId) &&
      isIntegerInRange(mutation.revision, 1, Number.MAX_SAFE_INTEGER),
    )
  );
}

function isKnownBlockId(value: unknown): value is number {
  if (!Number.isInteger(value)) return false;
  return BlockRegistry.getAll().some(block => block.id === value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= 100 &&
    value.every(item => typeof item === 'string' && item.length > 0 && item.length <= 100)
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isNonNegativeFinite(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
