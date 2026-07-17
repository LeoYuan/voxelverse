import type {
  CampaignEnemyKind,
  CampaignReward,
} from './CampaignConfig';
import {
  CampaignManager,
  type CampaignProgress,
} from './CampaignManager';
import { CampaignWaveController } from './CampaignWaveController';

export interface CampaignRuntimeDeps {
  evaluateObjective: () => CampaignProgress;
  getPlacementRevision: () => number;
  addReward: (reward: CampaignReward) => number;
  setDay: () => void;
  setNight: () => void;
  spawnEnemy: (kind: CampaignEnemyKind) => string | null;
  clearEnemies: (ids: string[]) => void;
  requestSave: () => void;
}

export interface CampaignRuntimeViewModel {
  visible: boolean;
  eyebrow: string;
  title: string;
  objective: string;
  progressLabel: string;
  progressRatio: number;
  reward: string;
  actionLabel: string | null;
  defenseLabel: string | null;
}

const OBJECTIVE_INTERVAL = 0.25;
const AUTOSAVE_INTERVAL = 10;

export class CampaignRuntime {
  private readonly manager: CampaignManager;
  private readonly wave: CampaignWaveController;
  private readonly deps: CampaignRuntimeDeps;
  private active = false;
  private objectiveAccumulator = 0;
  private autosaveAccumulator = 0;
  private pendingRewards: CampaignReward[] = [];

  constructor(
    manager: CampaignManager,
    wave: CampaignWaveController,
    deps: CampaignRuntimeDeps,
  ) {
    this.manager = manager;
    this.wave = wave;
    this.deps = deps;
  }

  tick(dt: number) {
    if (!this.active) return;
    const elapsed = Math.max(0, dt);
    this.flushPendingRewards();

    const phase = this.manager.getViewState().phase;
    if (phase === 'preparation') {
      this.objectiveAccumulator += elapsed;
      if (this.objectiveAccumulator >= OBJECTIVE_INTERVAL) {
        this.objectiveAccumulator %= OBJECTIVE_INTERVAL;
        this.manager.updatePreparation(this.deps.evaluateObjective());
      }
    } else if (phase === 'defense') {
      this.wave.tick(elapsed, kind => this.deps.spawnEnemy(kind));
      if (this.manager.tickDefense(elapsed)) {
        this.completeCurrentStage();
      }
    }

    this.autosaveAccumulator += elapsed;
    if (this.autosaveAccumulator >= AUTOSAVE_INTERVAL) {
      this.autosaveAccumulator %= AUTOSAVE_INTERVAL;
      this.deps.requestSave();
    }
  }

  runReadyAction(): boolean {
    if (!this.active) return false;
    const result = this.manager.startReadyAction();
    if (result === 'rejected') return false;
    if (result === 'complete') {
      this.completeCurrentStage();
      return true;
    }

    const defense = this.manager.getCurrentDefense();
    if (!defense) return false;
    this.wave.start(defense);
    this.deps.setNight();
    this.deps.requestSave();
    return true;
  }

  recordEnemyDeath(id: string) {
    if (!this.wave.recordDeath(id)) return;
    this.manager.recordKill();
  }

  failDefense() {
    if (this.manager.getViewState().phase !== 'defense') return;
    const activeIds = this.wave.clear();
    this.deps.clearEnemies(activeIds);
    this.manager.failDefense();
    this.deps.setDay();
    this.deps.requestSave();
  }

  setActive(active: boolean) {
    if (this.active === active) return;
    this.active = active;
    this.objectiveAccumulator = 0;
    this.autosaveAccumulator = 0;
    if (!active) {
      const activeIds = this.wave.clear();
      if (activeIds.length > 0) this.deps.clearEnemies(activeIds);
      if (this.manager.getViewState().phase === 'defense') {
        this.manager.failDefense();
        this.deps.setDay();
      }
    }
  }

  getViewModel(): CampaignRuntimeViewModel {
    const view = this.manager.getViewState();
    const target = Math.max(1, view.objectiveTarget);
    const progressRatio =
      view.phase === 'defense' && view.killTarget > 0
        ? Math.min(1, view.defeatedEnemies / view.killTarget)
        : Math.min(1, view.objectiveCurrent / target);
    const progressLabel = view.phase === 'defense'
      ? `击败 ${view.defeatedEnemies}/${view.killTarget}`
      : `${view.objectiveCurrent}/${view.objectiveTarget}`;
    const defenseLabel = view.phase === 'defense'
      ? `剩余 ${Math.ceil(view.defenseTimeRemaining)} 秒 · 击败 ${view.defeatedEnemies}/${view.killTarget}`
      : null;

    return {
      visible: this.active,
      eyebrow: view.isEndless ? '无尽守夜' : `基地战役 · 第 ${view.chapterNumber} 章`,
      title: view.title,
      objective: view.objectiveText,
      progressLabel,
      progressRatio,
      reward: `奖励：${view.rewardText}`,
      actionLabel: view.actionLabel,
      defenseLabel,
    };
  }

  getPendingRewards(): CampaignReward[] {
    return this.pendingRewards.map(reward => ({ ...reward }));
  }

  restorePendingRewards(rewards: CampaignReward[]) {
    this.pendingRewards = rewards.map(reward => ({ ...reward }));
  }

  private completeCurrentStage() {
    const activeIds = this.wave.clear();
    this.deps.clearEnemies(activeIds);
    this.deps.setDay();
    const rewards = this.manager.claimCompletion(this.deps.getPlacementRevision());
    this.pendingRewards.push(...rewards.map(reward => ({ ...reward })));
    this.flushPendingRewards();
    this.deps.requestSave();
  }

  private flushPendingRewards() {
    if (this.pendingRewards.length === 0) return;

    const nextPending: CampaignReward[] = [];
    let changed = false;
    for (const reward of this.pendingRewards) {
      const overflow = this.deps.addReward({ ...reward });
      if (overflow > 0) {
        nextPending.push({ blockId: reward.blockId, count: overflow });
      }
      if (overflow !== reward.count) changed = true;
    }
    this.pendingRewards = nextPending;
    if (changed) this.deps.requestSave();
  }
}
