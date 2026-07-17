import {
  CAMPAIGN_CHAPTERS,
  getEndlessDefense,
  getEndlessRewards,
  type CampaignChapter,
  type CampaignDefense,
  type CampaignObjective,
  type CampaignReward,
} from './CampaignConfig';

export type CampaignPhase = 'preparation' | 'ready' | 'defense' | 'complete';

export interface CampaignProgress {
  objectiveCurrent: number;
  objectiveTarget: number;
  requirementsMet: boolean;
}

export interface CampaignSnapshot {
  currentChapterIndex: number;
  phase: CampaignPhase;
  chapterStartRevision: number;
  defenseTimeRemaining: number;
  defeatedEnemies: number;
  claimedChapterIds: string[];
  endlessWave: number;
  lastProgress: CampaignProgress;
}

export interface CampaignViewState {
  phase: CampaignPhase;
  chapterNumber: number;
  chapterId: string;
  title: string;
  objectiveText: string;
  rewardText: string;
  objectiveCurrent: number;
  objectiveTarget: number;
  requirementsMet: boolean;
  defenseTimeRemaining: number;
  defeatedEnemies: number;
  killTarget: number;
  actionLabel: string | null;
  isEndless: boolean;
  endlessWave: number;
}

const EMPTY_PROGRESS: CampaignProgress = {
  objectiveCurrent: 0,
  objectiveTarget: 1,
  requirementsMet: false,
};

export class CampaignManager {
  private currentChapterIndex = 0;
  private phase: CampaignPhase = 'preparation';
  private chapterStartRevision = 0;
  private defenseTimeRemaining = 0;
  private defeatedEnemies = 0;
  private claimedChapterIds = new Set<string>();
  private endlessWave = 0;
  private lastProgress: CampaignProgress = { ...EMPTY_PROGRESS };

  updatePreparation(progress: CampaignProgress): boolean {
    if (this.phase !== 'preparation') return false;
    this.lastProgress = { ...progress };
    const complete =
      progress.objectiveCurrent >= progress.objectiveTarget &&
      progress.requirementsMet;
    if (complete) this.phase = 'ready';
    return complete;
  }

  startReadyAction(): 'complete' | 'defense' | 'rejected' {
    if (this.phase !== 'ready') return 'rejected';
    const defense = this.getCurrentDefense();
    if (!defense) {
      this.phase = 'complete';
      return 'complete';
    }

    this.phase = 'defense';
    this.defenseTimeRemaining = defense.duration;
    this.defeatedEnemies = 0;
    return 'defense';
  }

  recordKill() {
    if (this.phase !== 'defense') return;
    this.defeatedEnemies++;
  }

  tickDefense(dt: number): boolean {
    if (this.phase !== 'defense') return false;
    this.defenseTimeRemaining = Math.max(0, this.defenseTimeRemaining - Math.max(0, dt));
    const defense = this.getCurrentDefense();
    if (
      defense &&
      this.defenseTimeRemaining <= 0 &&
      this.defeatedEnemies >= defense.killTarget
    ) {
      this.phase = 'complete';
      return true;
    }
    return false;
  }

  failDefense() {
    if (this.phase !== 'defense') return;
    this.phase = 'ready';
    this.defenseTimeRemaining = 0;
    this.defeatedEnemies = 0;
  }

  claimCompletion(currentPlacementRevision: number): CampaignReward[] {
    if (this.phase !== 'complete') return [];

    const completionId = this.getCompletionId();
    const rewards = this.claimedChapterIds.has(completionId)
      ? []
      : this.getCurrentRewards().map(reward => ({ ...reward }));
    this.claimedChapterIds.add(completionId);
    this.chapterStartRevision = currentPlacementRevision;
    this.defenseTimeRemaining = 0;
    this.defeatedEnemies = 0;
    this.lastProgress = { ...EMPTY_PROGRESS };

    if (this.isEndless()) {
      this.endlessWave = Math.max(1, this.endlessWave) + 1;
      this.phase = 'ready';
    } else {
      this.currentChapterIndex++;
      if (this.currentChapterIndex >= CAMPAIGN_CHAPTERS.length) {
        this.endlessWave = 1;
        this.phase = 'ready';
      } else {
        this.phase = 'preparation';
      }
    }
    return rewards;
  }

  getViewState(): CampaignViewState {
    const chapter = this.getCurrentChapter();
    const endless = this.isEndless();
    const defense = this.getCurrentDefense();
    const actionLabel = this.getActionLabel(defense);

    return {
      phase: this.phase,
      chapterNumber: endless ? CAMPAIGN_CHAPTERS.length : this.currentChapterIndex + 1,
      chapterId: endless ? `endless-${this.endlessWave}` : chapter!.id,
      title: endless ? `无尽守夜 · 第 ${this.endlessWave} 波` : chapter!.title,
      objectiveText: endless ? '整备基地，准备迎接更强的敌人。' : chapter!.objectiveText,
      rewardText: endless ? '圆石与熟牛肉' : chapter!.rewardText,
      objectiveCurrent: this.lastProgress.objectiveCurrent,
      objectiveTarget: this.lastProgress.objectiveTarget,
      requirementsMet: this.lastProgress.requirementsMet,
      defenseTimeRemaining: this.defenseTimeRemaining,
      defeatedEnemies: this.defeatedEnemies,
      killTarget: defense?.killTarget ?? 0,
      actionLabel,
      isEndless: endless,
      endlessWave: endless ? this.endlessWave : 0,
    };
  }

  getCurrentObjective(): CampaignObjective | null {
    return this.getCurrentChapter()?.objective ?? null;
  }

  getCurrentDefense(): CampaignDefense | undefined {
    if (this.isEndless()) return getEndlessDefense(this.endlessWave);
    return this.getCurrentChapter()?.defense;
  }

  getChapterStartRevision(): number {
    return this.chapterStartRevision;
  }

  snapshot(): CampaignSnapshot {
    return {
      currentChapterIndex: this.currentChapterIndex,
      phase: this.phase,
      chapterStartRevision: this.chapterStartRevision,
      defenseTimeRemaining: this.defenseTimeRemaining,
      defeatedEnemies: this.defeatedEnemies,
      claimedChapterIds: Array.from(this.claimedChapterIds),
      endlessWave: this.endlessWave,
      lastProgress: { ...this.lastProgress },
    };
  }

  restore(snapshot: CampaignSnapshot) {
    this.currentChapterIndex = Math.max(0, Math.floor(snapshot.currentChapterIndex));
    this.chapterStartRevision = Math.max(0, Math.floor(snapshot.chapterStartRevision));
    this.claimedChapterIds = new Set(snapshot.claimedChapterIds);
    this.endlessWave = Math.max(
      this.currentChapterIndex >= CAMPAIGN_CHAPTERS.length ? 1 : 0,
      Math.floor(snapshot.endlessWave),
    );
    this.lastProgress = { ...snapshot.lastProgress };

    if (snapshot.phase === 'defense') {
      this.phase = 'ready';
      this.defenseTimeRemaining = 0;
      this.defeatedEnemies = 0;
    } else {
      this.phase = snapshot.phase;
      this.defenseTimeRemaining = Math.max(0, snapshot.defenseTimeRemaining);
      this.defeatedEnemies = Math.max(0, Math.floor(snapshot.defeatedEnemies));
    }
  }

  private isEndless(): boolean {
    return this.currentChapterIndex >= CAMPAIGN_CHAPTERS.length;
  }

  private getCurrentChapter(): CampaignChapter | null {
    return CAMPAIGN_CHAPTERS[this.currentChapterIndex] ?? null;
  }

  private getCurrentRewards(): CampaignReward[] {
    if (this.isEndless()) return getEndlessRewards(this.endlessWave);
    return this.getCurrentChapter()?.rewards ?? [];
  }

  private getCompletionId(): string {
    return this.isEndless()
      ? `endless-${this.endlessWave}`
      : this.getCurrentChapter()!.id;
  }

  private getActionLabel(defense: CampaignDefense | undefined): string | null {
    if (this.phase === 'ready') {
      if (this.isEndless()) return `开始第 ${this.endlessWave} 波`;
      return defense ? '开始守夜' : '完成建设';
    }
    if (this.phase === 'complete') return '领取奖励';
    return null;
  }
}
