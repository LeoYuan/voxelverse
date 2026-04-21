import * as THREE from 'three';
import { Vec3 } from '../utils/Vec3';

const arrowGeo = new THREE.BoxGeometry(0.1, 0.1, 0.4);
const arrowMat = new THREE.MeshLambertMaterial({ color: 0x8b6914 });

export class ArrowProjectile {
  public position: Vec3;
  public velocity: Vec3;
  public mesh: THREE.Mesh;
  public dead = false;
  public age = 0;
  private maxAge = 3;

  constructor(x: number, y: number, z: number, dirX: number, dirY: number, dirZ: number, speed: number) {
    this.position = new Vec3(x, y, z);
    this.velocity = new Vec3(dirX * speed, dirY * speed, dirZ * speed);
    this.mesh = new THREE.Mesh(arrowGeo, arrowMat);
    this.mesh.position.set(x, y, z);
    this.mesh.lookAt(x + dirX, y + dirY, z + dirZ);
  }

  update(dt: number, isSolid: (x: number, y: number, z: number) => boolean): boolean {
    this.age += dt;
    if (this.age > this.maxAge) {
      this.dead = true;
      return false;
    }

    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // Gravity arc
    this.velocity.y -= 5 * dt;

    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.mesh.lookAt(
      this.position.x + this.velocity.x,
      this.position.y + this.velocity.y,
      this.position.z + this.velocity.z
    );

    // Hit solid block
    if (isSolid(Math.floor(this.position.x), Math.floor(this.position.y), Math.floor(this.position.z))) {
      this.dead = true;
      return false;
    }

    return true;
  }

  distanceTo(pos: Vec3): number {
    const dx = this.position.x - pos.x;
    const dy = this.position.y - pos.y;
    const dz = this.position.z - pos.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  dispose() {
    // Geometry and material are shared, don't dispose
  }
}
