import * as THREE from 'three';
import { Vec3 } from '../utils/Vec3';

const boxGeo = new THREE.BoxGeometry(0.6, 1.8, 0.6);

export class Mob {
  public position: Vec3;
  public velocity = new Vec3(0, 0, 0);
  public health: number;
  public maxHealth: number;
  public mesh: THREE.Mesh;
  public dead = false;

  protected speed = 3.0;
  protected gravity = 28.0;
  protected onGround = false;

  constructor(x: number, y: number, z: number, color: number, health: number) {
    this.position = new Vec3(x, y, z);
    this.health = health;
    this.maxHealth = health;
    this.mesh = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color }));
    this.mesh.position.set(x, y + 0.9, z);
    this.mesh.castShadow = true;
  }

  update(dt: number, isSolid: (x: number, y: number, z: number) => boolean): boolean {
    if (this.dead) return false;

    // Apply gravity
    this.velocity.y -= this.gravity * dt;
    if (this.velocity.y < -50) this.velocity.y = -50;

    // Apply velocity
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // Ground collision
    this.onGround = false;
    if (isSolid(Math.floor(this.position.x), Math.floor(this.position.y), Math.floor(this.position.z))) {
      if (this.velocity.y < 0) {
        this.onGround = true;
        this.position.y = Math.ceil(this.position.y);
        this.velocity.y = 0;
      } else {
        this.position.y = Math.floor(this.position.y) - 0.01;
        this.velocity.y = 0;
      }
    }

    // Side collisions
    if (isSolid(Math.floor(this.position.x), Math.floor(this.position.y + 0.9), Math.floor(this.position.z))) {
      this.position.x -= this.velocity.x * dt;
      this.position.z -= this.velocity.z * dt;
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    this.mesh.position.set(this.position.x, this.position.y + 0.9, this.position.z);
    return true;
  }

  takeDamage(amount: number) {
    this.health -= amount;
    if (this.health <= 0) {
      this.dead = true;
    }
  }

  distanceTo(pos: Vec3): number {
    const dx = this.position.x - pos.x;
    const dy = this.position.y - pos.y;
    const dz = this.position.z - pos.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  dispose() {
    // Only dispose material, geometry is shared
    (this.mesh.material as THREE.Material).dispose();
  }
}
