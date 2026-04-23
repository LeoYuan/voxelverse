import { describe, expect, it } from 'vitest';
import { createHouseSpec, createTowerSpec } from '../tutorial/levelTemplates';

describe('level templates', () => {
  it('creates a house spec with explicit floor and wall roles', () => {
    const spec = createHouseSpec(
      {
        id: 'house_small',
        title: '小房子',
        description: '建造一个简单的房子',
        hint: '铺一个3×3的地板，再围出房子轮廓',
      },
      {
        floorSize: 3,
        wallHeight: 1,
        floorColor: 0xb8864b,
        wallColor: 0xd7c7a4,
        doorway: { x: 0, z: -1 },
      },
    );

    const floor = spec.target.blocks.filter((block) => block.role === 'floor');
    const walls = spec.target.blocks.filter((block) => block.role === 'wall');

    expect(floor).toHaveLength(9);
    expect(walls).toHaveLength(7);
    expect(spec.target.progress).toContainEqual({ label: '围墙', role: 'wall', target: 7 });
  });

  it('creates a tower spec that exposes vertical height in the target blocks', () => {
    const spec = createTowerSpec(
      {
        id: 'tower_small',
        title: '小小高塔',
        description: '堆叠3个方块成一列',
        hint: '站在原地，按住右键往脚下连续放置方块',
      },
      3,
      0x8a8a8a,
    );

    expect(spec.target.blocks.map((block) => block.y)).toEqual([0, 1, 2]);
  });

});
