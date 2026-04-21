import { VoxelRenderer } from './rendering/VoxelRenderer';
import { ChunkManager } from './engine/ChunkManager';
import { PlayerController } from './player/PlayerController';
import { CHUNK_SIZE } from './engine/Chunk';
import { DayNightCycle, DAY_LENGTH } from './engine/DayNightCycle';
import { PlayerStats } from './player/PlayerStats';
import {
  BLOCK_BED, BLOCK_REDSTONE_DUST, BLOCK_REDSTONE_TORCH,
  BLOCK_REDSTONE_LAMP, BLOCK_REDSTONE_LAMP_LIT, BLOCK_LEVER,
  BLOCK_BUTTON, BLOCK_REDSTONE_BLOCK, BLOCK_REPEATER
} from './blocks/BlockRegistry';
import { RedstoneEngine } from './redstone/RedstoneEngine';
import { DropEntity } from './entities/DropEntity';
import { Zombie } from './entities/Zombie';
import { Skeleton } from './entities/Skeleton';
import { Creeper } from './entities/Creeper';
import { Cow } from './entities/Cow';
import './style.css';

const container = document.getElementById('app')!;

// Init renderer
const vr = new VoxelRenderer(container);

// Init world
const chunkManager = new ChunkManager(42);

// Redstone engine
const redstoneEngine = new RedstoneEngine();

// Day night cycle
const dayNight = new DayNightCycle();

// Initial chunk loading around origin
chunkManager.updatePlayerPosition(0, 0, 8);

// Create meshes for all loaded chunks
for (const chunk of chunkManager.getAllChunks()) {
  vr.addChunkMesh(chunk);
}

// Player
let spawnPoint = { x: 0, y: 20, z: 0 };

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
  },
  (blockId) => {
    // Pickup effects: food restores hunger
    if (blockId === 30) { // BLOCK_ROTTEN_FLESH
      playerStats.eat(2);
    }
    if (blockId === 31) { // BLOCK_RAW_BEEF
      playerStats.eat(5);
    }
  }
);

player.position.y = 20;

// Player stats
const playerStats = new PlayerStats();

// UI overlay
const ui = document.createElement('div');
ui.className = 'ui-overlay';
ui.innerHTML = `
  <div class="crosshair">+</div>
  <div class="hotbar">
    <div class="slot active" data-id="1">1 草</div>
    <div class="slot" data-id="2">2 土</div>
    <div class="slot" data-id="3">3 石</div>
    <div class="slot" data-id="4">4 木</div>
    <div class="slot" data-id="5">5 玻璃</div>
    <div class="slot" data-id="6">6 圆石</div>
    <div class="slot" data-id="7">7 沙</div>
    <div class="slot" data-id="8">8 砖</div>
    <div class="slot" data-id="9">9 树叶</div>
    <div class="slot" data-id="10">0 水</div>
    <div class="slot" data-id="29">B 床</div>
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
  <div class="instructions">
    <p>WASD 移动 | 空格跳跃/上升 | Shift 加速/下降 | 鼠标移动视角</p>
    <p>左键破坏 | 右键放置/交互 | 数字键 0-9 选择方块 | G 切换模式 | B 床</p>
    <p>E 进食 | N 红石粉 | M 火把 | T 灯 | Y 拉杆 | U 按钮 | I 红石块 | O 中继器</p>
    <p>Z 木镐 | X 石镐 | C 铁镐 | V 钻石镐</p>
    <p>点击屏幕锁定鼠标</p>
  </div>
`;
container.appendChild(ui);

const timeDisplay = ui.querySelector('.time-display') as HTMLElement;
const healthFill = ui.querySelector('.health-fill') as HTMLElement;
const hungerFill = ui.querySelector('.hunger-fill') as HTMLElement;
const gamemodeLabel = ui.querySelector('.gamemode-label') as HTMLElement;
const deathScreen = ui.querySelector('.death-screen') as HTMLElement;

let isDead = false;

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
    const slots = ui.querySelectorAll('.slot');
    slots.forEach((s, i) => s.classList.toggle('active', i === idx));
  }

  if (e.code === 'KeyG') {
    gamemodeLabel.textContent = player.survivalMode ? '生存模式' : '创造模式';
  }

  if (e.code === 'KeyB') {
    const slots = ui.querySelectorAll('.slot');
    slots.forEach((s, i) => s.classList.toggle('active', i === 10));
  }

  // Redstone block selections
  const rsKeys: Record<string, number> = {
    KeyN: 32, KeyM: 33, KeyT: 34, KeyY: 36, KeyU: 37, KeyI: 38, KeyO: 39,
  };
  if (rsKeys[e.code] !== undefined) {
    const slots = ui.querySelectorAll('.slot');
    slots.forEach((s) => s.classList.remove('active'));
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

  // Eat food with E when in survival (debug: always available)
  if (e.code === 'KeyE' && !isDead) {
    if (playerStats.hunger < playerStats.maxHunger) {
      playerStats.eat(4);
    }
  }
});

// Mobs
const zombies: Zombie[] = [];
const skeletons: Skeleton[] = [];
const creepers: Creeper[] = [];
const cows: Cow[] = [];
let mobSpawnTimer = 0;
let animalSpawnTimer = 0;

function findGroundHeight(x: number, z: number): number {
  let y = Math.floor(player.position.y) + 5;
  while (y > 0 && !chunkManager.isSolid(Math.floor(x), y - 1, Math.floor(z))) {
    y--;
  }
  return y;
}

function canSpawnMob(x: number, y: number, z: number): boolean {
  const light = chunkManager.getLightLevel(Math.floor(x), y, Math.floor(z), dayNight.isDay);
  return light < 7;
}

function spawnZombie() {
  const angle = Math.random() * Math.PI * 2;
  const dist = 8 + Math.random() * 8;
  const x = player.position.x + Math.cos(angle) * dist;
  const z = player.position.z + Math.sin(angle) * dist;
  const y = findGroundHeight(x, z);
  if (!canSpawnMob(x, y, z)) return;
  const zombie = new Zombie(x, y, z);
  zombies.push(zombie);
  vr.scene.add(zombie.mesh);
}

function spawnSkeleton() {
  const angle = Math.random() * Math.PI * 2;
  const dist = 10 + Math.random() * 8;
  const x = player.position.x + Math.cos(angle) * dist;
  const z = player.position.z + Math.sin(angle) * dist;
  const y = findGroundHeight(x, z);
  if (!canSpawnMob(x, y, z)) return;
  const skeleton = new Skeleton(x, y, z);
  skeletons.push(skeleton);
  vr.scene.add(skeleton.mesh);
  // Add arrow meshes to scene
  for (const arrow of skeleton.arrows) {
    vr.scene.add(arrow.mesh);
  }
}

function spawnCreeper() {
  const angle = Math.random() * Math.PI * 2;
  const dist = 8 + Math.random() * 8;
  const x = player.position.x + Math.cos(angle) * dist;
  const z = player.position.z + Math.sin(angle) * dist;
  const y = findGroundHeight(x, z);
  if (!canSpawnMob(x, y, z)) return;
  const creeper = new Creeper(x, y, z);
  creepers.push(creeper);
  vr.scene.add(creeper.mesh);
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

function explodeCreeper(creeper: Creeper) {
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

function updateMobs(dt: number) {
  const totalMobs = zombies.length + skeletons.length + creepers.length;

  // Spawn mobs at night, max 8
  if (dayNight.isNight && totalMobs < 8 && player.survivalMode) {
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
      explodeCreeper(creeper);
      vr.scene.remove(creeper.mesh);
      creeper.dispose();
      creepers.splice(i, 1);
    }
  }

  // Spawn animals during day
  if (dayNight.isDay && cows.length < 5 && player.survivalMode) {
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
    playerStats.update(dt);

    // Apply fall damage
    if (player.pendingFallDamage > 0) {
      playerStats.damage(player.pendingFallDamage);
      player.pendingFallDamage = 0;
    }

    // Check death
    if (playerStats.isDead && !isDead) {
      isDead = true;
      deathScreen.style.display = 'flex';
      document.exitPointerLock();
    }

    player.update(dt);
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

  // Dynamic chunk loading based on player position
  const oldChunks = new Set(chunkManager.getAllChunks().map(c => `${c.cx},${c.cz}`));
  chunkManager.updatePlayerPosition(player.position.x, player.position.z, 8);
  const newChunks = chunkManager.getAllChunks();

  for (const chunk of newChunks) {
    const key = `${chunk.cx},${chunk.cz}`;
    if (!oldChunks.has(key)) {
      vr.addChunkMesh(chunk);
    }
  }

  // Remove distant meshes
  const currentKeys = new Set(newChunks.map(c => `${c.cx},${c.cz}`));
  for (const key of oldChunks) {
    if (!currentKeys.has(key)) {
      const [cx, cz] = key.split(',').map(Number);
      vr.removeChunkMesh(cx, cz);
    }
  }

  vr.render();
}

loop();
