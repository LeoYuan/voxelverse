import * as THREE from 'three';
import { ChunkManager } from '../engine/ChunkManager';
import { Vec3 } from '../utils/Vec3';
import { AABB } from '../utils/AABB';
import { BlockRegistry } from '../blocks/BlockRegistry';
import { DropEntity } from '../entities/DropEntity';
import { VoxelRenderer } from '../rendering/VoxelRenderer';

const PLAYER_HEIGHT = 1.8;
const PLAYER_WIDTH = 0.6;
const FLY_SPEED = 12.0;
const WALK_SPEED = 4.3;
const GRAVITY = 28.0;
const JUMP_FORCE = 9.0;

export class PlayerController {
  public position: Vec3;
  public velocity = new Vec3(0, 0, 0);
  public camera: THREE.Camera;

  private keys = new Set<string>();
  private moveForward = false;
  private moveBackward = false;
  private moveLeft = false;
  private moveRight = false;
  private moveUp = false;
  private moveDown = false;

  private yaw = 0;
  private pitch = 0;
  private isPointerLocked = false;

  public survivalMode = false;
  private onGround = false;
  private fallDistance = 0;
  public pendingFallDamage = 0;

  // Mining state
  private miningTarget: Vec3 | null = null;
  private miningProgress = 0;
  private isMining = false;

  private chunkManager: ChunkManager;
  private voxelRenderer: VoxelRenderer;
  private onBlockChange: (x: number, y: number, z: number) => void;
  private onInteract: ((x: number, y: number, z: number, blockId: number) => void) | null = null;
  private onPickupDrop: ((blockId: number) => void) | null = null;
  private selectedBlock = 1;
  private blockNameEl: HTMLElement;

  // Tool durability tracking
  private toolDurability = new Map<number, number>();
  private readonly maxDurability: Record<number, number> = {
    41: 60,   // wooden pickaxe
    42: 132,  // stone pickaxe
    43: 251,  // iron pickaxe
    44: 1562, // diamond pickaxe
  };

  constructor(
    camera: THREE.Camera,
    chunkManager: ChunkManager,
    voxelRenderer: VoxelRenderer,
    onBlockChange: (x: number, y: number, z: number) => void,
    onInteract?: (x: number, y: number, z: number, blockId: number) => void,
    onPickupDrop?: (blockId: number) => void
  ) {
    this.camera = camera;
    this.chunkManager = chunkManager;
    this.voxelRenderer = voxelRenderer;
    this.onBlockChange = onBlockChange;
    if (onInteract) this.onInteract = onInteract;
    if (onPickupDrop) this.onPickupDrop = onPickupDrop;
    this.position = new Vec3(0, 20, 0);

    // Block name tooltip
    this.blockNameEl = document.createElement('div');
    this.blockNameEl.className = 'block-name';
    document.body.appendChild(this.blockNameEl);

    this.setupInput();
  }

  private setupInput() {
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mousedown', (e) => this.onMouseDown(e));
    document.addEventListener('mouseup', (e) => this.onMouseUp(e));
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === document.body;
    });

    document.body.addEventListener('click', () => {
      if (!this.isPointerLocked) {
        document.body.requestPointerLock();
      }
    });
  }

  private onKeyDown(e: KeyboardEvent) {
    this.keys.add(e.code);
    switch (e.code) {
      case 'KeyW': this.moveForward = true; break;
      case 'KeyS': this.moveBackward = true; break;
      case 'KeyA': this.moveLeft = true; break;
      case 'KeyD': this.moveRight = true; break;
      case 'Space': this.moveUp = true; break;
      case 'ShiftLeft': this.moveDown = true; break;
      case 'Digit1': this.selectedBlock = 1; break;
      case 'Digit2': this.selectedBlock = 2; break;
      case 'Digit3': this.selectedBlock = 3; break;
      case 'Digit4': this.selectedBlock = 4; break;
      case 'Digit5': this.selectedBlock = 5; break;
      case 'Digit6': this.selectedBlock = 6; break;
      case 'Digit7': this.selectedBlock = 7; break;
      case 'Digit8': this.selectedBlock = 8; break;
      case 'Digit9': this.selectedBlock = 9; break;
      case 'Digit0': this.selectedBlock = 10; break;
      case 'KeyG': this.survivalMode = !this.survivalMode; break;
      case 'KeyB': this.selectedBlock = 29; break;
      case 'KeyN': this.selectedBlock = 32; break; // redstone dust
      case 'KeyM': this.selectedBlock = 33; break; // redstone torch
      case 'KeyT': this.selectedBlock = 34; break; // redstone lamp
      case 'KeyY': this.selectedBlock = 36; break; // lever
      case 'KeyU': this.selectedBlock = 37; break; // button
      case 'KeyI': this.selectedBlock = 38; break; // redstone block
      case 'KeyO': this.selectedBlock = 39; break; // repeater
      case 'KeyZ': this.selectedBlock = 41; break; // wooden pickaxe
      case 'KeyX': this.selectedBlock = 42; break; // stone pickaxe
      case 'KeyC': this.selectedBlock = 43; break; // iron pickaxe
      case 'KeyV': this.selectedBlock = 44; break; // diamond pickaxe
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.code);
    switch (e.code) {
      case 'KeyW': this.moveForward = false; break;
      case 'KeyS': this.moveBackward = false; break;
      case 'KeyA': this.moveLeft = false; break;
      case 'KeyD': this.moveRight = false; break;
      case 'Space': this.moveUp = false; break;
      case 'ShiftLeft': this.moveDown = false; break;
    }
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.isPointerLocked) return;
    const sensitivity = 0.002;
    this.yaw -= e.movementX * sensitivity;
    this.pitch -= e.movementY * sensitivity;
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
  }

  private onMouseDown(e: MouseEvent) {
    if (!this.isPointerLocked) return;
    if (e.button === 0) {
      this.isMining = true;
      if (this.survivalMode) {
        this.startMining();
      } else {
        this.breakBlock();
      }
    } else if (e.button === 2) {
      const hit = this.getRaycastResult();
      if (hit) {
        const blockId = this.chunkManager.getBlock(hit.pos.x, hit.pos.y, hit.pos.z);
        const def = BlockRegistry.getById(blockId);
        // Interact with functional blocks instead of placing
        if ((def.key === 'bed' || def.key === 'lever' || def.key === 'button') && this.onInteract) {
          this.onInteract(hit.pos.x, hit.pos.y, hit.pos.z, blockId);
          return;
        }
      }
      this.placeBlock();
    }
  }

  private onMouseUp(e: MouseEvent) {
    if (e.button === 0) {
      this.isMining = false;
      this.miningTarget = null;
      this.miningProgress = 0;
    }
  }

  private startMining() {
    const hit = this.getRaycastResult();
    if (hit) {
      const blockId = this.chunkManager.getBlock(hit.pos.x, hit.pos.y, hit.pos.z);
      const def = BlockRegistry.getById(blockId);
      // Instant break for very soft blocks
      if (def.hardness <= 0.5) {
        this.breakBlock();
        return;
      }
      this.miningTarget = hit.pos.clone();
      this.miningProgress = 0;
    }
  }

  private updateMining(dt: number) {
    if (!this.isMining || !this.miningTarget) return;

    // Check if still looking at same block
    const hit = this.getRaycastResult();
    if (!hit || !hit.pos.equals(this.miningTarget)) {
      this.miningTarget = null;
      this.miningProgress = 0;
      return;
    }

    const def = BlockRegistry.getById(this.chunkManager.getBlock(this.miningTarget.x, this.miningTarget.y, this.miningTarget.z));
    if (def.hardness <= 0) {
      this.miningTarget = null;
      this.miningProgress = 0;
      return;
    }

    const speedMult = this.getMiningSpeedMultiplier(def.key);
    this.miningProgress += (dt / def.hardness) * speedMult;

    if (this.miningProgress >= 1) {
      this.applyToolDurability();
      this.breakBlockAt(this.miningTarget.x, this.miningTarget.y, this.miningTarget.z);
      this.miningTarget = null;
      this.miningProgress = 0;
    }
  }

  private getMiningSpeedMultiplier(blockKey: string): number {
    const toolDef = BlockRegistry.getById(this.selectedBlock);
    if (toolDef.key.endsWith('_pickaxe')) {
      const pickaxeTargets = ['stone', 'cobblestone', 'coal_ore', 'iron_ore', 'gold_ore', 'diamond_ore', 'redstone_ore', 'furnace', 'crafting_table', 'chest'];
      if (pickaxeTargets.includes(blockKey)) {
        if (toolDef.key === 'wooden_pickaxe') return 2;
        if (toolDef.key === 'stone_pickaxe') return 4;
        if (toolDef.key === 'iron_pickaxe') return 6;
        if (toolDef.key === 'diamond_pickaxe') return 8;
      }
    }
    return 1;
  }

  private applyToolDurability() {
    const max = this.maxDurability[this.selectedBlock];
    if (!max) return;
    const current = this.toolDurability.get(this.selectedBlock) ?? max;
    const next = current - 1;
    if (next <= 0) {
      this.toolDurability.delete(this.selectedBlock);
      this.selectedBlock = 1;
      this.playSound('break');
    } else {
      this.toolDurability.set(this.selectedBlock, next);
    }
  }

  private breakBlockAt(x: number, y: number, z: number) {
    const blockId = this.chunkManager.getBlock(x, y, z);
    this.chunkManager.setBlock(x, y, z, 0);
    this.onBlockChange(x, y, z);
    this.playSound('break');

    if (blockId !== 0) {
      const def = BlockRegistry.getById(blockId);
      if (def.drops && def.drops.length > 0) {
        for (const dropConfig of def.drops) {
          const dropDef = BlockRegistry.getByKey(dropConfig.item);
          if (dropDef) {
            const drop = new DropEntity(
              x + 0.5,
              y + 0.5,
              z + 0.5,
              dropDef.id
            );
            this.voxelRenderer.addDropEntity(drop);
          }
        }
      } else {
        const drop = new DropEntity(
          x + 0.5,
          y + 0.5,
          z + 0.5,
          blockId
        );
        this.voxelRenderer.addDropEntity(drop);
      }
    }
  }

  private getRaycastResult(): { pos: Vec3; normal: Vec3 } | null {
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.camera.quaternion);

    const step = 0.1;
    const maxDist = 6;
    let px = this.position.x;
    let py = this.position.y + PLAYER_HEIGHT * 0.5;
    let pz = this.position.z;

    let prevX = Math.floor(px);
    let prevY = Math.floor(py);
    let prevZ = Math.floor(pz);

    for (let d = 0; d < maxDist; d += step) {
      px = this.position.x + direction.x * d;
      py = this.position.y + PLAYER_HEIGHT * 0.5 + direction.y * d;
      pz = this.position.z + direction.z * d;

      const bx = Math.floor(px);
      const by = Math.floor(py);
      const bz = Math.floor(pz);

      if (bx !== prevX || by !== prevY || bz !== prevZ) {
        if (this.chunkManager.isSolid(bx, by, bz)) {
          return {
            pos: new Vec3(bx, by, bz),
            normal: new Vec3(prevX - bx, prevY - by, prevZ - bz),
          };
        }
        prevX = bx;
        prevY = by;
        prevZ = bz;
      }
    }

    return null;
  }

  private breakBlock() {
    const hit = this.getRaycastResult();
    if (hit) {
      this.breakBlockAt(hit.pos.x, hit.pos.y, hit.pos.z);
    }
  }

  private placeBlock() {
    const hit = this.getRaycastResult();
    if (hit) {
      const nx = hit.pos.x + hit.normal.x;
      const ny = hit.pos.y + hit.normal.y;
      const nz = hit.pos.z + hit.normal.z;

      // Prevent placing non-placeable items (food, tools)
      const placeDef = BlockRegistry.getById(this.selectedBlock);
      if (!placeDef.solid && !this.isPlaceableItem(placeDef.key)) return;

      const playerAABB = this.getPlayerAABB();
      const blockAABB = AABB.fromBlock(nx, ny, nz);
      if (!playerAABB.intersects(blockAABB)) {
        this.chunkManager.setBlock(nx, ny, nz, this.selectedBlock);
        this.onBlockChange(nx, ny, nz);
        this.playSound('place');
      }
    }
  }

  private isPlaceableItem(key: string): boolean {
    return ['water', 'redstone_dust', 'redstone_torch', 'lever', 'button', 'repeater', 'glass', 'leaves', 'ladder', 'bed'].includes(key);
  }

  private playSound(type: 'break' | 'place') {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'break') {
        osc.frequency.setValueAtTime(200 + Math.random() * 100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      } else {
        osc.frequency.setValueAtTime(400 + Math.random() * 50, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.08);
      }
    } catch {
      // Audio not available
    }
  }

  private getPlayerAABB(): AABB {
    const hw = PLAYER_WIDTH / 2;
    return new AABB(
      this.position.x - hw,
      this.position.y,
      this.position.z - hw,
      this.position.x + hw,
      this.position.y + PLAYER_HEIGHT,
      this.position.z + hw
    );
  }

  update(dt: number) {
    if (this.survivalMode) {
      this.updateSurvival(dt);
      this.updateMining(dt);
    } else {
      this.updateCreative(dt);
    }

    // Update camera
    this.camera.position.set(this.position.x, this.position.y + PLAYER_HEIGHT * 0.8, this.position.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    // Update block name tooltip
    this.updateBlockName();

    // Update drop entities
    this.updateDrops(dt);
  }

  private updateCreative(dt: number) {
    const speed = this.keys.has('ShiftLeft') ? FLY_SPEED * 1.5 : FLY_SPEED;

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.camera.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(this.camera.quaternion);
    right.y = 0;
    right.normalize();

    let dx = 0;
    let dz = 0;
    let dy = 0;

    if (this.moveForward) { dx += forward.x; dz += forward.z; }
    if (this.moveBackward) { dx -= forward.x; dz -= forward.z; }
    if (this.moveRight) { dx += right.x; dz += right.z; }
    if (this.moveLeft) { dx -= right.x; dz -= right.z; }
    if (this.moveUp) dy += 1;
    if (this.moveDown) dy -= 1;

    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 0) {
      dx /= len;
      dz /= len;
    }

    const moveX = dx * speed * dt;
    const moveZ = dz * speed * dt;
    const moveY = dy * speed * dt;

    this.position.x += moveX;
    if (this.checkCollision()) this.position.x -= moveX;

    this.position.z += moveZ;
    if (this.checkCollision()) this.position.z -= moveZ;

    this.position.y += moveY;
    if (this.checkCollision()) this.position.y -= moveY;
  }

  private updateSurvival(dt: number) {
    const speed = this.keys.has('ShiftLeft') ? WALK_SPEED * 1.5 : WALK_SPEED;

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.camera.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(this.camera.quaternion);
    right.y = 0;
    right.normalize();

    let dx = 0;
    let dz = 0;

    if (this.moveForward) { dx += forward.x; dz += forward.z; }
    if (this.moveBackward) { dx -= forward.x; dz -= forward.z; }
    if (this.moveRight) { dx += right.x; dz += right.z; }
    if (this.moveLeft) { dx -= right.x; dz -= right.z; }

    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 0) {
      dx /= len;
      dz /= len;
    }

    // Apply horizontal movement
    const moveX = dx * speed * dt;
    const moveZ = dz * speed * dt;

    this.position.x += moveX;
    if (this.checkCollision()) this.position.x -= moveX;

    this.position.z += moveZ;
    if (this.checkCollision()) this.position.z -= moveZ;

    // Apply gravity
    this.velocity.y -= GRAVITY * dt;

    // Terminal velocity
    if (this.velocity.y < -50) this.velocity.y = -50;

    // Apply vertical velocity
    this.position.y += this.velocity.y * dt;

    // Ground collision
    this.onGround = false;
    if (this.checkCollision()) {
      if (this.velocity.y < 0) {
        // Landing
        this.onGround = true;
        this.applyFallDamage();
        this.fallDistance = 0;
      }
      this.position.y -= this.velocity.y * dt;
      this.velocity.y = 0;
    }

    // Track fall distance for damage calculation
    if (this.velocity.y < 0 && !this.onGround) {
      this.fallDistance += Math.abs(this.velocity.y) * dt;
    } else if (this.onGround) {
      this.fallDistance = 0;
    }

    // Jump
    if (this.moveUp && this.onGround) {
      this.velocity.y = JUMP_FORCE;
      this.onGround = false;
    }
  }

  private applyFallDamage() {
    if (this.fallDistance > 3) {
      this.pendingFallDamage = Math.floor(this.fallDistance - 3);
    }
  }

  respawn(x: number, y: number, z: number) {
    this.position.x = x;
    this.position.y = y;
    this.position.z = z;
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.velocity.z = 0;
    this.fallDistance = 0;
    this.pendingFallDamage = 0;
    this.onGround = false;
  }

  private updateBlockName() {
    const hit = this.getRaycastResult();
    if (hit) {
      const blockId = this.chunkManager.getBlock(hit.pos.x, hit.pos.y, hit.pos.z);
      const def = BlockRegistry.getById(blockId);
      this.blockNameEl.textContent = def.name;
      this.blockNameEl.style.opacity = '1';
    } else {
      this.blockNameEl.style.opacity = '0';
    }
  }

  private updateDrops(dt: number) {
    const drops = this.voxelRenderer.dropEntities;
    for (let i = drops.length - 1; i >= 0; i--) {
      const drop = drops[i];
      const alive = drop.update(dt, (x, y, z) => this.chunkManager.isSolid(x, y, z));
      if (!alive) {
        this.voxelRenderer.removeDropEntity(drop);
        continue;
      }
      if (drop.canPickup(this.position)) {
        this.voxelRenderer.removeDropEntity(drop);
        this.playSound('place'); // pickup sound
        if (this.onPickupDrop) {
          this.onPickupDrop(drop.blockId);
        }
      }
    }
  }

  private checkCollision(): boolean {
    const aabb = this.getPlayerAABB();
    const minX = Math.floor(aabb.minX);
    const maxX = Math.floor(aabb.maxX);
    const minY = Math.floor(aabb.minY);
    const maxY = Math.floor(aabb.maxY);
    const minZ = Math.floor(aabb.minZ);
    const maxZ = Math.floor(aabb.maxZ);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (this.chunkManager.isSolid(x, y, z)) {
            const blockAABB = AABB.fromBlock(x, y, z);
            if (aabb.intersects(blockAABB)) return true;
          }
        }
      }
    }
    return false;
  }

  dispose() {
    document.removeEventListener('keydown', (e) => this.onKeyDown(e));
    document.removeEventListener('keyup', (e) => this.onKeyUp(e));
    document.removeEventListener('mousemove', (e) => this.onMouseMove(e));
    document.removeEventListener('mousedown', (e) => this.onMouseDown(e));
  }
}
