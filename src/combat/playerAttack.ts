import {
  BLOCK_DIAMOND_PICKAXE,
  BLOCK_IRON_PICKAXE,
  BLOCK_STONE_PICKAXE,
  BLOCK_WOODEN_PICKAXE,
} from '../blocks/BlockRegistry';

export interface AttackPoint {
  x: number;
  y: number;
  z: number;
}

export interface AttackTarget extends AttackPoint {
  id: string;
  dead: boolean;
}

export function getAttackDamage(blockId: number): number {
  if (blockId === BLOCK_WOODEN_PICKAXE) return 3;
  if (blockId === BLOCK_STONE_PICKAXE) return 4;
  if (blockId === BLOCK_IRON_PICKAXE) return 5;
  if (blockId === BLOCK_DIAMOND_PICKAXE) return 6;
  return 2;
}

export function selectAttackTarget<T extends AttackTarget>(
  origin: AttackPoint,
  direction: AttackPoint,
  targets: T[],
  maxDistance = 4,
  radius = 0.8,
): T | null {
  const directionLength = Math.sqrt(
    direction.x ** 2 +
    direction.y ** 2 +
    direction.z ** 2,
  );
  if (directionLength <= 0) return null;

  const dx = direction.x / directionLength;
  const dy = direction.y / directionLength;
  const dz = direction.z / directionLength;
  let best: T | null = null;
  let bestProjection = Infinity;

  for (const target of targets) {
    if (target.dead) continue;
    const offsetX = target.x - origin.x;
    const offsetY = target.y - origin.y;
    const offsetZ = target.z - origin.z;
    const projection = offsetX * dx + offsetY * dy + offsetZ * dz;
    if (projection < 0 || projection > maxDistance) continue;

    const distanceSquared =
      offsetX ** 2 +
      offsetY ** 2 +
      offsetZ ** 2;
    const perpendicularSquared = Math.max(0, distanceSquared - projection ** 2);
    if (perpendicularSquared > radius ** 2) continue;

    if (projection < bestProjection) {
      best = target;
      bestProjection = projection;
    }
  }

  return best;
}

export class AttackCooldown {
  private readonly intervalMs: number;
  private lastUseTime = -Infinity;

  constructor(intervalMs = 350) {
    this.intervalMs = intervalMs;
  }

  tryUse(now: number): boolean {
    if (now - this.lastUseTime < this.intervalMs) return false;
    this.lastUseTime = now;
    return true;
  }
}

export function getKnockbackDirection(
  attackerX: number,
  attackerZ: number,
  targetX: number,
  targetZ: number,
): { x: number; z: number } {
  const x = targetX - attackerX;
  const z = targetZ - attackerZ;
  const length = Math.sqrt(x * x + z * z);
  if (length <= 0) return { x: 0, z: 0 };
  return { x: x / length, z: z / length };
}
