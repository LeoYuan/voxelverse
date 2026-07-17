import * as THREE from 'three';
import { VoxelRenderer } from './rendering/VoxelRenderer';
import { ChunkManager } from './engine/ChunkManager';
import { PlayerController } from './player/PlayerController';
import { CHUNK_SIZE, CHUNK_HEIGHT } from './engine/Chunk';
import { DayNightCycle, DAY_LENGTH } from './engine/DayNightCycle';
import { PlayerStats } from './player/PlayerStats';
import {
  BLOCK_BED, BLOCK_REDSTONE_DUST, BLOCK_REDSTONE_TORCH,
  BLOCK_REDSTONE_LAMP, BLOCK_REDSTONE_LAMP_LIT, BLOCK_LEVER,
  BLOCK_BUTTON, BLOCK_REDSTONE_BLOCK, BLOCK_REPEATER,
  BLOCK_WATER, BLOCK_PLANKS, BLOCK_WOOD, BLOCK_SLAB_WOOD, BLOCK_CRAFTING_TABLE, BLOCK_COBBLESTONE,
  BLOCK_FLOWER_YELLOW, BLOCK_FLOWER_RED, BLOCK_FURNACE,
  BLOCK_CHEST, BLOCK_BRICK, BLOCK_STONE, BLOCK_COAL_ORE,
  BLOCK_SLAB_STONE, BLOCK_TALL_GRASS, BLOCK_LEAVES,
  BLOCK_DIRT, BLOCK_COOKED_BEEF, BLOCK_WOODEN_PICKAXE,
  BlockRegistry, type BlockCategory
} from './blocks/BlockRegistry';
import { RedstoneEngine } from './redstone/RedstoneEngine';
import { DropEntity } from './entities/DropEntity';
import { Mob } from './entities/Mob';
import { Zombie } from './entities/Zombie';
import { Skeleton } from './entities/Skeleton';
import { Creeper } from './entities/Creeper';
import { Cow } from './entities/Cow';
import { Crafting } from './crafting/CraftingRegistry';
import { FurnaceRegistry, FurnaceState } from './crafting/FurnaceRegistry';
import { LevelManager, LEVELS } from './tutorial/BuildingLevels';
import { getLevelPreviewLayout } from './tutorial/levelPreview';
import { shouldIgnoreSettingsButtonKeyboardActivation } from './player/inputBehavior';
import { getInitialSceneLayout } from './world/initialSceneLayout';
import { WorldSaveStore } from './persistence/WorldSaveStore';
import { WORLD_SAVE_VERSION, type FurnaceSaveState, type WorldSave } from './persistence/WorldSave';
import { getSharedSoundEffects } from './player/soundEffects';
import {
  toBinary8,
  traceArithmetic,
  type ArithmeticOperation,
  type ArithmeticTrace,
} from './creative/ArithmeticVisualizer';
import { buildArithmeticComponentLayout } from './creative/ArithmeticComponentBuilder';
import { CampaignManager } from './campaign/CampaignManager';
import { CampaignWaveController } from './campaign/CampaignWaveController';
import { CampaignRuntime } from './campaign/CampaignRuntime';
import { CampaignHud } from './campaign/CampaignHud';
import {
  CampaignSaveStore,
  type CampaignSaveData,
} from './campaign/CampaignSaveStore';
import {
  evaluateCampaignObjective,
} from './campaign/CampaignObjectiveEvaluator';
import type { CampaignEnemyKind } from './campaign/CampaignConfig';
import {
  AttackCooldown,
  getAttackDamage,
  getKnockbackDirection,
  selectAttackTarget,
} from './combat/playerAttack';
import './style.css';

type GameMode = 'campaign' | 'challenge' | 'creative' | 'survival';

const RENDER_DISTANCE = 4;
const CHUNK_MESHES_PER_FRAME = 2;
const CHUNK_DATA_LOADS_PER_FRAME = 1;

const container = document.getElementById('app')!;
let activeMode: GameMode = 'campaign';

// Disable right-click context menu in game
container.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

// Init renderer
const vr = new VoxelRenderer(container);

// Init world
const chunkManager = new ChunkManager(42);
const WORLD_SEED = 42;
const saveStore = new WorldSaveStore();
let playTimeSeconds = 0;
const soundEffects = getSharedSoundEffects();
const LEVEL_PROGRESS_KEY = 'voxelverse-current-level';
const SOUND_ENABLED_KEY = 'voxelverse-sound-enabled';
const VOLUME_KEY = 'voxelverse-volume';

// Redstone engine
const redstoneEngine = new RedstoneEngine();

// Day night cycle - paused at daytime for new player experience
const dayNight = new DayNightCycle();
dayNight.setDay();

// Initial chunk loading around origin
const pendingChunkMeshes = new Map<string, ReturnType<ChunkManager['ensureChunk']>>();
const initialChunks = chunkManager.updatePlayerPosition(
  0,
  0,
  RENDER_DISTANCE,
  CHUNK_DATA_LOADS_PER_FRAME,
);
for (const chunk of initialChunks.loaded) {
  const key = `${chunk.cx},${chunk.cz}`;
  if (chunk.cx === 0 && chunk.cz === 0) {
    vr.addChunkMesh(chunk);
  } else {
    pendingChunkMeshes.set(key, chunk);
  }
}

function queueChunkMesh(chunk: ReturnType<ChunkManager['ensureChunk']>) {
  pendingChunkMeshes.set(`${chunk.cx},${chunk.cz}`, chunk);
}

function processChunkMeshQueue(limit = CHUNK_MESHES_PER_FRAME) {
  let processed = 0;
  for (const [key, queuedChunk] of pendingChunkMeshes) {
    pendingChunkMeshes.delete(key);
    const currentChunk = chunkManager.getChunk(queuedChunk.cx, queuedChunk.cz);
    if (currentChunk === queuedChunk) {
      vr.addChunkMesh(queuedChunk);
      processed++;
    }
    if (processed >= limit) break;
  }
}

const initialSceneLayout = getInitialSceneLayout();
const campaignSaveStore = new CampaignSaveStore(localStorage);
const initialCampaignSave = campaignSaveStore.load();
const campaignManager = new CampaignManager();
const campaignWave = new CampaignWaveController();
let campaignRuntime: CampaignRuntime;

function fillRect(baseX: number, y: number, baseZ: number, width: number, depth: number, blockId: number) {
  for (let x = 0; x < width; x++) {
    for (let z = 0; z < depth; z++) {
      chunkManager.setBlock(baseX + x, y, baseZ + z, blockId);
    }
  }
}

function buildSimpleTree(baseX: number, baseY: number, baseZ: number) {
  for (let y = 0; y < 4; y++) {
    chunkManager.setBlock(baseX, baseY + y, baseZ, BLOCK_WOOD);
  }

  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      chunkManager.setBlock(baseX + dx, baseY + 3, baseZ + dz, BLOCK_LEAVES);
      if (Math.abs(dx) + Math.abs(dz) < 2) {
        chunkManager.setBlock(baseX + dx, baseY + 4, baseZ + dz, BLOCK_LEAVES);
      }
    }
  }
}

function buildSpawnPlaza() {
  const { spawn, spawnLookTarget } = initialSceneLayout;
  const baseY = 9;

  for (let dx = -5; dx <= 5; dx++) {
    for (let dz = -5; dz <= 5; dz++) {
      for (let y = baseY + 1; y <= baseY + 4; y++) {
        chunkManager.setBlock(spawn.x + dx, y, spawn.z + dz, 0);
      }

      const dist = Math.abs(dx) + Math.abs(dz);
      const blockId = dist <= 4 ? BLOCK_COBBLESTONE : BLOCK_STONE;
      chunkManager.setBlock(spawn.x + dx, baseY, spawn.z + dz, blockId);

      if (Math.abs(dx) === 5 || Math.abs(dz) === 5) {
        chunkManager.setBlock(spawn.x + dx, baseY + 1, spawn.z + dz, BLOCK_SLAB_STONE);
      }
    }
  }

  fillRect(spawn.x - 1, baseY + 1, spawn.z - 1, 3, 3, BLOCK_PLANKS);

  const forwardX = Math.sign(spawnLookTarget.x - spawn.x);
  const forwardZ = Math.sign(spawnLookTarget.z - spawn.z);
  const sideX = -forwardZ;
  const sideZ = forwardX;
  for (let i = 1; i <= 4; i++) {
    chunkManager.setBlock(spawn.x + forwardX * i, baseY + 1, spawn.z + forwardZ * i, BLOCK_PLANKS);
  }

  for (const offset of [-4, 4]) {
    const pillarX = spawn.x + sideX * offset;
    const pillarZ = spawn.z + sideZ * offset;
    for (let y = 1; y <= 2; y++) {
      chunkManager.setBlock(pillarX, baseY + y, pillarZ, BLOCK_STONE);
    }
    chunkManager.setBlock(pillarX, baseY + 3, pillarZ, BLOCK_REDSTONE_LAMP);
  }
}

function buildMaterialPoint() {
  const { materialPoint } = initialSceneLayout;
  const groundY = getGroundHeight(materialPoint.x, materialPoint.z);

  buildSimpleTree(materialPoint.x - 2, groundY + 1, materialPoint.z);
  buildSimpleTree(materialPoint.x + 1, groundY + 1, materialPoint.z + 2);

  for (let x = -2; x <= 2; x++) {
    for (let z = -1; z <= 2; z++) {
      chunkManager.setBlock(materialPoint.x + x, groundY, materialPoint.z + z, BLOCK_DIRT);
      if ((x + z) % 2 === 0) {
        chunkManager.setBlock(materialPoint.x + x, groundY + 1, materialPoint.z + z, BLOCK_TALL_GRASS);
      }
    }
  }

  const quarryX = materialPoint.x + 3;
  const quarryZ = materialPoint.z - 1;
  for (let dx = 0; dx < 3; dx++) {
    for (let dz = 0; dz < 3; dz++) {
      chunkManager.setBlock(quarryX + dx, groundY, quarryZ + dz, BLOCK_COBBLESTONE);
      chunkManager.setBlock(quarryX + dx, groundY - 1, quarryZ + dz, BLOCK_STONE);
      if (dx === 1 && dz === 1) {
        chunkManager.setBlock(quarryX + dx, groundY, quarryZ + dz, 0);
        chunkManager.setBlock(quarryX + dx, groundY - 2, quarryZ + dz, BLOCK_COAL_ORE);
      }
    }
  }
}

function buildBuildingPoint() {
  const { buildingPoint } = initialSceneLayout;
  const groundY = getGroundHeight(buildingPoint.x, buildingPoint.z);

  fillRect(buildingPoint.x, groundY, buildingPoint.z, 5, 5, BLOCK_PLANKS);

  const cornerPosts = [
    [0, 0], [4, 0], [0, 4], [4, 4],
  ];
  for (const [dx, dz] of cornerPosts) {
    chunkManager.setBlock(buildingPoint.x + dx, groundY + 1, buildingPoint.z + dz, BLOCK_WOOD);
    chunkManager.setBlock(buildingPoint.x + dx, groundY + 2, buildingPoint.z + dz, BLOCK_WOOD);
  }

  for (let x = 1; x <= 3; x++) {
    chunkManager.setBlock(buildingPoint.x + x, groundY + 1, buildingPoint.z, BLOCK_PLANKS);
  }
  for (let z = 1; z <= 2; z++) {
    chunkManager.setBlock(buildingPoint.x, groundY + 1, buildingPoint.z + z, BLOCK_PLANKS);
  }
  for (let z = 2; z <= 4; z++) {
    chunkManager.setBlock(buildingPoint.x + 4, groundY + 1, buildingPoint.z + z, BLOCK_PLANKS);
  }
  for (let x = 1; x <= 3; x++) {
    chunkManager.setBlock(buildingPoint.x + x, groundY + 3, buildingPoint.z + 1, BLOCK_SLAB_WOOD);
  }
  chunkManager.setBlock(buildingPoint.x + 1, groundY + 1, buildingPoint.z + 1, BLOCK_WOOD);
  chunkManager.setBlock(buildingPoint.x + 1, groundY + 2, buildingPoint.z + 1, BLOCK_WOOD);
  chunkManager.setBlock(buildingPoint.x + 3, groundY + 1, buildingPoint.z + 3, BLOCK_WOOD);
  chunkManager.setBlock(buildingPoint.x + 3, groundY + 2, buildingPoint.z + 3, BLOCK_WOOD);

  chunkManager.setBlock(buildingPoint.x + 2, groundY + 1, buildingPoint.z + 2, BLOCK_CHEST);
  chunkManager.setBlock(buildingPoint.x + 1, groundY + 1, buildingPoint.z + 4, BLOCK_BED);
  chunkManager.setBlock(buildingPoint.x + 2, groundY + 1, buildingPoint.z + 4, BLOCK_BED);
}

function buildUtilityPoint() {
  const { utilityPoint } = initialSceneLayout;
  const groundY = getGroundHeight(utilityPoint.x, utilityPoint.z);

  fillRect(utilityPoint.x, groundY, utilityPoint.z, 6, 5, BLOCK_COBBLESTONE);

  for (let x = 0; x < 6; x++) {
    chunkManager.setBlock(utilityPoint.x + x, groundY + 3, utilityPoint.z, BLOCK_SLAB_STONE);
  }
  for (let z = 0; z < 4; z++) {
    chunkManager.setBlock(utilityPoint.x, groundY + 1, utilityPoint.z + z, BLOCK_BRICK);
    chunkManager.setBlock(utilityPoint.x + 5, groundY + 1, utilityPoint.z + z, BLOCK_BRICK);
  }

  chunkManager.setBlock(utilityPoint.x + 1, groundY + 1, utilityPoint.z + 1, BLOCK_CRAFTING_TABLE);
  chunkManager.setBlock(utilityPoint.x + 2, groundY + 1, utilityPoint.z + 1, BLOCK_FURNACE);
  chunkManager.setBlock(utilityPoint.x + 4, groundY + 1, utilityPoint.z + 1, BLOCK_CHEST);

  chunkManager.setBlock(utilityPoint.x + 1, groundY + 1, utilityPoint.z + 3, BLOCK_LEVER);
  chunkManager.setBlock(utilityPoint.x + 2, groundY + 1, utilityPoint.z + 3, BLOCK_REDSTONE_DUST);
  chunkManager.setBlock(utilityPoint.x + 3, groundY + 1, utilityPoint.z + 3, BLOCK_REDSTONE_DUST);
  chunkManager.setBlock(utilityPoint.x + 4, groundY + 1, utilityPoint.z + 3, BLOCK_REDSTONE_LAMP);
}

function buildRewardPoint() {
  const { rewardPoint } = initialSceneLayout;
  const groundY = getGroundHeight(rewardPoint.x, rewardPoint.z);
  const towerHeight = initialSceneLayout.rewardBeaconHeight;

  for (let x = 0; x < 4; x++) {
    for (let z = 0; z < 4; z++) {
      chunkManager.setBlock(rewardPoint.x + x, groundY, rewardPoint.z + z, BLOCK_STONE);
    }
  }

  for (let y = 1; y <= towerHeight; y++) {
    chunkManager.setBlock(rewardPoint.x, groundY + y, rewardPoint.z, BLOCK_STONE);
    chunkManager.setBlock(rewardPoint.x + 3, groundY + y, rewardPoint.z, BLOCK_STONE);
    chunkManager.setBlock(rewardPoint.x, groundY + y, rewardPoint.z + 3, BLOCK_STONE);
    chunkManager.setBlock(rewardPoint.x + 3, groundY + y, rewardPoint.z + 3, BLOCK_STONE);
  }

  for (let x = -1; x <= 4; x++) {
    for (let z = -1; z <= 4; z++) {
      if (x >= 0 && x <= 3 && z >= 0 && z <= 3) continue;
      chunkManager.setBlock(rewardPoint.x + x, groundY + towerHeight + 1, rewardPoint.z + z, BLOCK_SLAB_STONE);
    }
  }

  chunkManager.setBlock(rewardPoint.x + 1, groundY + towerHeight + 2, rewardPoint.z + 1, BLOCK_REDSTONE_LAMP);
  chunkManager.setBlock(rewardPoint.x + 2, groundY + towerHeight + 2, rewardPoint.z + 1, BLOCK_REDSTONE_LAMP);
  chunkManager.setBlock(rewardPoint.x + 1, groundY + towerHeight + 3, rewardPoint.z + 1, BLOCK_REDSTONE_LAMP);
  chunkManager.setBlock(rewardPoint.x + 2, groundY + towerHeight + 3, rewardPoint.z + 1, BLOCK_REDSTONE_LAMP);
  chunkManager.setBlock(rewardPoint.x + 1, groundY + towerHeight + 4, rewardPoint.z + 2, BLOCK_REDSTONE_LAMP);
}

function buildGuidedPaths() {
  for (const { from, to } of initialSceneLayout.paths) {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const steps = Math.max(Math.abs(dx), Math.abs(dz));

    for (let i = 0; i <= steps; i++) {
      const x = Math.floor(from.x + (dx * i) / steps);
      const z = Math.floor(from.z + (dz * i) / steps);
      const pathY = getGroundHeight(x, z);

      chunkManager.setBlock(x, pathY, z, BLOCK_COBBLESTONE);
      chunkManager.setBlock(x + 1, pathY, z, BLOCK_COBBLESTONE);
      if ((i + x + z) % 5 === 0) {
        chunkManager.setBlock(x, pathY + 1, z, BLOCK_FLOWER_YELLOW);
      }
    }
  }
}

function addAmbientDetails() {
  const flowerAreas = [
    [-10, 1], [4, 11], [14, -3], [-15, -10],
  ];

  for (const [fx, fz] of flowerAreas) {
    const groundY = getGroundHeight(fx, fz);
    chunkManager.setBlock(fx, groundY + 1, fz, BLOCK_FLOWER_RED);
    chunkManager.setBlock(fx + 1, groundY + 1, fz, BLOCK_FLOWER_YELLOW);
  }

  const pondX = 14;
  const pondZ = 10;
  const pondY = getGroundHeight(pondX, pondZ);
  for (let dx = 0; dx < 3; dx++) {
    for (let dz = 0; dz < 3; dz++) {
      chunkManager.setBlock(pondX + dx, pondY, pondZ + dz, 0);
      chunkManager.setBlock(pondX + dx, pondY - 1, pondZ + dz, BLOCK_WATER);
    }
  }
}

function buildInitialScene() {
  buildSpawnPlaza();
  buildMaterialPoint();
  buildBuildingPoint();
  buildUtilityPoint();
  buildRewardPoint();
  buildGuidedPaths();
  addAmbientDetails();
  rebuildAffectedChunks();
}

function rebuildAffectedChunks() {
  const points = [
    initialSceneLayout.spawn,
    initialSceneLayout.materialPoint,
    initialSceneLayout.buildingPoint,
    initialSceneLayout.utilityPoint,
    initialSceneLayout.rewardPoint,
  ];
  const minX = Math.min(...points.map((point) => point.x)) - 12;
  const maxX = Math.max(...points.map((point) => point.x)) + 12;
  const minZ = Math.min(...points.map((point) => point.z)) - 12;
  const maxZ = Math.max(...points.map((point) => point.z)) + 12;

  const affectedChunks = new Set<string>();
  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      affectedChunks.add(`${Math.floor(x / CHUNK_SIZE)},${Math.floor(z / CHUNK_SIZE)}`);
    }
  }
  for (const key of affectedChunks) {
    const [cx, cz] = key.split(',').map(Number);
    const chunk = chunkManager.getChunk(cx, cz);
    if (chunk) vr.rebuildChunkMesh(chunk);
  }
}
// Find ground height at a given position (top solid block)
function getGroundHeight(x: number, z: number): number {
  let y = CHUNK_HEIGHT - 1;
  while (y > 0 && !chunkManager.isSolid(Math.floor(x), y, Math.floor(z))) {
    y--;
  }
  return y + 1; // Return height above the top solid block
}

buildInitialScene();

let spawnPoint = { x: initialSceneLayout.spawn.x, y: 10, z: initialSceneLayout.spawn.z };

const player = new PlayerController(
  vr.camera,
  chunkManager,
  vr,
  (wx, wy, wz) => {
    const blockId = chunkManager.getBlock(wx, wy, wz);

    // Sync redstone components
    redstoneEngine.removeComponent(wx, wy, wz);
    if (blockId === BLOCK_REDSTONE_DUST) {
      redstoneEngine.registerComponent({ x: wx, y: wy, z: wz, type: 'dust' });
    } else if (blockId === BLOCK_REDSTONE_TORCH) {
      redstoneEngine.registerComponent({ x: wx, y: wy, z: wz, type: 'torch', facing: { x: 0, y: -1, z: 0 } });
    } else if (blockId === BLOCK_REDSTONE_LAMP || blockId === BLOCK_REDSTONE_LAMP_LIT) {
      redstoneEngine.registerComponent({ x: wx, y: wy, z: wz, type: 'lamp' });
    } else if (blockId === BLOCK_LEVER) {
      redstoneEngine.registerComponent({ x: wx, y: wy, z: wz, type: 'lever', active: false });
    } else if (blockId === BLOCK_BUTTON) {
      redstoneEngine.registerComponent({ x: wx, y: wy, z: wz, type: 'button', active: false });
    } else if (blockId === BLOCK_REDSTONE_BLOCK) {
      redstoneEngine.registerComponent({ x: wx, y: wy, z: wz, type: 'block' });
    } else if (blockId === BLOCK_REPEATER) {
      redstoneEngine.registerComponent({ x: wx, y: wy, z: wz, type: 'repeater', facing: { x: -1, y: 0, z: 0 }, delay: 1 });
    }

    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = chunkManager.getChunk(cx, cz);
    if (chunk) {
      vr.rebuildChunkMesh(chunk);
    }
  },
  (x, y, z, blockId) => {
    if (blockId === BLOCK_BED) {
      spawnPoint = { x, y: y + 1, z };
      // Show spawn set message temporarily
      const msg = document.createElement('div');
      msg.textContent = '已设置重生点';
      msg.style.cssText = 'position:fixed;top:40%;left:50%;transform:translateX(-50%);color:#0f0;font-size:18px;text-shadow:0 0 4px #000;pointer-events:none;transition:opacity 1s;';
      document.body.appendChild(msg);
      setTimeout(() => { msg.style.opacity = '0'; }, 500);
      setTimeout(() => msg.remove(), 1500);
    }
    if (blockId === BLOCK_LEVER) {
      redstoneEngine.toggleLever(x, y, z);
    }
    if (blockId === BLOCK_BUTTON) {
      redstoneEngine.pressButton(x, y, z);
    }
    if (blockId === BLOCK_FURNACE) {
      openFurnaceUI(x, y, z);
    }
  },
  (blockId) => {
    // In survival mode, add to inventory
    if (player.survivalMode) {
      const overflow = player.inventory.addItem(blockId, 1);
      if (overflow === 0) {
        // Food auto-consumed if hunger is low
        if (blockId === 30) { // BLOCK_ROTTEN_FLESH
          if (playerStats.hunger < playerStats.maxHunger) {
            playerStats.eat(2);
            player.inventory.removeFromSlot(player.inventory.selectedSlot, 1);
          }
        }
        if (blockId === 31) { // BLOCK_RAW_BEEF
          if (playerStats.hunger < playerStats.maxHunger) {
            playerStats.eat(5);
            player.inventory.removeFromSlot(player.inventory.selectedSlot, 1);
          }
        }
        return true;
      }
      return false;
    }
    // Creative mode: just consume food directly
    if (blockId === 30) { playerStats.eat(2); }
    if (blockId === 31) { playerStats.eat(5); }
    if (blockId === BLOCK_COOKED_BEEF) { playerStats.eat(8); }
    return true;
  },
  tryAttackMob,
);

player.position.y = spawnPoint.y;
player.lookAt(spawnPoint.x + (initialSceneLayout.spawnLookTarget.x - initialSceneLayout.spawn.x), spawnPoint.y + 1, spawnPoint.z + (initialSceneLayout.spawnLookTarget.z - initialSceneLayout.spawn.z));
player.modeToggleEnabled = false;

// The menu controls game-mode activation.
player.survivalMode = false;

// Load saved hotbar or use defaults
const savedHotbar = localStorage.getItem('voxelverse-hotbar');
if (savedHotbar) {
  try {
    const parsed = JSON.parse(savedHotbar);
    for (let i = 0; i < 9; i++) {
      if (parsed[i] && parsed[i].blockId) {
        player.inventory.slots[i] = { blockId: parsed[i].blockId, count: 1 };
      }
    }
  } catch {
    // ignore parse errors
  }
} else {
  // Pre-populate creative hotbar with common blocks
  player.inventory.slots[0] = { blockId: 1, count: 1 };   // grass
  player.inventory.slots[1] = { blockId: 3, count: 1 };   // stone
  player.inventory.slots[2] = { blockId: 4, count: 1 };   // wood
  player.inventory.slots[3] = { blockId: 5, count: 1 };   // glass
  player.inventory.slots[4] = { blockId: 10, count: 1 };  // planks
  // slots 5-8 are empty for user to fill
}

// Give survival mode players a starter kit
function giveStarterKit() {
  player.inventory.addItem(4, 16);   // 16 wood
  player.inventory.addItem(10, 32);  // 32 planks
  player.inventory.addItem(41, 1);   // wooden pickaxe
  player.inventory.addItem(31, 3);   // 3 raw beef
}

function clearInventory() {
  for (let i = 0; i < player.inventory.slots.length; i++) {
    player.inventory.slots[i] = { blockId: 0, count: 0 };
  }
  player.inventory.setSelectedSlot(0);
}

function showToast(message: string) {
  const msg = document.createElement('div');
  msg.textContent = message;
  msg.style.cssText = 'position:fixed;top:40%;left:50%;transform:translateX(-50%);color:#fff;background:rgba(0,0,0,0.72);border:1px solid rgba(255,255,255,0.2);border-radius:6px;padding:10px 14px;font-size:16px;text-shadow:0 0 4px #000;pointer-events:none;z-index:2000;transition:opacity 0.4s;';
  document.body.appendChild(msg);
  setTimeout(() => { msg.style.opacity = '0'; }, 900);
  setTimeout(() => msg.remove(), 1400);
}

function getPointerLockHint() {
  return document.getElementById('pointer-lock-hint') as HTMLElement | null;
}

function updatePointerLockHint() {
  const hint = getPointerLockHint();
  if (!hint) return;
  hint.style.display = !startMenuVisible && document.pointerLockElement !== document.body ? 'block' : 'none';
}

function persistLevelProgress() {
  if (!levelManager.skipped) {
    localStorage.setItem(LEVEL_PROGRESS_KEY, String(levelManager.currentLevel));
  }
}

function readSavedLevelProgress() {
  const saved = Number(localStorage.getItem(LEVEL_PROGRESS_KEY));
  if (!Number.isInteger(saved)) return 0;
  return Math.max(0, Math.min(LEVELS.length - 1, saved));
}

function applySoundSettings(soundEnabled: boolean, volumePercent: number) {
  const clampedVolume = Math.max(0, Math.min(100, Math.trunc(volumePercent)));
  soundEffects.setMuted(!soundEnabled);
  soundEffects.setVolume(clampedVolume / 100);
  localStorage.setItem(SOUND_ENABLED_KEY, soundEnabled ? '1' : '0');
  localStorage.setItem(VOLUME_KEY, String(clampedVolume));
}

function giveCampaignStarterKit() {
  player.inventory.restore({
    slots: Array.from({ length: 9 }, () => ({ blockId: 0, count: 0 })),
    selectedSlot: 0,
  });
  player.inventory.addItem(BLOCK_PLANKS, 20);
  player.inventory.addItem(BLOCK_WOODEN_PICKAXE, 1);
  player.inventory.addItem(BLOCK_COOKED_BEEF, 2);
}

// Player stats
const playerStats = new PlayerStats();

// UI overlay
const ui = document.createElement('div');
ui.className = 'ui-overlay';
ui.innerHTML = `
  <div class="crosshair">+</div>
  <button class="settings-btn" id="settings-btn" title="设置">&#9881;</button>
  <div class="creative-panel" id="creative-panel" style="display: none;">
    <div class="creative-tabs">
      <div class="creative-tab active" data-cat="natural">自然</div>
      <div class="creative-tab" data-cat="wood">木材</div>
      <div class="creative-tab" data-cat="building">建筑</div>
      <div class="creative-tab" data-cat="ore">矿石</div>
      <div class="creative-tab" data-cat="functional">功能</div>
      <div class="creative-tab" data-cat="redstone">红石</div>
      <div class="creative-tab" data-cat="tools">工具</div>
      <div class="creative-tab" data-cat="food">食物</div>
    </div>
    <div class="creative-tools">
      <button class="creative-tool-btn" id="arithmetic-toggle" type="button">ALU</button>
    </div>
    <div class="creative-tool-hint">ALU：8 位四则运算与红石组件生成</div>
    <div class="creative-grid"></div>
    <div class="arithmetic-panel" id="arithmetic-panel" style="display: none;">
      <div class="arithmetic-header">
        <span>8 位四则运算</span>
        <span class="arithmetic-step-count" id="arithmetic-step-count">0/0</span>
      </div>
      <div class="arithmetic-controls">
        <label>A<input id="arithmetic-input-a" type="number" min="0" max="255" value="200" /></label>
        <label>B<input id="arithmetic-input-b" type="number" min="0" max="255" value="12" /></label>
      </div>
      <div class="arithmetic-ops" role="group" aria-label="operation">
        <button class="arithmetic-op active" type="button" data-op="add">+</button>
        <button class="arithmetic-op" type="button" data-op="sub">-</button>
        <button class="arithmetic-op" type="button" data-op="mul">x</button>
        <button class="arithmetic-op" type="button" data-op="div">/</button>
      </div>
      <div class="arithmetic-lanes" id="arithmetic-lanes"></div>
      <div class="arithmetic-status" id="arithmetic-status"></div>
      <div class="arithmetic-step-note" id="arithmetic-step-note"></div>
      <div class="arithmetic-step-controls">
        <button id="arithmetic-prev" type="button">上一步</button>
        <button id="arithmetic-next" type="button">下一步</button>
        <button id="arithmetic-reset" type="button">重置</button>
        <button id="arithmetic-build" type="button">生成组件</button>
      </div>
    </div>
  </div>
  <div class="hotbar" id="hotbar">
    <div class="slot active" data-idx="0"><div class="slot-color" style="background:#6dbf35"></div><span class="slot-name">草方块</span></div>
    <div class="slot" data-idx="1"><div class="slot-color" style="background:#8a8a8a"></div><span class="slot-name">石头</span></div>
    <div class="slot" data-idx="2"><div class="slot-color" style="background:#6e4c2e"></div><span class="slot-name">原木</span></div>
    <div class="slot" data-idx="3"><div class="slot-color" style="background:#add8e6"></div><span class="slot-name">玻璃</span></div>
    <div class="slot" data-idx="4"><div class="slot-color" style="background:#a07830"></div><span class="slot-name">木板</span></div>
    <div class="slot" data-idx="5"><div class="slot-color" style="background:transparent"></div><span class="slot-name"></span></div>
    <div class="slot" data-idx="6"><div class="slot-color" style="background:transparent"></div><span class="slot-name"></span></div>
    <div class="slot" data-idx="7"><div class="slot-color" style="background:transparent"></div><span class="slot-name"></span></div>
    <div class="slot" data-idx="8"><div class="slot-color" style="background:transparent"></div><span class="slot-name"></span></div>
  </div>
  <div class="time-display">Day 1 - Morning</div>
  <div class="stats-bars">
    <div class="bar health-bar">
      <div class="bar-fill health-fill" style="width: 100%"></div>
      <span class="bar-label">HP</span>
    </div>
    <div class="bar hunger-bar">
      <div class="bar-fill hunger-fill" style="width: 100%"></div>
      <span class="bar-label">饱食度</span>
    </div>
    <div class="gamemode-label">创造模式</div>
  </div>
  <div class="death-screen" style="display: none;">
    <div class="death-message">你死了！</div>
    <div class="death-hint">按 R 重生</div>
  </div>
  <div class="instructions" id="instructions">
    <p>WASD移动 | 空格跳跃/双击飞行 | Shift下降 | 左键破坏 | 右键放置 | G切换模式 | H打开菜单</p>
  </div>
  <div class="pointer-lock-hint" id="pointer-lock-hint">
    <p>按 Enter 进入游戏</p>
  </div>
  <div class="first-step" id="first-step">
    <p>点击下方标签选方块 → 点快捷栏格子切换 → 右键放置</p>
  </div>
  <div class="level-hud" id="level-hud">
    <div class="level-copy">
      <div class="level-title" id="level-title">第一块方块</div>
      <div class="level-progress" id="level-progress">第 1 / 4 关</div>
    </div>
    <div class="level-preview" id="level-preview" style="display:none;"></div>
  </div>
  <div class="level-hint" id="level-hint">右键点击地面放置一个方块</div>
  <div class="level-progress-bars" id="level-progress-bars"></div>
  <div class="level-complete-popup" id="level-complete-popup" style="display:none;">
    <div class="level-complete-content">
      <h3>完成！</h3>
      <p id="level-complete-text">你放置了第一个方块！</p>
      <button id="level-next-btn" class="btn-primary">下一关</button>
    </div>
  </div>
`;
container.appendChild(ui);
const campaignHud = CampaignHud.mount(ui);
campaignHud.setActionHandler(() => {
  if (campaignRuntime?.runReadyAction()) {
    campaignHud.render(campaignRuntime.getViewModel());
    document.body.requestPointerLock();
  }
});

// Enhanced Start Menu - always visible on start, can be reopened with H key
let startMenu: HTMLElement | null = null;
let startMenuVisible = true;

function showStartMenu() {
  if (startMenu) return; // Already visible
  startMenuVisible = true;
  document.exitPointerLock();
  updatePointerLockHint();
  const campaignSaveMetadata = campaignSaveStore.load() ?? initialCampaignSave;
  const campaignSaveLabel = campaignSaveMetadata
    ? campaignSaveMetadata.campaign.currentChapterIndex >= 5
      ? `继续战役 · 无尽第 ${Math.max(1, campaignSaveMetadata.campaign.endlessWave)} 波`
      : `继续战役 · 第 ${campaignSaveMetadata.campaign.currentChapterIndex + 1} 章`
    : '新战役';
  startMenu = document.createElement('div');
  startMenu.className = 'start-menu';
  startMenu.innerHTML = `
    <div class="start-container">
      <div class="start-header">
        <h1>VOXELVERSE</h1>
        <p>建造你的基地，轻松守过每一个夜晚</p>
      </div>
      <div class="start-body">
        <div class="start-tabs">
          <div class="start-tab active" data-tab="mode">开始游戏</div>
          <div class="start-tab" data-tab="saves">存档</div>
          <div class="start-tab" data-tab="settings">设置</div>
          <div class="start-tab" data-tab="guide">游戏说明</div>
        </div>

        <div class="start-panel active" data-panel="mode">
          <div class="mode-cards">
            <div class="mode-card campaign-card selected" data-mode="campaign">
              <div class="mode-icon">🏕️</div>
              <div class="campaign-card-copy">
                <div class="campaign-card-heading">
                  <h3>基地战役</h3>
                  <span class="campaign-save-label">${campaignSaveLabel}</span>
                </div>
                <p>持续建造同一座基地，完成五章目标，并在有上限的夜袭中守住成果。</p>
              </div>
              ${campaignSaveMetadata ? '<button class="campaign-reset" id="campaign-reset" type="button">重新开始</button>' : ''}
            </div>
            <div class="mode-card" data-mode="challenge">
              <div class="mode-icon">🏆</div>
              <h3>闯关模式</h3>
              <p>20关进阶挑战，难度递增</p>
              <div class="level-select-row">
                <label>起始关卡：</label>
                <select id="level-select">
                  <option value="0">1 - 第一块方块</option>
                  <option value="1">2 - 小小高塔</option>
                  <option value="2">3 - 小平台</option>
                  <option value="3">4 - 小房子</option>
                  <option value="4">5 - 更高的塔</option>
                  <option value="5">6 - 大平台</option>
                  <option value="6">7 - 石头房子</option>
                  <option value="7">8 - 叠加平台</option>
                  <option value="8">9 - 围栏</option>
                  <option value="9">10 - 木栈道</option>
                  <option value="10">11 - 长廊</option>
                  <option value="11">12 - 观景台</option>
                  <option value="12">13 - 窗户房子</option>
                  <option value="13">14 - 城堡一角</option>
                  <option value="14">15 - 隧道</option>
                  <option value="15">16 - 地下室</option>
                  <option value="16">17 - 水池</option>
                  <option value="17">18 - 阶梯建筑</option>
                  <option value="18">19 - 复合结构</option>
                  <option value="19">20 - 自由创作</option>
                </select>
              </div>
            </div>
            <div class="mode-card" data-mode="creative">
              <div class="mode-icon">🏗️</div>
              <h3>自由建造</h3>
              <p>创造模式，无限方块自由建造</p>
            </div>
            <div class="mode-card" data-mode="survival">
              <div class="mode-icon">⚔️</div>
              <h3>生存挑战</h3>
              <p>采集资源、合成工具、对抗怪物</p>
              <label class="mode-option">
                <input type="checkbox" id="survival-starter-kit">
                <span>带新手包</span>
              </label>
            </div>
          </div>
        </div>

        <div class="start-panel" data-panel="saves">
          <div class="settings-section">
            <h4>世界存档</h4>
            <div id="save-slot-list" class="save-slot-list"></div>
          </div>
        </div>

        <div class="start-panel" data-panel="settings">
          <div class="settings-section">
            <h4>控制设置</h4>
            <div class="settings-row">
              <label>鼠标灵敏度</label>
              <input type="range" id="sensitivity" min="1" max="10" value="5">
            </div>
            <div class="settings-row">
              <label>飞行速度</label>
              <input type="range" id="flyspeed" min="1" max="10" value="5">
            </div>
          </div>
          <div class="settings-section">
            <h4>音效设置</h4>
            <div class="settings-row">
              <label>音效开关</label>
              <input type="checkbox" id="sound-enabled" checked>
            </div>
            <div class="settings-row">
              <label>音量</label>
              <input type="range" id="volume" min="0" max="100" value="80">
            </div>
          </div>
          <div class="settings-section">
            <h4>显示设置</h4>
            <div class="settings-row">
              <label>UI 显示</label>
              <select id="ui-mode">
                <option value="full">完整显示</option>
                <option value="minimal">精简显示</option>
                <option value="hidden">隐藏 UI</option>
              </select>
            </div>
          </div>
        </div>

        <div class="start-panel" data-panel="guide">
          <div class="guide-section">
            <h4>基本操作</h4>
            <div class="guide-list">
              <div class="guide-item"><span class="key">WASD</span> 移动</div>
              <div class="guide-item"><span class="key">空格</span> 跳跃/上升</div>
              <div class="guide-item"><span class="key">Shift</span> 下降/加速</div>
              <div class="guide-item"><span class="key">鼠标</span> 转视角</div>
            </div>
          </div>
          <div class="guide-section">
            <h4>建造操作</h4>
            <div class="guide-list">
              <div class="guide-item"><span class="key">左键</span> 破坏方块</div>
              <div class="guide-item"><span class="key">右键</span> 放置方块</div>
              <div class="guide-item"><span class="key">1-9</span> 选择快捷栏</div>
              <div class="guide-item"><span class="key">E</span> 进食(生存)</div>
            </div>
          </div>
          <div class="guide-section">
            <h4>其他操作</h4>
            <div class="guide-list">
              <div class="guide-item"><span class="key">G</span> 切换模式</div>
              <div class="guide-item"><span class="key">C</span> 合成界面</div>
              <div class="guide-item"><span class="key">F</span> 开始战役守夜</div>
              <div class="guide-item"><span class="key">R</span> 重生</div>
            </div>
          </div>
        </div>
      </div>
      <div class="start-footer">
        <button class="btn-start" id="btn-start-game">开始游戏</button>
      </div>
    </div>
  `;
  container.appendChild(startMenu);

  // State
  let selectedMode: GameMode = 'campaign';
  let selectedStartLevel = readSavedLevelProgress();
  let useSurvivalStarterKit = false;
  const menu = startMenu!;
  void renderSaveSlots();
  const levelSelect = menu.querySelector('#level-select') as HTMLSelectElement;
  if (levelSelect) {
    levelSelect.value = String(selectedStartLevel);
  }

  // Tab switching
  menu.querySelectorAll('.start-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      menu.querySelectorAll('.start-tab').forEach(t => t.classList.remove('active'));
      menu.querySelectorAll('.start-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panelName = (tab as HTMLElement).dataset.tab;
      menu.querySelector(`.start-panel[data-panel="${panelName}"]`)?.classList.add('active');
    });
  });

  // Mode card selection
  menu.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      menu.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedMode = ((card as HTMLElement).dataset.mode || 'campaign') as GameMode;
    });
  });

  const resetButton = menu.querySelector('#campaign-reset') as HTMLButtonElement | null;
  if (resetButton) {
    let resetArmed = false;
    let resetTimer = 0;
    resetButton.addEventListener('click', event => {
      event.stopPropagation();
      if (!resetArmed) {
        resetArmed = true;
        resetButton.textContent = '再次点击确认';
        window.clearTimeout(resetTimer);
        resetTimer = window.setTimeout(() => {
          resetArmed = false;
          resetButton.textContent = '重新开始';
        }, 2500);
        return;
      }
      campaignSaveStore.clear();
      window.location.reload();
    });
  }

  // Level selection dropdown (for challenge mode)
  if (levelSelect) {
    levelSelect.addEventListener('change', () => {
      selectedStartLevel = parseInt(levelSelect.value);
    });
  }
  const survivalStarterKitInput = menu.querySelector('#survival-starter-kit') as HTMLInputElement | null;
  survivalStarterKitInput?.addEventListener('click', (event) => {
    event.stopPropagation();
  });
  survivalStarterKitInput?.addEventListener('change', () => {
    useSurvivalStarterKit = survivalStarterKitInput.checked;
  });

  function startGameFromMenu(lockPointer: boolean) {
    menu.remove();
    startMenuVisible = false;
    startMenu = null;
    updatePointerLockHint();

    activateMode(selectedMode, selectedStartLevel, useSurvivalStarterKit);
    if (lockPointer) {
      void document.body.requestPointerLock().catch(() => {
        // Browser automation and some documents can reject pointer lock.
      });
    }
  }

  // Start button
  menu.querySelector('#btn-start-game')!.addEventListener('click', () => {
    startGameFromMenu(true);
  });

  // Settings: save to localStorage
  const sensInput = menu.querySelector('#sensitivity') as HTMLInputElement;
  const savedSens = localStorage.getItem('voxelverse-sensitivity');
  if (savedSens) sensInput.value = savedSens;
  sensInput.addEventListener('change', () => {
    localStorage.setItem('voxelverse-sensitivity', sensInput.value);
  });
  const soundInput = menu.querySelector('#sound-enabled') as HTMLInputElement;
  const volumeInput = menu.querySelector('#volume') as HTMLInputElement;
  soundInput.checked = localStorage.getItem(SOUND_ENABLED_KEY) !== '0';
  volumeInput.value = localStorage.getItem(VOLUME_KEY) ?? '80';
  applySoundSettings(soundInput.checked, Number(volumeInput.value));
  soundInput.addEventListener('change', () => {
    applySoundSettings(soundInput.checked, Number(volumeInput.value));
  });
  volumeInput.addEventListener('input', () => {
    applySoundSettings(soundInput.checked, Number(volumeInput.value));
  });

  async function renderSaveSlots() {
    const list = menu.querySelector('#save-slot-list') as HTMLElement | null;
    if (!list) return;
    list.innerHTML = '<div class="save-slot-muted">读取存档中...</div>';
    const summaries = await saveStore.list();
    const summaryBySlot = new Map(summaries.map((summary) => [summary.slotId, summary]));
    list.innerHTML = '';

    for (let i = 1; i <= 3; i++) {
      const slotId = `slot-${i}`;
      const summary = summaryBySlot.get(slotId);
      const row = document.createElement('div');
      row.className = 'save-slot-row';
      const updatedText = summary
        ? new Date(summary.updatedAt).toLocaleString()
        : '空槽位';
      row.innerHTML = `
        <div class="save-slot-meta">
          <strong>槽位 ${i}</strong>
          <span>${summary ? summary.name : '未保存世界'}</span>
          <small>${updatedText}</small>
        </div>
        <div class="save-slot-actions">
          <button data-action="save" data-slot="${slotId}">保存</button>
          <button data-action="load" data-slot="${slotId}" ${summary ? '' : 'disabled'}>继续</button>
          <button data-action="delete" data-slot="${slotId}" ${summary ? '' : 'disabled'}>删除</button>
        </div>
      `;
      list.appendChild(row);
    }

    list.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', async () => {
        const target = button as HTMLButtonElement;
        const slotId = target.dataset.slot!;
        const action = target.dataset.action;
        if (action === 'save') {
          await saveCurrentWorld(slotId);
          showToast('已保存世界');
          await renderSaveSlots();
        } else if (action === 'load') {
          const save = await saveStore.load(slotId);
          if (save) {
            loadWorldSave(save);
            menu.remove();
            startMenuVisible = false;
            startMenu = null;
            updatePointerLockHint();
            document.body.requestPointerLock();
            showToast('已载入世界');
          }
        } else if (action === 'delete') {
          await saveStore.delete(slotId);
          showToast('已删除存档');
          await renderSaveSlots();
        }
      });
    });
  }
}

let campaignStarted = false;

function activateMode(mode: GameMode, selectedStartLevel = 0, survivalStarterKit = false) {
  if (activeMode === 'campaign' && campaignStarted) {
    campaignRuntime.setActive(false);
    saveCampaign();
  } else {
    campaignRuntime.setActive(false);
  }

  activeMode = mode;
  isDead = false;
  deathScreen.style.display = 'none';
  playerStats.reset();
  player.isFlying = false;

  if (mode === 'campaign') {
    player.survivalMode = true;
    levelManager.skip();
    dayNight.setDay();

    const saved = campaignSaveStore.load();
    if (saved) {
      campaignManager.restore(saved.campaign);
      campaignRuntime.restorePendingRewards(saved.pendingRewards);
      const affected = chunkManager.importMutations(saved.mutations);
      for (const { cx, cz } of affected) {
        const chunk = chunkManager.getChunk(cx, cz);
        if (chunk) vr.rebuildChunkMesh(chunk);
      }
      player.inventory.restore(saved.inventory);
      spawnPoint = { ...saved.spawn };
      player.respawn(saved.player.x, saved.player.y, saved.player.z);
    } else {
      campaignRuntime.restorePendingRewards([]);
      giveCampaignStarterKit();
      spawnPoint = {
        x: initialSceneLayout.spawn.x,
        y: 10,
        z: initialSceneLayout.spawn.z,
      };
      player.respawn(spawnPoint.x, spawnPoint.y, spawnPoint.z);
    }

    campaignRuntime.setActive(true);
    campaignStarted = true;
    saveCampaign();
  } else if (mode === 'challenge') {
    player.survivalMode = false;
    dayNight.setDay();
    levelManager.currentLevel = selectedStartLevel;
    levelManager.skipped = false;
    persistLevelProgress();
  } else if (mode === 'creative') {
    player.survivalMode = false;
    dayNight.setDay();
    levelManager.skip();
  } else {
    player.survivalMode = true;
    dayNight.resume();
    levelManager.skip();
    clearInventory();
    if (survivalStarterKit) {
      giveStarterKit();
    }
  }

  setupCreativeUI();
  updateLevelUI();
  updateHotbarUI();
  campaignHud.render(campaignRuntime.getViewModel());
}

// Show start menu on init
showStartMenu();

// H key to reopen start menu
document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyH' && !startMenuVisible && !isDead) {
    showStartMenu();
  }
});

function collectFurnaceStates(): FurnaceSaveState[] {
  return Array.from(furnaceStates.entries(), ([key, state]) => ({
    key,
    state: state.snapshot(),
  }));
}

async function saveCurrentWorld(slotId = 'slot-1') {
  const existing = await saveStore.load(slotId);
  const now = new Date().toISOString();
  const view = player.getViewState();
  const save: WorldSave = {
    version: WORLD_SAVE_VERSION,
    slotId,
    name: existing?.name ?? `World ${slotId.replace('slot-', '')}`,
    seed: WORLD_SEED,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    playTime: playTimeSeconds,
    player: {
      position: { x: player.position.x, y: player.position.y, z: player.position.z },
      velocity: { x: player.velocity.x, y: player.velocity.y, z: player.velocity.z },
      yaw: view.yaw,
      pitch: view.pitch,
      survivalMode: player.survivalMode,
      isFlying: player.isFlying,
      selectedSlot: player.inventory.selectedSlot,
      inventory: player.inventory.slots.map((slot) => ({ ...slot })),
      health: playerStats.health,
      hunger: playerStats.hunger,
      spawnPoint: { ...spawnPoint },
      toolDurability: player.getToolDurabilitySnapshot(),
    },
    time: {
      timeOfDay: dayNight.timeOfDay,
      dayCount: dayNight.dayCount,
      paused: dayNight.isPaused,
    },
    level: {
      currentLevel: levelManager.currentLevel,
      skipped: levelManager.skipped,
    },
    blocks: chunkManager.getBlockDeltas(),
    redstone: redstoneEngine.snapshot(),
    furnaces: collectFurnaceStates(),
  };
  await saveStore.save(save);
}

function loadWorldSave(save: WorldSave) {
  if (save.version !== WORLD_SAVE_VERSION) {
    showToast('存档版本不兼容');
    return;
  }

  if (activeMode === 'campaign' && campaignStarted) {
    saveCampaign();
  }
  campaignRuntime.setActive(false);
  activeMode = save.player.survivalMode
    ? 'survival'
    : save.level.skipped
      ? 'creative'
      : 'challenge';

  chunkManager.applyBlockDeltas(save.blocks);
  chunkManager.rebuildLoadedChunks((chunk) => vr.rebuildChunkMesh(chunk));

  redstoneEngine.restore(save.redstone);
  furnaceStates.clear();
  for (const entry of save.furnaces) {
    furnaceStates.set(entry.key, new FurnaceState(entry.state));
  }

  player.position.x = save.player.position.x;
  player.position.y = save.player.position.y;
  player.position.z = save.player.position.z;
  player.velocity.x = save.player.velocity.x;
  player.velocity.y = save.player.velocity.y;
  player.velocity.z = save.player.velocity.z;
  player.survivalMode = save.player.survivalMode;
  player.isFlying = save.player.isFlying;
  player.setViewState(save.player.yaw, save.player.pitch);
  player.inventory.slots = save.player.inventory.map((slot) => ({ ...slot }));
  player.inventory.setSelectedSlot(save.player.selectedSlot);
  player.restoreToolDurability(save.player.toolDurability);

  playerStats.health = save.player.health;
  playerStats.hunger = save.player.hunger;
  playerStats.isDead = save.player.health <= 0;
  isDead = playerStats.isDead;
  deathScreen.style.display = isDead ? 'flex' : 'none';

  spawnPoint = { ...save.player.spawnPoint };
  dayNight.restore(save.time.timeOfDay, save.time.dayCount, save.time.paused);
  levelManager.currentLevel = save.level.currentLevel;
  levelManager.skipped = save.level.skipped;
  persistLevelProgress();
  playTimeSeconds = save.playTime;

  setupCreativeUI();
  updateHotbarUI();
  updateLevelUI();
}

// Creative mode UI setup
function setupCreativeUI() {
  const survivalUi = activeMode === 'campaign' || activeMode === 'survival';
  const creativeUi = activeMode === 'challenge' || activeMode === 'creative';
  const statsBars = document.querySelector('.stats-bars') as HTMLElement;
  if (statsBars) {
    statsBars.style.display = survivalUi ? 'flex' : 'none';
  }
  if (creativePanel) {
    creativePanel.style.display = creativeUi && creativePanelVisible ? 'block' : 'none';
  }
  if (arithmeticPanel) {
    arithmeticPanel.style.display = creativeUi && arithmeticVisible ? 'block' : 'none';
  }
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.style.display = 'block';
  }
  const firstStep = document.getElementById('first-step');
  if (firstStep) {
    if (activeMode === 'campaign') {
      firstStep.innerHTML = '<p>基地战役：先按左上目标建造，准备完成后按 F 开始守夜</p>';
    } else if (activeMode === 'survival') {
      firstStep.innerHTML = '<p>生存模式：砍树→拾取→按 C 合成工具</p>';
    } else {
      firstStep.innerHTML = '<p>点击下方标签选方块 → 点快捷栏格子切换 → 右键放置</p>';
    }
  }
  gamemodeLabel.textContent = {
    campaign: '基地战役',
    challenge: '闯关建造',
    creative: '自由建造',
    survival: '自由生存',
  }[activeMode];
  const instructions = document.getElementById('instructions');
  if (instructions) {
    instructions.textContent = activeMode === 'campaign'
      ? 'WASD 移动 | 左键攻击/破坏 | 右键放置 | C 合成 | F 开始守夜 | H 菜单'
      : 'WASD 移动 | 空格跳跃/双击飞行 | 左键破坏 | 右键放置 | G 切换自由模式 | H 菜单';
  }
}

// Level system
const levelManager = new LevelManager();
const levelHud = document.getElementById('level-hud') as HTMLElement;
const levelTitle = document.getElementById('level-title') as HTMLElement;
const levelProgress = document.getElementById('level-progress') as HTMLElement;
const levelHint = document.getElementById('level-hint') as HTMLElement;
const levelPreview = document.getElementById('level-preview') as HTMLElement;
const levelProgressBars = document.getElementById('level-progress-bars') as HTMLElement;
const levelCompletePopup = document.getElementById('level-complete-popup') as HTMLElement;
const levelCompleteText = document.getElementById('level-complete-text') as HTMLElement;
const levelNextBtn = document.getElementById('level-next-btn') as HTMLElement;

function renderLevelPreview() {
  const targetBlocks = levelManager.current?.targetBlocks ?? [];
  if (targetBlocks.length === 0) {
    levelPreview.innerHTML = '';
    levelPreview.style.display = 'none';
    levelPreview.style.width = '';
    levelPreview.style.height = '';
    return;
  }

  const layout = getLevelPreviewLayout(targetBlocks);
  const polygons = [
    ...layout.ground,
    ...layout.leftFaces,
    ...layout.rightFaces,
    ...layout.topFaces,
  ]
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((face) => `<polygon points="${face.points}" fill="${face.fill}" stroke="${face.stroke}" stroke-width="1" />`)
    .join('');
  levelPreview.innerHTML = `<svg class="level-preview-svg" viewBox="0 0 ${layout.width} ${layout.height}" width="${layout.width}" height="${layout.height}" aria-hidden="true">${polygons}</svg>`;
  levelPreview.style.width = `${layout.width}px`;
  levelPreview.style.height = `${layout.height}px`;
  levelPreview.style.display = 'block';
}

function updateLevelUI() {
  const level = levelManager.current;
  if (activeMode !== 'challenge' || !level || levelManager.isComplete()) {
    levelHud.style.display = 'none';
    levelHint.style.display = 'none';
    levelProgressBars.style.display = 'none';
    levelProgressBars.innerHTML = '';
    levelPreview.innerHTML = '';
    return;
  }
  levelTitle.textContent = level.title;
  levelProgress.textContent = levelManager.progress;
  levelHint.textContent = level.hint;
  renderLevelPreview();
  levelHud.style.display = 'flex';
  levelHint.style.display = 'block';
}

function showLevelComplete() {
  const level = LEVELS[levelManager.currentLevel];
  levelCompleteText.textContent = `你完成了「${level.title}」！`;
  levelCompletePopup.style.display = 'flex';
  document.exitPointerLock();
  updatePointerLockHint();
}

levelNextBtn.addEventListener('click', () => {
  levelManager.nextLevel();
  persistLevelProgress();
  levelCompletePopup.style.display = 'none';
  updateLevelUI();
  document.body.requestPointerLock();
});

updateLevelUI();

const timeDisplay = ui.querySelector('.time-display') as HTMLElement;
const healthFill = ui.querySelector('.health-fill') as HTMLElement;
const hungerFill = ui.querySelector('.hunger-fill') as HTMLElement;
const gamemodeLabel = ui.querySelector('.gamemode-label') as HTMLElement;
const deathScreen = ui.querySelector('.death-screen') as HTMLElement;
const hotbarEl = ui.querySelector('#hotbar') as HTMLElement;
const creativePanel = ui.querySelector('.creative-panel') as HTMLElement;
const creativeGrid = ui.querySelector('.creative-grid') as HTMLElement;
const arithmeticToggle = ui.querySelector('#arithmetic-toggle') as HTMLButtonElement;
const arithmeticPanel = ui.querySelector('#arithmetic-panel') as HTMLElement;
const arithmeticInputA = ui.querySelector('#arithmetic-input-a') as HTMLInputElement;
const arithmeticInputB = ui.querySelector('#arithmetic-input-b') as HTMLInputElement;
const arithmeticLanes = ui.querySelector('#arithmetic-lanes') as HTMLElement;
const arithmeticStatus = ui.querySelector('#arithmetic-status') as HTMLElement;
const arithmeticStepNote = ui.querySelector('#arithmetic-step-note') as HTMLElement;
const arithmeticStepCount = ui.querySelector('#arithmetic-step-count') as HTMLElement;

let isDead = false;
let creativeTab: BlockCategory = 'natural';
let creativePanelVisible = false;
let arithmeticVisible = false;
let arithmeticOperation: ArithmeticOperation = 'add';
let arithmeticTrace: ArithmeticTrace = traceArithmetic(arithmeticOperation, 200, 12);
let arithmeticStepIndex = 0;

// Settings button toggle — bind directly to avoid global click conflicts
function bindSettingsButton() {
  const btn = document.getElementById('settings-btn');
  if (!btn) return;
  btn.addEventListener('keydown', (e) => {
    if (shouldIgnoreSettingsButtonKeyboardActivation(e.code)) {
      e.preventDefault();
    }
  });
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    creativePanelVisible = !creativePanelVisible;
    if (creativePanel) {
      creativePanel.style.display = creativePanelVisible ? 'block' : 'none';
    }
    btn.blur();
  });
}
bindSettingsButton();

function saveHotbar() {
  const data = player.inventory.slots.map(s => ({ blockId: s.blockId }));
  localStorage.setItem('voxelverse-hotbar', JSON.stringify(data));
}

setupCreativeUI();

function updateHotbarUI() {
  const slots = hotbarEl.querySelectorAll('.slot');
  slots.forEach((s, i) => {
    const slot = player.inventory.slots[i];
    const colorEl = s.querySelector('.slot-color') as HTMLElement;
    const nameEl = s.querySelector('.slot-name') as HTMLElement;
    const countEl = s.querySelector('.slot-count') as HTMLElement;
    if (slot.blockId !== 0) {
      const def = BlockRegistry.getById(slot.blockId);
      colorEl.style.background = '#' + def.color.toString(16).padStart(6, '0');
      nameEl.textContent = def.name;
      if (!countEl) {
        const c = document.createElement('span');
        c.className = 'slot-count';
        s.appendChild(c);
      }
      const c = s.querySelector('.slot-count') as HTMLElement;
      c.textContent = slot.count > 1 ? String(slot.count) : '';
      c.style.display = slot.count > 1 ? 'block' : 'none';
    } else {
      colorEl.style.background = 'transparent';
      nameEl.textContent = '';
      const c = s.querySelector('.slot-count');
      if (c) c.remove();
    }
    s.classList.toggle('active', i === player.inventory.selectedSlot);
  });
}

function renderCreativeGrid() {
  creativeGrid.innerHTML = '';
  const blocks = BlockRegistry.getByCategory(creativeTab);
  for (const def of blocks) {
    if (def.id === 0) continue;
    const cell = document.createElement('div');
    cell.className = 'creative-cell';
    cell.style.background = '#' + def.color.toString(16).padStart(6, '0');
    cell.title = def.name;
    cell.addEventListener('click', () => {
      // If this block is already in the hotbar, switch to that slot
      const existingSlot = player.inventory.slots.findIndex(s => s.blockId === def.id);
      if (existingSlot >= 0) {
        player.inventory.setSelectedSlot(existingSlot);
        updateHotbarUI();
      } else {
        // Always replace the currently selected slot
        player.inventory.slots[player.inventory.selectedSlot] = { blockId: def.id, count: 1 };
        updateHotbarUI();
      }
      saveHotbar();
      const firstStep = document.getElementById('first-step');
      if (firstStep) firstStep.style.display = 'none';
    });
    creativeGrid.appendChild(cell);
  }
}

function renderBitLane(label: string, value: number, activeMask = 0): string {
  const bits = toBinary8(value);
  const cells = bits
    .split('')
    .map((bit, index) => {
      const bitIndex = 7 - index;
      const active = ((activeMask >> bitIndex) & 1) === 1 ? ' active' : '';
      return `<span class="bit-cell${active}">${bit}</span>`;
    })
    .join('');
  return `<div class="bit-lane"><span class="bit-label">${label}</span><div class="bit-cells">${cells}</div><span class="bit-value">${value & 0xff}</span></div>`;
}

function updateArithmeticTrace(resetStep = true) {
  arithmeticTrace = traceArithmetic(
    arithmeticOperation,
    Number(arithmeticInputA.value),
    Number(arithmeticInputB.value),
  );
  if (resetStep) {
    arithmeticStepIndex = 0;
  }
  arithmeticStepIndex = Math.min(arithmeticStepIndex, Math.max(0, arithmeticTrace.steps.length - 1));
  renderArithmeticPanel();
}

function renderArithmeticPanel() {
  const step = arithmeticTrace.steps[arithmeticStepIndex] ?? arithmeticTrace.steps[0];
  const activeMask = step?.label.match(/bit (\d+)/)?.[1];
  const activeBit = activeMask === undefined ? 0 : 1 << Number(activeMask);
  const partial = step?.partial ?? 0;

  arithmeticLanes.innerHTML = [
    renderBitLane('A', arithmeticTrace.a, activeBit),
    renderBitLane('B', arithmeticTrace.b, activeBit),
    renderBitLane('P', partial, activeBit),
    renderBitLane('R', step?.result ?? arithmeticTrace.result, activeBit),
  ].join('');

  const flags = [
    arithmeticTrace.overflow ? 'overflow' : '',
    arithmeticTrace.divideByZero ? 'divide-by-zero' : '',
  ].filter(Boolean);
  arithmeticStatus.textContent = `结果 ${arithmeticTrace.result} / ${toBinary8(arithmeticTrace.result)}${flags.length > 0 ? ` / ${flags.join(', ')}` : ''}`;
  arithmeticStepNote.textContent = step ? `${step.label}: ${step.note}` : '';
  arithmeticStepCount.textContent = `${arithmeticStepIndex + 1}/${arithmeticTrace.steps.length}`;

  ui.querySelectorAll('.arithmetic-op').forEach((button) => {
    button.classList.toggle('active', (button as HTMLElement).dataset.op === arithmeticOperation);
  });
}

function setArithmeticPanelVisible(visible: boolean) {
  arithmeticVisible = visible;
  arithmeticPanel.style.display = arithmeticVisible ? 'block' : 'none';
  arithmeticToggle.classList.toggle('active', arithmeticVisible);
  if (arithmeticVisible) {
    renderArithmeticPanel();
  }
}

function placeArithmeticComponents() {
  updateArithmeticTrace(false);
  const origin = {
    x: Math.floor(player.position.x) + 3,
    y: Math.max(2, Math.floor(player.position.y) - 1),
    z: Math.floor(player.position.z) + 3,
  };
  const layout = buildArithmeticComponentLayout(arithmeticTrace, arithmeticOperation, origin);
  const touchedChunks = new Set<string>();

  for (const block of layout.blocks) {
    chunkManager.setBlock(block.x, block.y, block.z, block.blockId);
    chunkManager.markPlayerPlaced(block.x, block.y, block.z);
    touchedChunks.add(`${Math.floor(block.x / CHUNK_SIZE)},${Math.floor(block.z / CHUNK_SIZE)}`);
  }

  for (const key of touchedChunks) {
    const [cx, cz] = key.split(',').map(Number);
    const chunk = chunkManager.getChunk(cx, cz);
    if (chunk) {
      vr.rebuildChunkMesh(chunk);
    }
  }

  showToast(`已生成 8 位 ALU 组件：${arithmeticTrace.result} / ${toBinary8(arithmeticTrace.result)}`);
}

function setupArithmeticUI() {
  arithmeticToggle.addEventListener('click', () => {
    setArithmeticPanelVisible(!arithmeticVisible);
  });

  ui.querySelectorAll('.arithmetic-op').forEach((button) => {
    button.addEventListener('click', () => {
      arithmeticOperation = (button as HTMLElement).dataset.op as ArithmeticOperation;
      updateArithmeticTrace(true);
    });
  });

  [arithmeticInputA, arithmeticInputB].forEach((input) => {
    input.addEventListener('input', () => updateArithmeticTrace(true));
  });

  document.getElementById('arithmetic-prev')?.addEventListener('click', () => {
    arithmeticStepIndex = Math.max(0, arithmeticStepIndex - 1);
    renderArithmeticPanel();
  });
  document.getElementById('arithmetic-next')?.addEventListener('click', () => {
    arithmeticStepIndex = Math.min(arithmeticTrace.steps.length - 1, arithmeticStepIndex + 1);
    renderArithmeticPanel();
  });
  document.getElementById('arithmetic-reset')?.addEventListener('click', () => {
    arithmeticStepIndex = 0;
    renderArithmeticPanel();
  });
  document.getElementById('arithmetic-build')?.addEventListener('click', () => {
    placeArithmeticComponents();
  });

  updateArithmeticTrace(true);
}

// Creative tab switching
ui.querySelectorAll('.creative-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    ui.querySelectorAll('.creative-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    creativeTab = (tab as HTMLElement).dataset.cat as BlockCategory;
    renderCreativeGrid();
    // Hide first-step hint once user interacts
    const firstStep = document.getElementById('first-step');
    if (firstStep) firstStep.style.display = 'none';
  });
});

// Initial creative grid render
renderCreativeGrid();
setupArithmeticUI();

// Click hotbar slots to switch selection
hotbarEl.querySelectorAll('.slot').forEach(slotEl => {
  slotEl.addEventListener('click', () => {
    const idx = parseInt((slotEl as HTMLElement).dataset.idx!);
    player.inventory.setSelectedSlot(idx);
    updateHotbarUI();
  });
  // Right-click to clear slot
  slotEl.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const idx = parseInt((slotEl as HTMLElement).dataset.idx!);
    player.inventory.slots[idx] = { blockId: 0, count: 0 };
    updateHotbarUI();
    saveHotbar();
  });
});

// Update hotbar highlight + gamemode + respawn
document.addEventListener('keydown', (e) => {
  if (e.code.startsWith('Digit')) {
    let idx: number;
    if (e.code === 'Digit0') {
      idx = 9;
    } else {
      const n = parseInt(e.code[5]);
      if (n >= 1 && n <= 9) idx = n - 1;
      else return;
    }
    if (idx < 9) {
      player.inventory.setSelectedSlot(idx);
      updateHotbarUI();
    }
  }

  if (e.code === 'KeyG') {
    if (activeMode === 'creative') {
      activateMode('survival');
    } else if (activeMode === 'survival') {
      activateMode('creative');
    }
  }

  if (e.code === 'KeyF' && activeMode === 'campaign' && !isDead) {
    if (campaignRuntime.runReadyAction()) {
      campaignHud.render(campaignRuntime.getViewModel());
    }
  }

  if (e.code === 'KeyR' && isDead) {
    isDead = false;
    playerStats.reset();
    player.respawn(spawnPoint.x, spawnPoint.y, spawnPoint.z);
    deathScreen.style.display = 'none';
    if (document.pointerLockElement !== document.body) {
      document.body.requestPointerLock();
    }
  }

  // Eat food with E when in survival
  if (e.code === 'KeyE' && !isDead && player.survivalMode) {
    const slot = player.inventory.slots[player.inventory.selectedSlot];
    if (slot.blockId === 30) { // rotten flesh
      playerStats.eat(2);
      player.inventory.removeFromSlot(player.inventory.selectedSlot, 1);
      updateHotbarUI();
    } else if (slot.blockId === 31) { // raw beef
      playerStats.eat(5);
      player.inventory.removeFromSlot(player.inventory.selectedSlot, 1);
      updateHotbarUI();
    } else if (slot.blockId === BLOCK_COOKED_BEEF) {
      playerStats.eat(8);
      player.inventory.removeFromSlot(player.inventory.selectedSlot, 1);
      updateHotbarUI();
    }
  }

  // Toggle crafting UI with C
  if (e.code === 'KeyC' && !isDead) {
    toggleCraftingUI();
  }

  // Skip tutorial levels with L
  if (e.code === 'KeyL' && !isDead && activeMode === 'challenge') {
    levelManager.skip();
    updateLevelUI();
  }
});

// Crafting UI
let craftingOpen = false;
let craftingGridSize: 2 | 3 = 2;
const craftingGrid: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];

function toggleCraftingUI() {
  craftingOpen = !craftingOpen;
  const existing = document.querySelector('.crafting-overlay');
  if (existing) existing.remove();
  if (!craftingOpen) {
    document.body.requestPointerLock();
    return;
  }
  document.exitPointerLock();

  // Check if near crafting table for 3x3
  const px = Math.floor(player.position.x);
  const py = Math.floor(player.position.y);
  const pz = Math.floor(player.position.z);
  let nearTable = false;
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -1; dy <= 2; dy++) {
      for (let dz = -2; dz <= 2; dz++) {
        if (chunkManager.getBlock(px + dx, py + dy, pz + dz) === 23) { // crafting table
          nearTable = true;
          break;
        }
      }
      if (nearTable) break;
    }
    if (nearTable) break;
  }
  craftingGridSize = nearTable ? 3 : 2;

  const overlay = document.createElement('div');
  overlay.className = 'crafting-overlay';
  const gridCells = craftingGridSize === 3 ? 9 : 4;
  let gridHTML = '';
  for (let i = 0; i < gridCells; i++) {
    const id = craftingGrid[i];
    const def = id !== 0 ? BlockRegistry.getById(id) : null;
    gridHTML += `<div class="craft-slot" data-idx="${i}" style="background:${def ? '#' + def.color.toString(16).padStart(6, '0') : 'rgba(255,255,255,0.1)'}" title="${def?.name ?? ''}">${def ? '<span class="cs-name">' + def.name + '</span>' : ''}</div>`;
  }

  overlay.innerHTML = `
    <div class="crafting-panel">
      <h3>${nearTable ? '工作台 (3x3)' : '合成 (2x2)'}</h3>
      <div class="craft-grid" style="grid-template-columns: repeat(${craftingGridSize}, 1fr);">
        ${gridHTML}
      </div>
      <div class="craft-result">
        <div class="craft-result-slot" id="craft-result"></div>
        <button id="craft-btn">合成</button>
      </div>
      <p class="craft-hint" id="craft-feedback">点击快捷栏物品放入合成格 | ESC 关闭</p>
    </div>
  `;
  container.appendChild(overlay);

  // Click crafting slots to place selected hotbar item
  overlay.querySelectorAll('.craft-slot').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt((el as HTMLElement).dataset.idx!);
      const selectedSlot = player.inventory.slots[player.inventory.selectedSlot];
      if (selectedSlot.blockId !== 0) {
        craftingGrid[idx] = selectedSlot.blockId;
        updateCraftingPreview();
        renderCraftingGrid();
      }
    });
    // Right-click to clear
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const idx = parseInt((el as HTMLElement).dataset.idx!);
      craftingGrid[idx] = 0;
      updateCraftingPreview();
      renderCraftingGrid();
    });
  });

  document.getElementById('craft-btn')!.addEventListener('click', () => {
    const result = Crafting.match(craftingGrid.slice(0, gridCells), craftingGridSize);
    if (!result) {
      setCraftFeedback('没有匹配的配方');
      return;
    }

    const recipe = { gridSize: craftingGridSize, inputs: craftingGrid.slice(0, gridCells), output: result.output, count: result.count };
    if (!player.inventory.canCraft(recipe)) {
      setCraftFeedback('材料不足');
      return;
    }
    if (!player.inventory.canFit(result.output, result.count)) {
      setCraftFeedback('背包已满，无法接收产物');
      return;
    }

    if (player.inventory.craft(recipe)) {
      for (let i = 0; i < gridCells; i++) craftingGrid[i] = 0;
      setCraftFeedback('合成成功');
      updateCraftingPreview();
      renderCraftingGrid();
      updateHotbarUI();
    }
  });

  updateCraftingPreview();
}

function setCraftFeedback(message: string) {
  const feedback = document.getElementById('craft-feedback');
  if (feedback) {
    feedback.textContent = message;
  }
}

function renderCraftingGrid() {
  const overlay = document.querySelector('.crafting-overlay');
  if (!overlay) return;
  const gridCells = craftingGridSize === 3 ? 9 : 4;
  overlay.querySelectorAll('.craft-slot').forEach((el, i) => {
    if (i >= gridCells) return;
    const id = craftingGrid[i];
    const def = id !== 0 ? BlockRegistry.getById(id) : null;
    (el as HTMLElement).style.background = def ? '#' + def.color.toString(16).padStart(6, '0') : 'rgba(255,255,255,0.1)';
    el.innerHTML = def ? '<span class="cs-name">' + def.name + '</span>' : '';
    (el as HTMLElement).title = def?.name ?? '';
  });
}

function updateCraftingPreview() {
  const gridCells = craftingGridSize === 3 ? 9 : 4;
  const result = Crafting.match(craftingGrid.slice(0, gridCells), craftingGridSize);
  const resultSlot = document.getElementById('craft-result');
  if (!resultSlot) return;
  if (result) {
    const def = BlockRegistry.getById(result.output);
    resultSlot.style.background = '#' + def.color.toString(16).padStart(6, '0');
    resultSlot.innerHTML = `<span class="cs-name">${def.name}</span><span class="cs-count">${result.count}</span>`;
    resultSlot.style.opacity = '1';
  } else {
    resultSlot.style.background = 'rgba(255,255,255,0.1)';
    resultSlot.innerHTML = '';
    resultSlot.style.opacity = '0.5';
  }
}

// Close crafting on ESC
document.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && craftingOpen) {
    toggleCraftingUI();
  }
  if (e.code === 'Escape' && furnaceOpen) {
    closeFurnaceUI();
  }
});

// Furnace UI
let furnaceOpen = false;
let activeFurnaceKey: string | null = null;
const furnaceStates = new Map<string, FurnaceState>();
let furnaceTickAccum = 0;

function furnaceKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

function getFurnaceState(x: number, y: number, z: number): FurnaceState {
  const key = furnaceKey(x, y, z);
  let state = furnaceStates.get(key);
  if (!state) {
    state = new FurnaceState();
    furnaceStates.set(key, state);
  }
  return state;
}

function openFurnaceUI(x: number, y: number, z: number) {
  const existing = document.querySelector('.furnace-overlay');
  if (existing) existing.remove();
  getFurnaceState(x, y, z);
  furnaceOpen = true;
  activeFurnaceKey = furnaceKey(x, y, z);
  document.exitPointerLock();

  const overlay = document.createElement('div');
  overlay.className = 'furnace-overlay';
  overlay.innerHTML = `
    <div class="furnace-panel">
      <h3>熔炉</h3>
      <div class="furnace-grid">
        <div>
          <div class="furnace-label">输入</div>
          <div class="furnace-slot" id="furnace-input"></div>
        </div>
        <div class="furnace-status">
          <div id="furnace-progress">未加热</div>
          <div class="furnace-arrow">→</div>
          <div id="furnace-burn">燃料 0</div>
        </div>
        <div>
          <div class="furnace-label">输出</div>
          <div class="furnace-slot" id="furnace-output"></div>
        </div>
        <div>
          <div class="furnace-label">燃料</div>
          <div class="furnace-slot" id="furnace-fuel"></div>
        </div>
      </div>
      <p class="furnace-hint">选中快捷栏物品后点击输入/燃料槽放入 1 个；点击输出取回 | ESC 关闭</p>
    </div>
  `;
  container.appendChild(overlay);

  document.getElementById('furnace-input')!.addEventListener('click', () => placeSelectedInFurnaceSlot('input'));
  document.getElementById('furnace-fuel')!.addEventListener('click', () => placeSelectedInFurnaceSlot('fuel'));
  document.getElementById('furnace-output')!.addEventListener('click', takeFurnaceOutput);
  renderFurnaceUI();
}

function closeFurnaceUI() {
  document.querySelector('.furnace-overlay')?.remove();
  furnaceOpen = false;
  activeFurnaceKey = null;
  document.body.requestPointerLock();
}

function placeSelectedInFurnaceSlot(slotType: 'input' | 'fuel') {
  if (!activeFurnaceKey) return;
  const selected = player.inventory.slots[player.inventory.selectedSlot];
  if (selected.blockId === 0 || selected.count <= 0) return;

  const state = furnaceStates.get(activeFurnaceKey);
  if (!state) return;
  const snapshot = state.snapshot();

  if (slotType === 'input') {
    if (!FurnaceRegistry.getRecipe(selected.blockId)) {
      showToast('这个物品不能熔炼');
      return;
    }
    if (snapshot.inputId !== 0 && snapshot.inputId !== selected.blockId) return;
    state.setInput(selected.blockId, snapshot.inputCount + 1);
  } else {
    if (!FurnaceRegistry.getFuel(selected.blockId)) return;
    if (snapshot.fuelId !== 0 && snapshot.fuelId !== selected.blockId) return;
    state.setFuel(selected.blockId, snapshot.fuelCount + 1);
  }

  player.inventory.removeFromSlot(player.inventory.selectedSlot, 1);
  updateHotbarUI();
  renderFurnaceUI();
}

function takeFurnaceOutput() {
  if (!activeFurnaceKey) return;
  const state = furnaceStates.get(activeFurnaceKey);
  if (!state) return;
  const snapshot = state.snapshot();
  if (snapshot.outputId === 0 || snapshot.outputCount <= 0) return;
  if (!player.inventory.canFit(snapshot.outputId, snapshot.outputCount)) {
    showToast('背包已满，无法取出产物');
    return;
  }
  const output = state.takeOutput();
  if (!output) return;
  const overflow = player.inventory.addItem(output.itemId, output.count);
  if (overflow > 0) {
    const current = state.snapshot();
    state.setInput(current.inputId, current.inputCount);
    furnaceStates.set(activeFurnaceKey, new FurnaceState({ ...current, outputId: output.itemId, outputCount: overflow }));
  }
  updateHotbarUI();
  renderFurnaceUI();
}

function renderFurnaceUI() {
  if (!activeFurnaceKey) return;
  const state = furnaceStates.get(activeFurnaceKey);
  if (!state) return;
  const snapshot = state.snapshot();
  renderFurnaceSlot('furnace-input', snapshot.inputId, snapshot.inputCount);
  renderFurnaceSlot('furnace-fuel', snapshot.fuelId, snapshot.fuelCount);
  renderFurnaceSlot('furnace-output', snapshot.outputId, snapshot.outputCount);

  const recipe = FurnaceRegistry.getRecipe(snapshot.inputId);
  const progress = document.getElementById('furnace-progress');
  if (progress) {
    progress.textContent = recipe ? `进度 ${snapshot.cookTicks}/${recipe.cookTicks}` : '无可熔炼输入';
  }
  const burn = document.getElementById('furnace-burn');
  if (burn) burn.textContent = `燃料 ${snapshot.burnTicksRemaining}`;
}

function renderFurnaceSlot(id: string, itemId: number, count: number) {
  const el = document.getElementById(id);
  if (!el) return;
  const def = itemId !== 0 ? BlockRegistry.getById(itemId) : null;
  el.style.background = def ? '#' + def.color.toString(16).padStart(6, '0') : 'rgba(255,255,255,0.1)';
  el.innerHTML = def ? `<span class="cs-name">${def.name}</span><span class="cs-count">${count}</span>` : '';
  el.title = def?.name ?? '';
}

// Mobs
const zombies: Zombie[] = [];
const skeletons: Skeleton[] = [];
const creepers: Creeper[] = [];
const cows: Cow[] = [];
const campaignMobsById = new Map<string, Mob>();
const campaignIdsByMob = new WeakMap<Mob, string>();
const attackCooldown = new AttackCooldown();
let campaignMobSequence = 0;
let mobSpawnTimer = 0;
let animalSpawnTimer = 0;

function tryAttackMob(): boolean {
  if (!player.survivalMode) return false;

  const mobs: Mob[] = [...zombies, ...skeletons, ...creepers, ...cows];
  const targets = mobs.map((mob, index) => ({
    id: String(index),
    x: mob.position.x,
    y: mob.position.y + 0.9,
    z: mob.position.z,
    dead: mob.dead,
    mob,
  }));
  const direction = vr.camera.getWorldDirection(new THREE.Vector3());
  const target = selectAttackTarget(
    vr.camera.position,
    direction,
    targets,
  );
  if (!target) return false;
  if (!attackCooldown.tryUse(performance.now())) return true;

  const damage = getAttackDamage(player.inventory.getSelectedBlockId());
  const knockback = getKnockbackDirection(
    player.position.x,
    player.position.z,
    target.mob.position.x,
    target.mob.position.z,
  );
  target.mob.applyHit(damage, knockback.x, knockback.z);
  return true;
}

function registerCampaignMob(mob: Mob): string {
  const id = `campaign-mob-${++campaignMobSequence}`;
  campaignMobsById.set(id, mob);
  campaignIdsByMob.set(mob, id);
  return id;
}

function recordCampaignMobDeath(mob: Mob) {
  const id = campaignIdsByMob.get(mob);
  if (!id) return;
  campaignRuntime.recordEnemyDeath(id);
  campaignMobsById.delete(id);
  campaignIdsByMob.delete(mob);
}

function removeFromArray<T>(items: T[], item: T) {
  const index = items.indexOf(item);
  if (index >= 0) items.splice(index, 1);
}

function clearCampaignEnemies(ids: string[]) {
  for (const id of ids) {
    const mob = campaignMobsById.get(id);
    if (!mob) continue;
    campaignMobsById.delete(id);
    campaignIdsByMob.delete(mob);
    vr.scene.remove(mob.mesh);
    if (mob instanceof Zombie) removeFromArray(zombies, mob);
    if (mob instanceof Skeleton) {
      for (const arrow of mob.arrows) vr.scene.remove(arrow.mesh);
      removeFromArray(skeletons, mob);
    }
    if (mob instanceof Creeper) removeFromArray(creepers, mob);
    mob.dispose();
  }
}

function findGroundHeight(x: number, z: number): number {
  let y = 30;
  while (y > 0 && !chunkManager.isSolid(Math.floor(x), y - 1, Math.floor(z))) {
    y--;
  }
  return y;
}

function canSpawnMob(x: number, y: number, z: number): boolean {
  const light = chunkManager.getLightLevel(Math.floor(x), y, Math.floor(z), dayNight.isDay);
  return light < 7;
}

function spawnZombie(): Zombie | null {
  const angle = Math.random() * Math.PI * 2;
  const dist = 8 + Math.random() * 8;
  const x = player.position.x + Math.cos(angle) * dist;
  const z = player.position.z + Math.sin(angle) * dist;
  const y = findGroundHeight(x, z);
  if (!canSpawnMob(x, y, z)) return null;
  const zombie = new Zombie(x, y, z);
  zombies.push(zombie);
  vr.scene.add(zombie.mesh);
  return zombie;
}

function spawnSkeleton(): Skeleton | null {
  const angle = Math.random() * Math.PI * 2;
  const dist = 10 + Math.random() * 8;
  const x = player.position.x + Math.cos(angle) * dist;
  const z = player.position.z + Math.sin(angle) * dist;
  const y = findGroundHeight(x, z);
  if (!canSpawnMob(x, y, z)) return null;
  const skeleton = new Skeleton(x, y, z);
  skeletons.push(skeleton);
  vr.scene.add(skeleton.mesh);
  // Add arrow meshes to scene
  for (const arrow of skeleton.arrows) {
    vr.scene.add(arrow.mesh);
  }
  return skeleton;
}

function spawnCreeper(): Creeper | null {
  const angle = Math.random() * Math.PI * 2;
  const dist = 8 + Math.random() * 8;
  const x = player.position.x + Math.cos(angle) * dist;
  const z = player.position.z + Math.sin(angle) * dist;
  const y = findGroundHeight(x, z);
  if (!canSpawnMob(x, y, z)) return null;
  const creeper = new Creeper(x, y, z);
  creepers.push(creeper);
  vr.scene.add(creeper.mesh);
  return creeper;
}

function spawnCampaignEnemy(kind: CampaignEnemyKind): string | null {
  const mob =
    kind === 'zombie'
      ? spawnZombie()
      : kind === 'skeleton'
        ? spawnSkeleton()
        : spawnCreeper();
  return mob ? registerCampaignMob(mob) : null;
}

function spawnCow() {
  const angle = Math.random() * Math.PI * 2;
  const dist = 10 + Math.random() * 15;
  const x = player.position.x + Math.cos(angle) * dist;
  const z = player.position.z + Math.sin(angle) * dist;
  const y = findGroundHeight(x, z);
  // Only spawn on grass during day
  if (!dayNight.isDay) return;
  const groundBlock = chunkManager.getBlock(Math.floor(x), y - 1, Math.floor(z));
  if (groundBlock !== 1) return; // Must be grass
  const cow = new Cow(x, y, z);
  cows.push(cow);
  vr.scene.add(cow.mesh);
}

function explodeCreeper(creeper: Creeper, destroyTerrain = true) {
  // Damage player
  const dist = Math.sqrt(
    (creeper.position.x - player.position.x) ** 2 +
    (creeper.position.y - player.position.y) ** 2 +
    (creeper.position.z - player.position.z) ** 2
  );
  if (dist < 6) {
    const damage = Math.floor(20 * (1 - dist / 6));
    playerStats.damage(damage);
  }

  if (!destroyTerrain) return;

  // Destroy blocks in small radius
  const cx = Math.floor(creeper.position.x);
  const cy = Math.floor(creeper.position.y);
  const cz = Math.floor(creeper.position.z);
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dz = -2; dz <= 2; dz++) {
        if (dx * dx + dy * dy + dz * dz > 5) continue;
        const bx = cx + dx;
        const by = cy + dy;
        const bz = cz + dz;
        const blockId = chunkManager.getBlock(bx, by, bz);
        if (blockId !== 0 && blockId !== 9) { // Not air or bedrock
          chunkManager.setBlock(bx, by, bz, 0);
          // Rebuild chunk mesh
          const chx = Math.floor(bx / CHUNK_SIZE);
          const chz = Math.floor(bz / CHUNK_SIZE);
          const chunk = chunkManager.getChunk(chx, chz);
          if (chunk) {
            vr.rebuildChunkMesh(chunk);
          }
        }
      }
    }
  }
}

campaignRuntime = new CampaignRuntime(
  campaignManager,
  campaignWave,
  {
    evaluateObjective: () => {
      const objective = campaignManager.getCurrentObjective();
      if (!objective) {
        return {
          objectiveCurrent: 1,
          objectiveTarget: 1,
          requirementsMet: true,
        };
      }
      return evaluateCampaignObjective(
        objective,
        chunkManager,
        spawnPoint,
        campaignManager.getChapterStartRevision(),
      );
    },
    getPlacementRevision: () => chunkManager.getPlacementRevision(),
    addReward: reward => player.inventory.addItem(reward.blockId, reward.count),
    setDay: () => dayNight.setDay(),
    setNight: () => dayNight.setNight(),
    spawnEnemy: spawnCampaignEnemy,
    clearEnemies: clearCampaignEnemies,
    requestSave: saveCampaign,
  },
);
campaignHud.render(campaignRuntime.getViewModel());

function updateMobs(dt: number) {
  const totalMobs = zombies.length + skeletons.length + creepers.length;

  // Spawn mobs at night, max 8
  if (dayNight.isNight && totalMobs < 8 && activeMode === 'survival') {
    mobSpawnTimer += dt;
    if (mobSpawnTimer >= 3) {
      mobSpawnTimer -= 3;
      const roll = Math.random();
      if (roll < 0.45) {
        spawnZombie();
      } else if (roll < 0.75) {
        spawnSkeleton();
      } else {
        spawnCreeper();
      }
    }
  }

  // Update zombies
  for (let i = zombies.length - 1; i >= 0; i--) {
    const zombie = zombies[i];
    const attacked = zombie.tick(
      dt,
      (x, y, z) => chunkManager.isSolid(x, y, z),
      player.position,
      dayNight.isDay
    );

    if (attacked) {
      playerStats.damage(4);
    }

    if (zombie.dead) {
      recordCampaignMobDeath(zombie);
      vr.scene.remove(zombie.mesh);
      zombie.dispose();
      // Drop rotten flesh
      const drop = new DropEntity(
        zombie.position.x,
        zombie.position.y + 0.5,
        zombie.position.z,
        30 // BLOCK_ROTTEN_FLESH
      );
      vr.addDropEntity(drop);
      zombies.splice(i, 1);
    }
  }

  // Update skeletons
  for (let i = skeletons.length - 1; i >= 0; i--) {
    const skeleton = skeletons[i];
    skeleton.tick(
      dt,
      (x, y, z) => chunkManager.isSolid(x, y, z),
      player.position,
      dayNight.isDay
    );

    // Manage arrow meshes in scene
    for (const arrow of skeleton.arrows) {
      if (!arrow.dead && arrow.mesh.parent !== vr.scene) {
        vr.scene.add(arrow.mesh);
      }
    }

    // Check arrow hits on player
    for (let a = skeleton.arrows.length - 1; a >= 0; a--) {
      const arrow = skeleton.arrows[a];
      if (arrow.dead) {
        vr.scene.remove(arrow.mesh);
        skeleton.arrows.splice(a, 1);
        continue;
      }
      if (arrow.distanceTo(player.position) < 1.0) {
        playerStats.damage(3);
        arrow.dead = true;
        vr.scene.remove(arrow.mesh);
        skeleton.arrows.splice(a, 1);
      }
    }

    if (skeleton.dead) {
      recordCampaignMobDeath(skeleton);
      vr.scene.remove(skeleton.mesh);
      // Clean up remaining arrows
      for (const arrow of skeleton.arrows) {
        vr.scene.remove(arrow.mesh);
      }
      skeleton.dispose();
      skeletons.splice(i, 1);
    }
  }

  // Update creepers
  for (let i = creepers.length - 1; i >= 0; i--) {
    const creeper = creepers[i];
    creeper.tick(
      dt,
      (x, y, z) => chunkManager.isSolid(x, y, z),
      player.position
    );

    if (creeper.dead) {
      recordCampaignMobDeath(creeper);
      if (creeper.health > 0) {
        explodeCreeper(creeper, activeMode !== 'campaign');
      }
      vr.scene.remove(creeper.mesh);
      creeper.dispose();
      creepers.splice(i, 1);
    }
  }

  // Spawn animals during day
  if (dayNight.isDay && cows.length < 5 && activeMode === 'survival') {
    animalSpawnTimer += dt;
    if (animalSpawnTimer >= 5) {
      animalSpawnTimer -= 5;
      spawnCow();
    }
  }

  // Update cows
  for (let i = cows.length - 1; i >= 0; i--) {
    const cow = cows[i];
    cow.tick(
      dt,
      (x, y, z) => chunkManager.isSolid(x, y, z),
      player.position
    );

    if (cow.dead) {
      vr.scene.remove(cow.mesh);
      cow.dispose();
      // Drop raw beef
      const drop = new DropEntity(
        cow.position.x,
        cow.position.y + 0.5,
        cow.position.z,
        31 // BLOCK_RAW_BEEF
      );
      vr.addDropEntity(drop);
      cows.splice(i, 1);
    }
  }
}

function buildCampaignSave(): CampaignSaveData {
  return {
    version: 1,
    campaign: campaignManager.snapshot(),
    pendingRewards: campaignRuntime.getPendingRewards(),
    inventory: player.inventory.snapshot(),
    player: {
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
    },
    spawn: { ...spawnPoint },
    mutations: chunkManager.exportMutations(),
  };
}

function saveCampaign() {
  if (!campaignStarted || activeMode !== 'campaign') return;
  campaignSaveStore.save(buildCampaignSave());
}

function showCampaignMessage(text: string) {
  const message = document.createElement('div');
  message.className = 'campaign-result-message';
  message.textContent = text;
  ui.appendChild(message);
  window.setTimeout(() => message.classList.add('campaign-result-message--fade'), 900);
  window.setTimeout(() => message.remove(), 1700);
}

window.addEventListener('beforeunload', () => {
  saveCampaign();
});

// Redstone tick timer (20 tps)
let redstoneTickAccum = 0;
const REDSTONE_TICK_RATE = 1 / 20;

// Game loop
let lastTime = performance.now();

function loop() {
  requestAnimationFrame(loop);

  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  playTimeSeconds += dt;

  // Update day/night cycle (accelerated: 2 minutes per day)
  dayNight.update(dt * 10);
  vr.updateLighting(dayNight.sunAngle, dayNight.lightLevel, dayNight.skyColor);

  // Update time display
  const t = dayNight.timeOfDay / DAY_LENGTH;
  let timeLabel = '';
  if (t < 0.2) timeLabel = 'Night';
  else if (t < 0.3) timeLabel = 'Dawn';
  else if (t < 0.45) timeLabel = 'Morning';
  else if (t < 0.55) timeLabel = 'Noon';
  else if (t < 0.7) timeLabel = 'Afternoon';
  else if (t < 0.8) timeLabel = 'Dusk';
  else timeLabel = 'Night';
  timeDisplay.textContent = `Day ${dayNight.dayCount} - ${timeLabel}`;

  if (!isDead) {
    // Only apply survival mechanics in survival mode
    if (player.survivalMode) {
      playerStats.update(dt);

      // Apply fall damage
      if (player.pendingFallDamage > 0) {
        playerStats.damage(player.pendingFallDamage);
        player.pendingFallDamage = 0;
      }

      // Check death
      if (playerStats.isDead) {
        if (activeMode === 'campaign') {
          campaignRuntime.failDefense();
          playerStats.reset();
          player.pendingFallDamage = 0;
          player.respawn(spawnPoint.x, spawnPoint.y, spawnPoint.z);
          showCampaignMessage('本次守夜未成功，基地和物资都已保留');
          saveCampaign();
        } else {
          isDead = true;
          deathScreen.style.display = 'flex';
          document.exitPointerLock();
        }
      }
    }

    player.update(dt);

    if (activeMode === 'campaign') {
      campaignRuntime.tick(dt);
    }

    furnaceTickAccum += dt;
    while (furnaceTickAccum >= 1) {
      furnaceTickAccum -= 1;
      for (const state of furnaceStates.values()) {
        state.tick();
      }
      if (furnaceOpen) renderFurnaceUI();
    }

    // Check tutorial level completion (only in creative mode)
    if (activeMode === 'challenge' && !levelManager.isComplete() && levelCompletePopup.style.display === 'none') {
      const level = levelManager.current;
      if (level && level.getProgress) {
        const progress = level.getProgress(chunkManager, player.position);
        let html = '';
        for (const p of progress) {
          const pct = Math.min(100, (p.current / p.target) * 100);
          html += `<div class="lp-bar"><div class="lp-fill" style="width:${pct}%"></div><span class="lp-label">${p.label}: ${p.current}/${p.target}</span></div>`;
        }
        levelProgressBars.innerHTML = html;
        levelProgressBars.style.display = 'block';
      } else {
        levelProgressBars.style.display = 'none';
        levelProgressBars.innerHTML = '';
      }
      if (levelManager.check(chunkManager, player.position)) {
        showLevelComplete();
      }
    }
  }

  // Update mobs
  updateMobs(dt);

  // Redstone ticks (20 tps)
  redstoneTickAccum += dt;
  while (redstoneTickAccum >= REDSTONE_TICK_RATE) {
    redstoneTickAccum -= REDSTONE_TICK_RATE;
    redstoneEngine.tick();

    // Update lamp states
    for (const comp of redstoneEngine.getAllComponents()) {
      if (comp.type === 'lamp') {
        const lit = redstoneEngine.isLampLit(comp.x, comp.y, comp.z);
        const currentBlock = chunkManager.getBlock(comp.x, comp.y, comp.z);
        if (lit && currentBlock === BLOCK_REDSTONE_LAMP) {
          chunkManager.setBlock(comp.x, comp.y, comp.z, BLOCK_REDSTONE_LAMP_LIT);
          const cx = Math.floor(comp.x / CHUNK_SIZE);
          const cz = Math.floor(comp.z / CHUNK_SIZE);
          const chunk = chunkManager.getChunk(cx, cz);
          if (chunk) vr.rebuildChunkMesh(chunk);
        } else if (!lit && currentBlock === BLOCK_REDSTONE_LAMP_LIT) {
          chunkManager.setBlock(comp.x, comp.y, comp.z, BLOCK_REDSTONE_LAMP);
          const cx = Math.floor(comp.x / CHUNK_SIZE);
          const cz = Math.floor(comp.z / CHUNK_SIZE);
          const chunk = chunkManager.getChunk(cx, cz);
          if (chunk) vr.rebuildChunkMesh(chunk);
        }
      }
    }
  }

  // Update HUD
  healthFill.style.width = `${(playerStats.health / playerStats.maxHealth) * 100}%`;
  hungerFill.style.width = `${(playerStats.hunger / playerStats.maxHunger) * 100}%`;
  updateHotbarUI();
  campaignHud.render(campaignRuntime.getViewModel());

  // Dynamic chunk loading based on player position
  const chunkDelta = chunkManager.updatePlayerPosition(
    player.position.x,
    player.position.z,
    RENDER_DISTANCE,
    CHUNK_DATA_LOADS_PER_FRAME,
  );
  for (const { cx, cz } of chunkDelta.unloaded) {
    pendingChunkMeshes.delete(`${cx},${cz}`);
    vr.removeChunkMesh(cx, cz);
  }
  for (const chunk of chunkDelta.loaded) {
    queueChunkMesh(chunk);
  }
  processChunkMeshQueue();

  vr.render();
}

loop();

// Expose test API for e2e tests (dev only)
if (import.meta.env.DEV) {
  (window as any).__voxelverse_test = {
    player,
    chunkManager,
    levelManager,
    playerStats,
    dayNight,
    placeBlock: (x: number, y: number, z: number, blockId: number) => {
      chunkManager.setPlayerBlock(x, y, z, blockId);
      const cx = Math.floor(x / CHUNK_SIZE);
      const cz = Math.floor(z / CHUNK_SIZE);
      const chunk = chunkManager.getChunk(cx, cz);
      if (chunk) vr.rebuildChunkMesh(chunk);
    },
    breakBlock: (x: number, y: number, z: number) => {
      chunkManager.setPlayerBlock(x, y, z, 0);
      const cx = Math.floor(x / CHUNK_SIZE);
      const cz = Math.floor(z / CHUNK_SIZE);
      const chunk = chunkManager.getChunk(cx, cz);
      if (chunk) vr.rebuildChunkMesh(chunk);
    },
    toggleFlight: () => {
      player.isFlying = !player.isFlying;
    },
    setFlying: (v: boolean) => {
      player.isFlying = v;
    },
    setSurvivalMode: (v: boolean) => {
      player.survivalMode = v;
      activeMode = v ? 'survival' : 'creative';
      campaignRuntime.setActive(false);
      setupCreativeUI();
    },
    inventorySummary: () => player.inventory.slots.map((slot) => ({ ...slot })),
    startMode: (mode: 'challenge' | 'creative' | 'survival', starterKit = false) => {
      document.querySelector('.start-menu')?.remove();
      startMenuVisible = false;
      startMenu = null;
      activateMode(mode, 0, starterKit);
    },
    openCrafting: () => {
      if (!craftingOpen) toggleCraftingUI();
    },
    craftingFeedback: () => document.getElementById('craft-feedback')?.textContent ?? '',
    setPlayerPos: (x: number, y: number, z: number) => {
      player.position.x = x;
      player.position.y = y;
      player.position.z = z;
    },
    getLevelTitle: () => {
      const el = document.getElementById('level-title');
      return el?.textContent ?? '';
    },
    getLevelProgress: () => {
      const el = document.getElementById('level-progress');
      return el?.textContent ?? '';
    },
    isLevelCompleteVisible: () => {
      const el = document.getElementById('level-complete-popup');
      return el ? el.style.display !== 'none' : false;
    },
    clickNextLevel: () => {
      document.getElementById('level-next-btn')?.click();
    },
    skipWelcome: () => {
      localStorage.setItem('voxelverse-welcome', '1');
      document.querySelector('.welcome-modal')?.remove();
    },
    resetLevels: () => {
      activeMode = 'challenge';
      player.survivalMode = false;
      campaignRuntime.setActive(false);
      levelManager.currentLevel = 0;
      levelManager.skipped = false;
      persistLevelProgress();
      setupCreativeUI();
      updateLevelUI();
    },
    updateLevelUI: () => {
      updateLevelUI();
    },
    setArithmeticInputs: (a: number, b: number) => {
      arithmeticInputA.value = String(a);
      arithmeticInputB.value = String(b);
      updateArithmeticTrace(true);
    },
    setArithmeticOperation: (operation: ArithmeticOperation) => {
      arithmeticOperation = operation;
      updateArithmeticTrace(true);
    },
    setArithmeticStep: (index: number) => {
      arithmeticStepIndex = Math.max(0, Math.min(arithmeticTrace.steps.length - 1, Math.trunc(index)));
      renderArithmeticPanel();
    },
    buildArithmeticComponents: () => {
      placeArithmeticComponents();
    },
    getArithmeticTraceState: () => ({
      trace: arithmeticTrace,
      stepIndex: arithmeticStepIndex,
      status: arithmeticStatus.textContent ?? '',
      note: arithmeticStepNote.textContent ?? '',
      lanes: arithmeticLanes.textContent ?? '',
    }),
    getCampaignState: () => ({
      mode: activeMode,
      campaign: { ...campaignManager.getViewState() },
      hud: { ...campaignRuntime.getViewModel() },
      pendingRewards: campaignRuntime.getPendingRewards(),
      mutationCount: chunkManager.exportMutations().length,
    }),
    startCampaign: () => {
      startMenu?.remove();
      startMenu = null;
      startMenuVisible = false;
      activateMode('campaign');
    },
    runCampaignAction: () => campaignRuntime.runReadyAction(),
    tickCampaign: (seconds: number) => {
      campaignRuntime.tick(Math.max(0, seconds));
      campaignHud.render(campaignRuntime.getViewModel());
    },
    getCampaignMobIds: () => Array.from(campaignMobsById.keys()),
    recordCampaignKill: (id?: string) => {
      const targetId = id ?? campaignMobsById.keys().next().value;
      if (typeof targetId !== 'string') return false;
      campaignRuntime.recordEnemyDeath(targetId);
      clearCampaignEnemies([targetId]);
      return true;
    },
    failCampaignDefense: () => campaignRuntime.failDefense(),
    saveCampaign: () => saveCampaign(),
    clearCampaignSave: () => campaignSaveStore.clear(),
  };
}
