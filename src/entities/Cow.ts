import { Mob } from './Mob';
import { Vec3 } from '../utils/Vec3';

export class Cow extends Mob {
  private wanderTimer = 0;
  private wanderDir = new Vec3(0, 0, 0);
  private panicTimer = 0;

  constructor(x: number, y: number, z: number) {
    super(x, y, z, 0x6b4226, 10);
    this.speed = 1.5;
  }

  tick(dt: number, isSolid: (x: number, y: number, z: number) => boolean, playerPos: Vec3): boolean {
    const alive = this.update(dt, isSolid);
    if (!alive) return false;

    const dist = this.distanceTo(playerPos);

    // Panic if player is very close
    if (dist < 2.5) {
      this.panicTimer = 2;
    }

    if (this.panicTimer > 0) {
      this.panicTimer -= dt;
      // Run away from player
      if (dist > 0) {
        const dx = (this.position.x - playerPos.x) / dist;
        const dz = (this.position.z - playerPos.z) / dist;
        this.velocity.x = dx * this.speed * 1.5;
        this.velocity.z = dz * this.speed * 1.5;
      }
    } else {
      // Random wandering
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.wanderTimer = 2 + Math.random() * 3;
        const angle = Math.random() * Math.PI * 2;
        this.wanderDir.x = Math.cos(angle);
        this.wanderDir.z = Math.sin(angle);
      }
      this.velocity.x = this.wanderDir.x * this.speed;
      this.velocity.z = this.wanderDir.z * this.speed;
    }

    return true;
  }
}
