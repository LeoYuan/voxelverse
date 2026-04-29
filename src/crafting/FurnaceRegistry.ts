import {
  BLOCK_COOKED_BEEF,
  BLOCK_GLASS,
  BLOCK_GOLD_INGOT,
  BLOCK_GOLD_ORE,
  BLOCK_IRON_INGOT,
  BLOCK_IRON_ORE,
  BLOCK_PLANKS,
  BLOCK_RAW_BEEF,
  BLOCK_SAND,
  BLOCK_WOOD,
} from '../blocks/BlockRegistry';

export interface FurnaceRecipe {
  input: number;
  output: number;
  cookTicks: number;
}

export interface FurnaceFuel {
  item: number;
  burnTicks: number;
}

export interface FurnaceSnapshot {
  inputId: number;
  inputCount: number;
  fuelId: number;
  fuelCount: number;
  outputId: number;
  outputCount: number;
  burnTicksRemaining: number;
  cookTicks: number;
}

const MAX_STACK = 64;

const RECIPES: FurnaceRecipe[] = [
  { input: BLOCK_IRON_ORE, output: BLOCK_IRON_INGOT, cookTicks: 5 },
  { input: BLOCK_GOLD_ORE, output: BLOCK_GOLD_INGOT, cookTicks: 5 },
  { input: BLOCK_RAW_BEEF, output: BLOCK_COOKED_BEEF, cookTicks: 5 },
  { input: BLOCK_SAND, output: BLOCK_GLASS, cookTicks: 5 },
];

const FUELS: FurnaceFuel[] = [
  { item: BLOCK_WOOD, burnTicks: 5 },
  { item: BLOCK_PLANKS, burnTicks: 3 },
];

export class FurnaceRegistryClass {
  private recipes = new Map<number, FurnaceRecipe>();
  private fuels = new Map<number, FurnaceFuel>();

  constructor() {
    for (const recipe of RECIPES) this.recipes.set(recipe.input, recipe);
    for (const fuel of FUELS) this.fuels.set(fuel.item, fuel);
  }

  getRecipe(inputId: number): FurnaceRecipe | null {
    return this.recipes.get(inputId) ?? null;
  }

  getFuel(itemId: number): FurnaceFuel | null {
    return this.fuels.get(itemId) ?? null;
  }
}

export class FurnaceState {
  private inputId: number;
  private inputCount: number;
  private fuelId: number;
  private fuelCount: number;
  private outputId: number;
  private outputCount: number;
  private burnTicksRemaining: number;
  private cookTicks: number;

  constructor(initial: Partial<FurnaceSnapshot> = {}) {
    this.inputId = initial.inputId ?? 0;
    this.inputCount = initial.inputCount ?? 0;
    this.fuelId = initial.fuelId ?? 0;
    this.fuelCount = initial.fuelCount ?? 0;
    this.outputId = initial.outputId ?? 0;
    this.outputCount = initial.outputCount ?? 0;
    this.burnTicksRemaining = initial.burnTicksRemaining ?? 0;
    this.cookTicks = initial.cookTicks ?? 0;
  }

  tick() {
    const recipe = FurnaceRegistry.getRecipe(this.inputId);
    if (!recipe || this.inputCount <= 0 || !this.canAcceptOutput(recipe.output)) {
      this.cookTicks = 0;
      return;
    }

    if (this.burnTicksRemaining <= 0 && !this.consumeFuel()) {
      return;
    }

    this.burnTicksRemaining--;
    this.cookTicks++;

    if (this.cookTicks >= recipe.cookTicks) {
      this.finishRecipe(recipe.output);
    }
  }

  setInput(itemId: number, count: number) {
    this.inputId = itemId;
    this.inputCount = count;
    this.cookTicks = 0;
  }

  setFuel(itemId: number, count: number) {
    this.fuelId = itemId;
    this.fuelCount = count;
  }

  takeOutput(): { itemId: number; count: number } | null {
    if (this.outputId === 0 || this.outputCount <= 0) return null;
    const result = { itemId: this.outputId, count: this.outputCount };
    this.outputId = 0;
    this.outputCount = 0;
    return result;
  }

  snapshot(): FurnaceSnapshot {
    return {
      inputId: this.inputId,
      inputCount: this.inputCount,
      fuelId: this.fuelId,
      fuelCount: this.fuelCount,
      outputId: this.outputId,
      outputCount: this.outputCount,
      burnTicksRemaining: this.burnTicksRemaining,
      cookTicks: this.cookTicks,
    };
  }

  private consumeFuel(): boolean {
    const fuel = FurnaceRegistry.getFuel(this.fuelId);
    if (!fuel || this.fuelCount <= 0) return false;
    this.fuelCount--;
    if (this.fuelCount === 0) this.fuelId = 0;
    this.burnTicksRemaining = fuel.burnTicks;
    return true;
  }

  private canAcceptOutput(outputId: number): boolean {
    return this.outputId === 0 || (this.outputId === outputId && this.outputCount < MAX_STACK);
  }

  private finishRecipe(outputId: number) {
    this.inputCount--;
    if (this.inputCount === 0) this.inputId = 0;

    if (this.outputId === 0) {
      this.outputId = outputId;
      this.outputCount = 1;
    } else {
      this.outputCount++;
    }
    this.cookTicks = 0;
  }
}

export const FurnaceRegistry = new FurnaceRegistryClass();
