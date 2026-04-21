export interface CraftingRecipe {
  /** Grid size: 2 or 3 */
  gridSize: 2 | 3;
  /** Input pattern: row-major array of block IDs, 0 = empty */
  inputs: number[];
  /** Output block ID */
  output: number;
  /** Output count */
  count: number;
}

const RECIPES: CraftingRecipe[] = [
  // Planks from wood (1 wood → 4 planks, 1x1 in 2x2 grid)
  {
    gridSize: 2,
    inputs: [4, 0, 0, 0],
    output: 10, // BLOCK_PLANKS
    count: 4,
  },
  // Crafting table (4 planks in 2x2)
  {
    gridSize: 2,
    inputs: [10, 10, 10, 10],
    output: 23, // BLOCK_CRAFTING_TABLE
    count: 1,
  },
  // Furnace (8 cobblestone in border)
  {
    gridSize: 3,
    inputs: [
      6, 6, 6,
      6, 0, 6,
      6, 6, 6,
    ],
    output: 24, // BLOCK_FURNACE
    count: 1,
  },
  // Chest (8 planks in border)
  {
    gridSize: 3,
    inputs: [
      10, 10, 10,
      10, 0, 10,
      10, 10, 10,
    ],
    output: 25, // BLOCK_CHEST
    count: 1,
  },
  // Redstone torch (redstone dust + plank)
  {
    gridSize: 2,
    inputs: [32, 0, 10, 0],
    output: 33, // BLOCK_REDSTONE_TORCH
    count: 1,
  },
  // Lever (cobblestone + plank)
  {
    gridSize: 2,
    inputs: [6, 0, 10, 0],
    output: 36, // BLOCK_LEVER
    count: 1,
  },
  // Button (stone)
  {
    gridSize: 2,
    inputs: [6, 0, 0, 0],
    output: 37, // BLOCK_BUTTON
    count: 1,
  },
  // Redstone lamp (simplified: redstone + stone)
  {
    gridSize: 2,
    inputs: [32, 3, 3, 0],
    output: 34, // BLOCK_REDSTONE_LAMP
    count: 1,
  },
  // Repeater (simplified: redstone + stone)
  {
    gridSize: 2,
    inputs: [32, 32, 6, 6],
    output: 39, // BLOCK_REPEATER
    count: 1,
  },
  // Redstone block (4 redstone dust)
  {
    gridSize: 2,
    inputs: [32, 32, 32, 32],
    output: 38, // BLOCK_REDSTONE_BLOCK
    count: 1,
  },
  // Stick (2 planks vertical)
  {
    gridSize: 2,
    inputs: [10, 0, 10, 0],
    output: 40, // BLOCK_STICK
    count: 4,
  },
  // Wooden pickaxe
  {
    gridSize: 2,
    inputs: [10, 10, 0, 40],
    output: 41, // BLOCK_WOODEN_PICKAXE
    count: 1,
  },
  // Stone pickaxe
  {
    gridSize: 2,
    inputs: [6, 6, 0, 40],
    output: 42, // BLOCK_STONE_PICKAXE
    count: 1,
  },
  // Iron pickaxe
  {
    gridSize: 2,
    inputs: [14, 14, 0, 40],
    output: 43, // BLOCK_IRON_PICKAXE
    count: 1,
  },
  // Diamond pickaxe
  {
    gridSize: 2,
    inputs: [16, 16, 0, 40],
    output: 44, // BLOCK_DIAMOND_PICKAXE
    count: 1,
  },
];

export class CraftingRegistry {
  private recipes: CraftingRecipe[] = [];

  constructor() {
    for (const r of RECIPES) {
      this.recipes.push(r);
    }
  }

  /** Try to match a crafting grid to a recipe. Returns match or null. */
  match(grid: number[], gridSize: 2 | 3): { output: number; count: number } | null {
    for (const recipe of this.recipes) {
      if (recipe.gridSize !== gridSize) continue;
      if (this.gridEquals(grid, recipe.inputs)) {
        return { output: recipe.output, count: recipe.count };
      }
    }
    return null;
  }

  private gridEquals(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  getAllRecipes(): CraftingRecipe[] {
    return this.recipes;
  }
}

export const Crafting = new CraftingRegistry();
