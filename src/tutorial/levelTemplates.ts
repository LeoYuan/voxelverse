import { countBlocksByRole, type LevelSpec, type TargetBlock, targetBlock } from './levelSpec';

type BaseLevel = Pick<LevelSpec, 'id' | 'title' | 'description' | 'hint'>;

function platformBlocks(size: number, color: number, role: TargetBlock['role'] = 'floor'): TargetBlock[] {
  const blocks: TargetBlock[] = [];
  const offset = Math.floor(size / 2);
  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      blocks.push(targetBlock(x - offset, 0, z - offset, color, role));
    }
  }
  return blocks;
}

function ringBlocks(size: number, y: number, color: number, doorway?: { x: number; z: number }, role: TargetBlock['role'] = 'wall'): TargetBlock[] {
  const blocks: TargetBlock[] = [];
  const offset = Math.floor(size / 2);
  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      const rx = x - offset;
      const rz = z - offset;
      if (Math.abs(rx) !== offset && Math.abs(rz) !== offset) continue;
      if (doorway && doorway.x === rx && doorway.z === rz) continue;
      blocks.push(targetBlock(rx, y, rz, color, role));
    }
  }
  return blocks;
}

export function createPlacedBlockCountSpec(base: BaseLevel, count: number, color: number): LevelSpec {
  return {
    ...base,
    target: {
      blocks: [targetBlock(0, 0, 0, color, 'structure')],
    },
    validator: { type: 'placed_block_count', count },
  };
}

export function createTowerSpec(base: BaseLevel, height: number, color: number): LevelSpec {
  const blocks: TargetBlock[] = [];
  for (let y = 0; y < height; y++) {
    blocks.push(targetBlock(0, y, 0, color, 'support'));
  }
  return {
    ...base,
    target: {
      blocks,
      progress: [{ label: '高度', role: 'support', target: height }],
    },
    validator: { type: 'pillar', height },
  };
}

export function createPlatformSpec(base: BaseLevel, size: number, color: number): LevelSpec {
  const blocks = platformBlocks(size, color, 'floor');
  return {
    ...base,
    target: {
      blocks,
      progress: [{ label: '地板', role: 'floor', target: blocks.length }],
    },
    validator: { type: 'platform', size },
  };
}

export function createHouseSpec(
  base: BaseLevel,
  options: {
    floorSize: number;
    floorColor: number;
    wallColor: number;
    doorway?: { x: number; z: number };
    wallHeight?: number;
  },
): LevelSpec {
  const wallHeight = options.wallHeight ?? 1;
  const blocks = [
    ...platformBlocks(options.floorSize, options.floorColor, 'floor'),
  ];
  for (let level = 0; level < wallHeight; level++) {
    blocks.push(...ringBlocks(options.floorSize, level + 1, options.wallColor, options.doorway, 'wall'));
  }
  return {
    ...base,
    target: {
      blocks,
      progress: [
        { label: '地板', role: 'floor', target: countBlocksByRole(blocks, 'floor') },
        { label: '围墙', role: 'wall', target: countBlocksByRole(blocks, 'wall') },
      ],
    },
    validator: {
      type: 'house',
      floorTarget: countBlocksByRole(blocks, 'floor'),
      wallTarget: countBlocksByRole(blocks, 'wall'),
    },
  };
}

export function createMultistoryHouseSpec(
  base: BaseLevel,
  options: {
    floors: number;
    floorSize: number;
    floorColor: number;
    wallColor: number;
    doorway?: { x: number; z: number };
  },
): LevelSpec {
  const blocks: TargetBlock[] = [];
  for (let floor = 0; floor < options.floors; floor++) {
    const baseY = floor * 2;
    for (const block of platformBlocks(options.floorSize, options.floorColor, 'floor')) {
      blocks.push(targetBlock(block.x, block.y + baseY, block.z, block.color, block.role));
    }
    blocks.push(...ringBlocks(options.floorSize, baseY + 1, options.wallColor, options.doorway, 'wall'));
  }
  return {
    ...base,
    target: {
      blocks,
    },
    validator: { type: 'multistory_house', floors: options.floors, wallTarget: countBlocksByRole(blocks, 'wall') },
  };
}

export function createLinearSpec(
  base: BaseLevel,
  options: {
    length: number;
    color: number;
    validator: 'fence' | 'bridge' | 'tunnel' | 'stairs';
    role?: TargetBlock['role'];
    rise?: boolean;
    doubleWidth?: boolean;
  },
): LevelSpec {
  const blocks: TargetBlock[] = [];
  const start = -Math.floor(options.length / 2);
  for (let i = 0; i < options.length; i++) {
    const x = start + i;
    const y = options.rise ? i : 0;
    blocks.push(targetBlock(x, y, 0, options.color, options.role ?? 'structure'));
    if (options.doubleWidth) {
      blocks.push(targetBlock(x, y, 1, options.color, options.role ?? 'structure'));
    }
  }
  const validatorMap = {
    fence: { type: 'fence', length: options.length } as const,
    bridge: { type: 'bridge', length: options.length } as const,
    tunnel: { type: 'tunnel', length: options.length } as const,
    stairs: { type: 'stairs', steps: options.length } as const,
  };
  return {
    ...base,
    target: { blocks },
    validator: validatorMap[options.validator],
  };
}

export function createCustomSpec(base: BaseLevel, blocks: TargetBlock[], validator: LevelSpec['validator'], progress?: LevelSpec['target']['progress']): LevelSpec {
  return {
    ...base,
    target: { blocks, progress },
    validator,
  };
}
