import { Vec3 } from './Vec3';

export class AABB {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;

  constructor(
    minX: number,
    minY: number,
    minZ: number,
    maxX: number,
    maxY: number,
    maxZ: number
  ) {
    this.minX = minX;
    this.minY = minY;
    this.minZ = minZ;
    this.maxX = maxX;
    this.maxY = maxY;
    this.maxZ = maxZ;
  }

  static fromBlock(x: number, y: number, z: number): AABB {
    return new AABB(x, y, z, x + 1, y + 1, z + 1);
  }

  intersects(other: AABB): boolean {
    return (
      this.minX < other.maxX && this.maxX > other.minX &&
      this.minY < other.maxY && this.maxY > other.minY &&
      this.minZ < other.maxZ && this.maxZ > other.minZ
    );
  }

  containsPoint(p: Vec3): boolean {
    return (
      p.x >= this.minX && p.x <= this.maxX &&
      p.y >= this.minY && p.y <= this.maxY &&
      p.z >= this.minZ && p.z <= this.maxZ
    );
  }

  translate(v: Vec3): AABB {
    return new AABB(
      this.minX + v.x, this.minY + v.y, this.minZ + v.z,
      this.maxX + v.x, this.maxY + v.y, this.maxZ + v.z
    );
  }
}
