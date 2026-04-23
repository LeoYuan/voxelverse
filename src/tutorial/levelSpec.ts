export type TargetBlockRole =
  | 'structure'
  | 'floor'
  | 'wall'
  | 'roof'
  | 'support'
  | 'bridge'
  | 'path'
  | 'water'
  | 'void';

export interface TargetBlock {
  x: number;
  y: number;
  z: number;
  color: number;
  role?: TargetBlockRole;
}

export interface LevelProgressSpec {
  label: string;
  role: Exclude<TargetBlockRole, 'void'>;
  target: number;
}

export type LevelValidator =
  | { type: 'placed_block_count'; count: number; radius?: number }
  | { type: 'pillar'; height: number }
  | { type: 'platform'; size: number }
  | { type: 'stacked_platform'; size: number; layers: number }
  | { type: 'house'; floorTarget: number; wallTarget: number }
  | { type: 'multistory_house'; floors: number; wallTarget: number }
  | { type: 'fence'; length: number }
  | { type: 'bridge'; length: number }
  | { type: 'walled_corridor'; length: number }
  | { type: 'tunnel'; length: number }
  | { type: 'basement'; size: number; depth: number }
  | { type: 'water_pool'; size: number }
  | { type: 'stairs'; steps: number }
  | { type: 'supported_stairs'; steps: number }
  | { type: 'complex_structure'; count: number };

export interface LevelSpec {
  id: string;
  title: string;
  description: string;
  hint: string;
  target: {
    blocks: TargetBlock[];
    progress?: LevelProgressSpec[];
  };
  validator: LevelValidator;
}

export function targetBlock(
  x: number,
  y: number,
  z: number,
  color: number,
  role: TargetBlockRole = 'structure',
): TargetBlock {
  return { x, y, z, color, role };
}

export function countBlocksByRole(
  blocks: TargetBlock[],
  role: Exclude<TargetBlockRole, 'void'>,
): number {
  return blocks.filter((block) => block.role === role).length;
}
