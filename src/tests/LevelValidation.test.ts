import { describe, expect, it } from 'vitest';
import { ChunkManager } from '../engine/ChunkManager';
import { Vec3 } from '../utils/Vec3';
import { BLOCK_PLANKS } from '../blocks/BlockRegistry';
import { createHouseSpec } from '../tutorial/levelTemplates';
import { evaluateLevelSpec } from '../tutorial/levelValidation';

describe('evaluateLevelSpec', () => {
  it('keeps preview, progress, and validation aligned for level 4', () => {
    const cm = new ChunkManager(42);
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

    for (const block of spec.target.blocks) {
      cm.setBlock(block.x, block.y + 18, block.z, BLOCK_PLANKS);
      cm.markPlayerPlaced(block.x, block.y + 18, block.z);
    }

    const result = evaluateLevelSpec(spec, cm, new Vec3(0, 20, 0));

    expect(result.complete).toBe(true);
    expect(result.progress.find((item) => item.label === '围墙')).toEqual({
      current: 7,
      target: 7,
      label: '围墙',
    });
  });
});
