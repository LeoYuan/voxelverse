import { Mob } from './Mob';
import { Vec3 } from '../utils/Vec3';
import { ArrowProjectile } from './ArrowProjectile';

export class Skeleton extends Mob {
  private shootCooldown = 0;
  private burnTimer = 0;
  public arrows: ArrowProjectile[] = [];

  constructor(x: number, y: number, z: number) {
    super(x, y, z, 0xcccccc, 20);
    this.speed = 2.0;
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

    const dist = this.distanceTo(playerPos);

    // Walk toward player if too far, back away if too close
    if (dist > 12) {
      const dx = (playerPos.x - this.position.x) / dist;
      const dz = (playerPos.z - this.position.z) / dist;
      this.velocity.x = dx * this.speed;
      this.velocity.z = dz * this.speed;
    } else if (dist < 4) {
      const dx = (playerPos.x - this.position.x) / dist;
      const dz = (playerPos.z - this.position.z) / dist;
      this.velocity.x = -dx * this.speed;
      this.velocity.z = -dz * this.speed;
    } else {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    // Shoot arrow when in range
    this.shootCooldown -= dt;
    if (dist < 16 && dist > 2 && this.shootCooldown <= 0) {
      this.shootCooldown = 2.0;
      const dx = (playerPos.x - this.position.x) / dist;
      const dy = ((playerPos.y + 0.9) - (this.position.y + 1.5)) / dist;
      const dz = (playerPos.z - this.position.z) / dist;
      const arrow = new ArrowProjectile(
        this.position.x,
        this.position.y + 1.5,
        this.position.z,
        dx, dy, dz,
        15
      );
      this.arrows.push(arrow);
    }

    // Update arrows
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const arrow = this.arrows[i];
      const arrowAlive = arrow.update(dt, isSolid);
      if (!arrowAlive) {
        arrow.dispose();
        this.arrows.splice(i, 1);
      }
    }

    return true;
  }

  dispose() {
    super.dispose();
    for (const arrow of this.arrows) {
      arrow.dispose();
    }
    this.arrows = [];
  }
}
