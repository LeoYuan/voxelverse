import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  BLOCK_DIAMOND_PICKAXE,
  BLOCK_IRON_PICKAXE,
  BLOCK_STONE,
  BLOCK_STONE_PICKAXE,
  BLOCK_WOODEN_PICKAXE,
} from '../blocks/BlockRegistry';
import {
  AttackCooldown,
  getAttackDamage,
  getKnockbackDirection,
  selectAttackTarget,
} from '../combat/playerAttack';
import { Mob } from '../entities/Mob';

describe('player attack helpers', () => {
  it('maps held items to bounded attack damage', () => {
    expect(getAttackDamage(0)).toBe(2);
    expect(getAttackDamage(BLOCK_STONE)).toBe(2);
    expect(getAttackDamage(BLOCK_WOODEN_PICKAXE)).toBe(3);
    expect(getAttackDamage(BLOCK_STONE_PICKAXE)).toBe(4);
    expect(getAttackDamage(BLOCK_IRON_PICKAXE)).toBe(5);
    expect(getAttackDamage(BLOCK_DIAMOND_PICKAXE)).toBe(6);
  });

  it('selects the nearest living target under the attack ray', () => {
    const target = selectAttackTarget(
      { x: 0, y: 1.6, z: 0 },
      { x: 0, y: 0, z: -1 },
      [
        { id: 'far', x: 0, y: 1.2, z: -3.5, dead: false },
        { id: 'near', x: 0.2, y: 1.2, z: -2, dead: false },
        { id: 'dead', x: 0, y: 1.2, z: -1, dead: true },
      ],
      4,
      0.8,
    );

    expect(target?.id).toBe('near');
  });

  it('rejects targets outside range or outside the ray radius', () => {
    expect(selectAttackTarget(
      { x: 0, y: 1.6, z: 0 },
      { x: 0, y: 0, z: -1 },
      [{ id: 'far', x: 0, y: 1.2, z: -5, dead: false }],
      4,
      0.8,
    )).toBeNull();

    expect(selectAttackTarget(
      { x: 0, y: 1.6, z: 0 },
      { x: 0, y: 0, z: -1 },
      [{ id: 'side', x: 1.2, y: 1.2, z: -2, dead: false }],
      4,
      0.8,
    )).toBeNull();
  });

  it('enforces a 350ms attack cooldown', () => {
    const cooldown = new AttackCooldown(350);

    expect(cooldown.tryUse(1_000)).toBe(true);
    expect(cooldown.tryUse(1_349)).toBe(false);
    expect(cooldown.tryUse(1_350)).toBe(true);
  });

  it('returns normalized knockback away from the attacker', () => {
    expect(getKnockbackDirection(0, 0, 3, 4)).toEqual({ x: 0.6, z: 0.8 });
    expect(getKnockbackDirection(1, 1, 1, 1)).toEqual({ x: 0, z: 0 });
  });

  it('applies damage, knockback, and temporary hit color to mobs', () => {
    const mob = new Mob(0, 2, 0, 0x123456, 10);
    const material = mob.mesh.material as THREE.MeshLambertMaterial;

    mob.applyHit(3, 1, 0);

    expect(mob.health).toBe(7);
    expect(mob.velocity.x).toBeGreaterThan(0);
    expect(material.color.getHex()).toBe(0xffffff);

    mob.update(0.2, () => false);
    expect(material.color.getHex()).toBe(0x123456);
    mob.dispose();
  });
});
