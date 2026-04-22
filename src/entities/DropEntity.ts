import * as THREE from 'three';
import { Vec3 } from '../utils/Vec3';
import { BlockRegistry } from '../blocks/BlockRegistry';

const DROP_SIZE = 0.25;
const GRAVITY = 20;
const PICKUP_RADIUS = 1.5;
const LIFETIME = 60; // seconds

export class DropEntity {
  public position: Vec3;
  public velocity: Vec3;
  public blockId: number;
  public age = 0;
  public mesh: THREE.Mesh;
  private geometry: THREE.BoxGeometry;
  private material: THREE.MeshLambertMaterial;

  constructor(x: number, y: number, z: number, blockId: number) {
    this.position = new Vec3(x, y, z);
    this.velocity = new Vec3(
      (Math.random() - 0.5) * 3,
      Math.random() * 3 + 2,
      (Math.random() - 0.5) * 3
    );
    this.blockId = blockId;

    const def = BlockRegistry.getById(blockId);
    this.geometry = new THREE.BoxGeometry(DROP_SIZE, DROP_SIZE, DROP_SIZE);
    this.material = new THREE.MeshLambertMaterial({ color: def.color });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.set(x, y, z);
  }

  update(dt: number, isSolid: (x: number, y: number, z: number) => boolean): boolean {
    this.age += dt;
    if (this.age > LIFETIME) {
      this.dispose();
      return false;
    }

    // Apply gravity
    this.velocity.y -= GRAVITY * dt;

    const r = DROP_SIZE / 2;
    const checkSolid = (px: number, py: number, pz: number) => {
      for (let cx = Math.floor(px - r); cx <= Math.floor(px + r); cx++) {
        for (let cy = Math.floor(py - r); cy <= Math.floor(py + r); cy++) {
          for (let cz = Math.floor(pz - r); cz <= Math.floor(pz + r); cz++) {
            if (isSolid(cx, cy, cz)) return true;
          }
        }
      }
      return false;
    };

    // Try move X
    this.position.x += this.velocity.x * dt;
    if (checkSolid(this.position.x, this.position.y, this.position.z)) {
      this.position.x -= this.velocity.x * dt;
      this.velocity.x *= -0.3;
    }

    // Try move Y
    this.position.y += this.velocity.y * dt;
    if (checkSolid(this.position.x, this.position.y, this.position.z)) {
      this.position.y -= this.velocity.y * dt;
      this.velocity.y *= -0.3;
      if (Math.abs(this.velocity.y) < 1) this.velocity.y = 0;
    }

    // Try move Z
    this.position.z += this.velocity.z * dt;
    if (checkSolid(this.position.x, this.position.y, this.position.z)) {
      this.position.z -= this.velocity.z * dt;
      this.velocity.z *= -0.3;
    }

    // Bobbing animation
    const bob = Math.sin(this.age * 5) * 0.05;
    this.mesh.position.set(this.position.x, this.position.y + bob, this.position.z);
    this.mesh.rotation.x += dt * 2;
    this.mesh.rotation.y += dt * 3;

    return true;
  }

  canPickup(playerPos: Vec3): boolean {
    const dx = this.position.x - playerPos.x;
    const dy = this.position.y - playerPos.y;
    const dz = this.position.z - playerPos.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) < PICKUP_RADIUS;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
