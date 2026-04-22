import { BlockRegistry, type ToolType } from '../blocks/BlockRegistry';

function getToolType(blockId: number): ToolType | null {
  const key = BlockRegistry.getById(blockId).key;
  if (key.endsWith('_pickaxe')) return 'pickaxe';
  if (key.endsWith('_axe')) return 'axe';
  if (key.endsWith('_shovel')) return 'shovel';
  return null;
}

function canHarvestBlock(blockId: number, toolBlockId: number): boolean {
  const block = BlockRegistry.getById(blockId);
  if (!block.toolRequired) return true;
  return getToolType(toolBlockId) === block.toolRequired;
}

export function resolveBlockDrops(
  blockId: number,
  toolBlockId: number,
  random: () => number = Math.random
): number[] {
  if (!canHarvestBlock(blockId, toolBlockId)) return [];

  const block = BlockRegistry.getById(blockId);
  if (block.drops) {
    if (block.drops.length === 0) return [];

    const drops: number[] = [];
    for (const drop of block.drops) {
      const chance = drop.chance ?? 1;
      if (random() > chance) continue;

      const dropDef = BlockRegistry.getByKey(drop.item);
      if (!dropDef) continue;

      for (let i = 0; i < drop.count; i++) {
        drops.push(dropDef.id);
      }
    }
    return drops;
  }

  return [blockId];
}
