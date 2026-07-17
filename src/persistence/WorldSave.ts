import type { InventorySlot } from '../player/Inventory';
import type { FurnaceSnapshot } from '../crafting/FurnaceRegistry';
import type { RedstoneEngineSnapshot } from '../redstone/RedstoneEngine';
import type { BlockDeltaSnapshot } from '../engine/ChunkManager';

export const WORLD_SAVE_VERSION = 1;

export interface Vec3Snapshot {
  x: number;
  y: number;
  z: number;
}

export interface PlayerSaveState {
  position: Vec3Snapshot;
  velocity: Vec3Snapshot;
  yaw: number;
  pitch: number;
  survivalMode: boolean;
  isFlying: boolean;
  selectedSlot: number;
  inventory: InventorySlot[];
  health: number;
  hunger: number;
  spawnPoint: Vec3Snapshot;
  toolDurability: Array<[number, number]>;
}

export interface TimeSaveState {
  timeOfDay: number;
  dayCount: number;
  paused: boolean;
}

export interface LevelSaveState {
  currentLevel: number;
  skipped: boolean;
}

export interface FurnaceSaveState {
  key: string;
  state: FurnaceSnapshot;
}

export interface WorldSave {
  version: number;
  slotId: string;
  name: string;
  seed: number;
  createdAt: string;
  updatedAt: string;
  playTime: number;
  player: PlayerSaveState;
  time: TimeSaveState;
  level: LevelSaveState;
  blocks: BlockDeltaSnapshot;
  redstone: RedstoneEngineSnapshot;
  furnaces: FurnaceSaveState[];
}

export interface SaveSlotSummary {
  slotId: string;
  name: string;
  updatedAt: string;
  playTime: number;
}
