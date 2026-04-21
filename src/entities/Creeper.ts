import * as THREE from 'three';
import { Mob } from './Mob';
import { Vec3 } from '../utils/Vec3';

export class Creeper extends Mob {
  private fuseTimer = 0;
  private isFusing = false;
  private flashTimer = 0;

  constructor(x: number, y: number, z: number) {
    super(x, y, z, 0x4a7c38, 20);
    this.speed = 2.2;
  }

  tick(dt: number, isSolid: (x: number, y: number, z: number) => boolean, playerPos: Vec3): boolean {
    const alive = this.update(dt, isSolid);
    if (!alive) return false;

    const dist = this.distanceTo(playerPos);

    // Walk toward player
    if (dist > 0.8 && !this.isFusing) {
      const dx = (playerPos.x - this.position.x) / dist;
      const dz = (playerPos.z - this.position.z) / dist;
      this.velocity.x = dx * this.speed;
      this.velocity.z = dz * this.speed;

      // Jump if blocked
      if (this.onGround && isSolid(Math.floor(this.position.x + dx * 0.5), Math.floor(this.position.y + 1), Math.floor(this.position.z + dz * 0.5))) {
        this.velocity.y = 8;
        this.onGround = false;
      }
    } else {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    // Start fuse when close
    if (dist < 3.0) {
      if (!this.isFusing) {
        this.isFusing = true;
        this.fuseTimer = 1.5;
      }
    }

    // Fuse countdown
    if (this.isFusing) {
      this.fuseTimer -= dt;
      this.flashTimer += dt;

      // Flash white before exploding
      if (this.flashTimer > 0.2) {
        this.flashTimer = 0;
        const mat = this.mesh.material as THREE.MeshLambertMaterial;
        mat.color.setHex(mat.color.getHex() === 0x4a7c38 ? 0xffffff : 0x4a7c38);
      }

      if (this.fuseTimer <= 0) {
        this.dead = true;
        return true; // Signal explosion
      }
    }

    return true;
  }

  dispose() {
    super.dispose();
  }
}
