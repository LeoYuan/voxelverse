import { Mob } from './Mob';
import { Vec3 } from '../utils/Vec3';

export class Zombie extends Mob {
  private attackCooldown = 0;
  private burnTimer = 0;

  constructor(x: number, y: number, z: number) {
    super(x, y, z, 0x2e7d32, 20);
    this.speed = 2.3;
  }

  tick(dt: number, isSolid: (x: number, y: number, z: number) => boolean, playerPos: Vec3, isDay: boolean): boolean {
    const alive = this.update(dt, isSolid);
    if (!alive) return false;

    // Day burn damage
    if (isDay) {
      this.burnTimer += dt;
      if (this.burnTimer >= 2) {
        this.burnTimer -= 2;
        this.takeDamage(2);
      }
    } else {
      this.burnTimer = 0;
    }

    // Simple AI: walk toward player if within 16 blocks
    const dist = this.distanceTo(playerPos);
    if (dist < 16 && dist > 0.8) {
      const dx = (playerPos.x - this.position.x) / dist;
      const dz = (playerPos.z - this.position.z) / dist;
      this.velocity.x = dx * this.speed;
      this.velocity.z = dz * this.speed;

      // Jump if blocked and on ground
      if (this.onGround && isSolid(Math.floor(this.position.x + dx * 0.5), Math.floor(this.position.y + 1), Math.floor(this.position.z + dz * 0.5))) {
        this.velocity.y = 8;
        this.onGround = false;
      }
    } else {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    // Attack player on contact
    if (dist < 1.2) {
      this.attackCooldown -= dt;
      if (this.attackCooldown <= 0) {
        this.attackCooldown = 1.0;
        return true; // Signal that attack occurred
      }
    } else {
      this.attackCooldown = 0;
    }

    return true;
  }
}
