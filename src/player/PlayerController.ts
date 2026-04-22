import * as THREE from 'three';
import { ChunkManager } from '../engine/ChunkManager';
import { Vec3 } from '../utils/Vec3';
import { AABB } from '../utils/AABB';
import { BlockRegistry } from '../blocks/BlockRegistry';
import { DropEntity } from '../entities/DropEntity';
import { VoxelRenderer } from '../rendering/VoxelRenderer';
import { Inventory } from './Inventory';

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

  // Creative mode flight
  public isFlying = false;
  private lastSpacePressTime = 0;
  private spaceTapCount = 0;

  // Mining state
  private miningTarget: Vec3 | null = null;
  private miningProgress = 0;
  private isMining = false;

  // Placing state
  private isPlacing = false;
  private placeCooldown = 0;
  private readonly PLACE_INTERVAL = 0.15;

  // Arm swing animation
  private armMesh: THREE.Mesh | null = null;
  private armSwingProgress = 0;
  private isArmSwinging = false;

  private chunkManager: ChunkManager;
  private voxelRenderer: VoxelRenderer;
  private onBlockChange: (x: number, y: number, z: number) => void;
  private onInteract: ((x: number, y: number, z: number, blockId: number) => void) | null = null;
  private onPickupDrop: ((blockId: number) => boolean) | null = null;
  public inventory: Inventory;
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
    onPickupDrop?: (blockId: number) => boolean
  ) {
    this.camera = camera;
    this.chunkManager = chunkManager;
    this.voxelRenderer = voxelRenderer;
    this.onBlockChange = onBlockChange;
    if (onInteract) this.onInteract = onInteract;
    if (onPickupDrop) this.onPickupDrop = onPickupDrop;
    this.position = new Vec3(0, 20, 0);
    this.inventory = new Inventory();

    // Block name tooltip
    this.blockNameEl = document.createElement('div');
    this.blockNameEl.className = 'block-name';
    document.body.appendChild(this.blockNameEl);

    this.setupArmMesh();
    this.setupInput();
  }

  private setupArmMesh() {
    const group = new THREE.Group();

    // Arm
    const armGeo = new THREE.BoxGeometry(0.06, 0.28, 0.06);
    const armMat = new THREE.MeshBasicMaterial({ color: 0xd2a679 });
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.position.set(0, -0.14, 0);
    group.add(arm);

    // Hand/tool head
    const toolGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const toolMat = new THREE.MeshBasicMaterial({ color: 0x888888 });
    const tool = new THREE.Mesh(toolGeo, toolMat);
    tool.position.set(0, -0.32, 0.02);
    group.add(tool);

    this.armMesh = group as unknown as THREE.Mesh;
    this.armMesh.visible = false;
    this.camera.add(this.armMesh);
    this.armMesh.position.set(0.35, -0.35, -0.5);
  }

  private setupInput() {
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mousedown', (e) => this.onMouseDown(e));
    document.addEventListener('mouseup', (e) => this.onMouseUp(e));
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === document.body;
      const hint = document.getElementById('pointer-lock-hint');
      if (hint) {
        hint.style.display = this.isPointerLocked ? 'none' : 'block';
      }
    });

    // Press Enter to enter pointer lock (instead of clicking)
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Enter' && !this.isPointerLocked) {
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
      case 'Space':
        this.moveUp = true;
        if (!this.survivalMode) {
          const now = performance.now();
          if (now - this.lastSpacePressTime < 300) {
            this.spaceTapCount++;
            if (this.spaceTapCount >= 2) {
              this.isFlying = !this.isFlying;
              this.spaceTapCount = 0;
            }
          } else {
            this.spaceTapCount = 1;
          }
          this.lastSpacePressTime = now;
        }
        break;
      case 'ShiftLeft': this.moveDown = true; break;
      case 'Digit1': this.setSlot(0); break;
      case 'Digit2': this.setSlot(1); break;
      case 'Digit3': this.setSlot(2); break;
      case 'Digit4': this.setSlot(3); break;
      case 'Digit5': this.setSlot(4); break;
      case 'Digit6': this.setSlot(5); break;
      case 'Digit7': this.setSlot(6); break;
      case 'Digit8': this.setSlot(7); break;
      case 'Digit9': this.setSlot(8); break;
      case 'KeyG': this.survivalMode = !this.survivalMode; break;
      case 'KeyB': if (!this.survivalMode) this.inventory.slots[this.inventory.selectedSlot].blockId = 29; break;
      case 'KeyN': if (!this.survivalMode) this.inventory.slots[this.inventory.selectedSlot].blockId = 32; break;
      case 'KeyM': if (!this.survivalMode) this.inventory.slots[this.inventory.selectedSlot].blockId = 33; break;
      case 'KeyT': if (!this.survivalMode) this.inventory.slots[this.inventory.selectedSlot].blockId = 34; break;
      case 'KeyY': if (!this.survivalMode) this.inventory.slots[this.inventory.selectedSlot].blockId = 36; break;
      case 'KeyU': if (!this.survivalMode) this.inventory.slots[this.inventory.selectedSlot].blockId = 37; break;
      case 'KeyI': if (!this.survivalMode) this.inventory.slots[this.inventory.selectedSlot].blockId = 38; break;
      case 'KeyO': if (!this.survivalMode) this.inventory.slots[this.inventory.selectedSlot].blockId = 39; break;
      case 'KeyZ': if (!this.survivalMode) this.inventory.slots[this.inventory.selectedSlot].blockId = 41; break;
      case 'KeyX': if (!this.survivalMode) this.inventory.slots[this.inventory.selectedSlot].blockId = 42; break;
      case 'KeyC': if (!this.survivalMode) this.inventory.slots[this.inventory.selectedSlot].blockId = 43; break;
      case 'KeyV': if (!this.survivalMode) this.inventory.slots[this.inventory.selectedSlot].blockId = 44; break;
    }
  }

  private setSlot(index: number) {
    this.inventory.setSelectedSlot(index);
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
    // Read sensitivity from localStorage (1-10 scale, default 5)
    const sensSetting = parseFloat(localStorage.getItem('voxelverse-sensitivity') || '5');
    const sensitivity = 0.001 + (sensSetting / 10) * 0.003; // Range: 0.001 to 0.004
    this.yaw -= e.movementX * sensitivity;
    this.pitch -= e.movementY * sensitivity;
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
  }

  private onMouseDown(e: MouseEvent) {
    if (!this.isPointerLocked) return;
    if (e.button === 0) {
      this.isMining = true;
      this.triggerArmSwing();
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
      this.isPlacing = true;
      this.placeCooldown = this.PLACE_INTERVAL;
      this.placeBlock();
    }
  }

  private onMouseUp(e: MouseEvent) {
    if (e.button === 0) {
      this.isMining = false;
      this.miningTarget = null;
      this.miningProgress = 0;
    } else if (e.button === 2) {
      this.isPlacing = false;
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
    const selectedId = this.survivalMode ? this.inventory.getSelectedBlockId() : 1;
    const toolDef = BlockRegistry.getById(selectedId);
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
    const selectedId = this.inventory.getSelectedBlockId();
    const max = this.maxDurability[selectedId];
    if (!max) return;
    const current = this.toolDurability.get(selectedId) ?? max;
    const next = current - 1;
    if (next <= 0) {
      this.toolDurability.delete(selectedId);
      this.inventory.clearSlot(this.inventory.selectedSlot);
      this.playSound('break');
    } else {
      this.toolDurability.set(selectedId, next);
    }
  }

  private breakBlockAt(x: number, y: number, z: number) {
    const blockId = this.chunkManager.getBlock(x, y, z);
    this.chunkManager.setBlock(x, y, z, 0);
    this.onBlockChange(x, y, z);
    this.playSound('break');

    // No drops in creative mode
    if (this.survivalMode && blockId !== 0) {
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
    // Ray starts from camera position (matches crosshair)
    const eyeY = this.position.y + PLAYER_HEIGHT * 0.9;
    let px = this.camera.position.x;
    let py = this.camera.position.y;
    let pz = this.camera.position.z;

    let prevX = Math.floor(px);
    let prevY = Math.floor(py);
    let prevZ = Math.floor(pz);

    for (let d = step; d < maxDist; d += step) {
      px = this.camera.position.x + direction.x * d;
      py = this.camera.position.y + direction.y * d;
      pz = this.camera.position.z + direction.z * d;

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

    // No solid block hit - return the air block at max reach
    return {
      pos: new Vec3(prevX, prevY, prevZ),
      normal: new Vec3(0, 0, 0),
    };
  }

  private breakBlock() {
    const hit = this.getRaycastResult();
    if (hit) {
      this.breakBlockAt(hit.pos.x, hit.pos.y, hit.pos.z);
    }
  }

  private placeBlock() {
    const hit = this.getRaycastResult();
    if (!hit) return;

    let nx: number, ny: number, nz: number;

    if (hit.normal.x === 0 && hit.normal.y === 0 && hit.normal.z === 0) {
      // Air place - place directly at the raycast end position
      nx = hit.pos.x;
      ny = hit.pos.y;
      nz = hit.pos.z;
    } else {
      // Block hit - place adjacent to the hit face
      nx = hit.pos.x + hit.normal.x;
      ny = hit.pos.y + hit.normal.y;
      nz = hit.pos.z + hit.normal.z;
    }

    const selectedId = this.inventory.getSelectedBlockId();

    // Prevent placing non-placeable items (food, tools)
    const placeDef = BlockRegistry.getById(selectedId);
    if (!placeDef.solid && !this.isPlaceableItem(placeDef.key)) return;

    // In survival mode, must have item in inventory
    if (this.survivalMode) {
      if (!this.inventory.consumeSelected()) return;
    }

    const playerAABB = this.getPlayerAABB();
    const blockAABB = AABB.fromBlock(nx, ny, nz);
    const intersects = playerAABB.intersects(blockAABB);

    // Allow placing under player's feet (boost player up)
    const isUnderFeet = intersects && ny < this.position.y + 0.1;

    if (!intersects || isUnderFeet) {
      this.chunkManager.setBlock(nx, ny, nz, selectedId);
      this.chunkManager.markPlayerPlaced(nx, ny, nz);
      this.onBlockChange(nx, ny, nz);
      this.playSound('place');

      if (isUnderFeet) {
        this.position.y = ny + 1;
        this.velocity.y = 0;
        this.onGround = true;
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

    // Resolve if player got stuck inside a block
    this.resolveStuck();

    // Update camera
    this.camera.position.set(this.position.x, this.position.y + PLAYER_HEIGHT * 0.9, this.position.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    // Update block name tooltip
    this.updateBlockName();

    // Update drop entities
    this.updateDrops(dt);

    // Update arm swing animation
    this.updateArmSwing(dt);

    // Continuous placement while holding right-click
    this.updatePlacing(dt);
  }

  private updatePlacing(dt: number) {
    if (!this.isPlacing) return;
    this.placeCooldown -= dt;
    if (this.placeCooldown <= 0) {
      this.placeBlock();
      this.placeCooldown = this.PLACE_INTERVAL;
    }
  }

  private updateCreative(dt: number) {
    if (this.isFlying) {
      this.updateFlying(dt);
    } else {
      this.updateCreativeOnFoot(dt);
    }
  }

  private updateFlying(dt: number) {
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

  private updateCreativeOnFoot(dt: number) {
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
        this.onGround = true;
        this.fallDistance = 0;
      }
      this.position.y -= this.velocity.y * dt;
      this.velocity.y = 0;
    }

    // Track fall distance
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
    this.isFlying = false;
  }

  private triggerArmSwing() {
    if (!this.armMesh) return;
    this.isArmSwinging = true;
    this.armSwingProgress = 0;
    this.armMesh.visible = true;
  }

  private updateArmSwing(dt: number) {
    if (!this.isArmSwinging || !this.armMesh) return;

    this.armSwingProgress += dt * 12; // swing speed

    // Swing animation: rotate arm forward and back
    const swingAngle = Math.sin(this.armSwingProgress * Math.PI) * 1.2;
    this.armMesh.rotation.x = swingAngle;

    if (this.armSwingProgress >= 1) {
      this.isArmSwinging = false;
      this.armMesh.visible = false;
      this.armMesh.rotation.x = 0;
    }
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
          const accepted = this.onPickupDrop(drop.blockId);
          if (!accepted) {
            // Inventory full, drop stays? No, we already removed it.
            // For now, just let it disappear if inventory is full.
          }
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

  // Push player out of solid blocks if stuck inside
  resolveStuck(): void {
    const maxIterations = 10;
    for (let i = 0; i < maxIterations; i++) {
      if (!this.checkCollision()) break;
      // Try pushing up first, then in cardinal directions
      this.position.y += 0.5;
      if (!this.checkCollision()) return;
      this.position.y -= 0.5;
      // Try pushing in each direction
      const pushes = [
        { x: 0.3, y: 0, z: 0 },
        { x: -0.3, y: 0, z: 0 },
        { x: 0, y: 0, z: 0.3 },
        { x: 0, y: 0, z: -0.3 },
      ];
      let resolved = false;
      for (const p of pushes) {
        this.position.x += p.x;
        this.position.y += p.y;
        this.position.z += p.z;
        if (!this.checkCollision()) {
          resolved = true;
          break;
        }
        this.position.x -= p.x;
        this.position.y -= p.y;
        this.position.z -= p.z;
      }
      if (!resolved) {
        // If all directions fail, push up more aggressively
        this.position.y += 1.0;
      }
    }
  }

  dispose() {
    document.removeEventListener('keydown', (e) => this.onKeyDown(e));
    document.removeEventListener('keyup', (e) => this.onKeyUp(e));
    document.removeEventListener('mousemove', (e) => this.onMouseMove(e));
    document.removeEventListener('mousedown', (e) => this.onMouseDown(e));
  }
}
