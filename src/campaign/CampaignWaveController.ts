import type {
  CampaignDefense,
  CampaignEnemyKind,
} from './CampaignConfig';

export interface CampaignWaveProgress {
  spawned: number;
  active: number;
  defeated: number;
  target: number;
}

export class CampaignWaveController {
  private readonly random: () => number;
  private defense: CampaignDefense | null = null;
  private spawnAccumulator = 0;
  private spawned = 0;
  private defeated = 0;
  private activeIds = new Set<string>();

  constructor(random: () => number = Math.random) {
    this.random = random;
  }

  start(defense: CampaignDefense) {
    this.defense = defense;
    this.spawnAccumulator = 0;
    this.spawned = 0;
    this.defeated = 0;
    this.activeIds.clear();
  }

  tick(
    dt: number,
    spawn: (kind: CampaignEnemyKind, index: number) => string | null,
  ) {
    if (!this.defense || this.spawned >= this.defense.killTarget) return;
    this.spawnAccumulator += Math.max(0, dt);

    while (
      this.spawnAccumulator >= this.defense.spawnInterval &&
      this.spawned < this.defense.killTarget
    ) {
      this.spawnAccumulator -= this.defense.spawnInterval;
      const id = spawn(this.chooseEnemyKind(), this.spawned);
      if (id === null) continue;
      this.activeIds.add(id);
      this.spawned++;
    }
  }

  recordDeath(id: string): boolean {
    if (!this.activeIds.delete(id)) return false;
    this.defeated++;
    return true;
  }

  getProgress(): CampaignWaveProgress {
    return {
      spawned: this.spawned,
      active: this.activeIds.size,
      defeated: this.defeated,
      target: this.defense?.killTarget ?? 0,
    };
  }

  clear(): string[] {
    const active = Array.from(this.activeIds);
    this.defense = null;
    this.spawnAccumulator = 0;
    this.spawned = 0;
    this.defeated = 0;
    this.activeIds.clear();
    return active;
  }

  private chooseEnemyKind(): CampaignEnemyKind {
    const composition = this.defense!.composition;
    const roll = this.random();
    const zombieEnd = composition.zombie;
    const skeletonEnd = zombieEnd + composition.skeleton;
    if (roll < zombieEnd) return 'zombie';
    if (roll < skeletonEnd) return 'skeleton';
    return 'creeper';
  }
}
