import { describe, expect, it } from 'vitest';
import { CAMPAIGN_CHAPTERS } from '../campaign/CampaignConfig';
import {
  CampaignManager,
  type CampaignProgress,
  type CampaignSnapshot,
} from '../campaign/CampaignManager';

const incomplete: CampaignProgress = {
  objectiveCurrent: 0,
  objectiveTarget: 1,
  requirementsMet: false,
};

const complete: CampaignProgress = {
  objectiveCurrent: 1,
  objectiveTarget: 1,
  requirementsMet: true,
};

describe('CampaignManager', () => {
  it('defines five authored chapters with explicit objectives and rewards', () => {
    expect(CAMPAIGN_CHAPTERS).toHaveLength(5);
    for (const chapter of CAMPAIGN_CHAPTERS) {
      expect(chapter.id).toBeTruthy();
      expect(chapter.objective).toBeTruthy();
      expect(chapter.rewards.length).toBeGreaterThan(0);
      expect(chapter.rewardText).toBeTruthy();
    }
  });

  it('only marks preparation ready after all objective requirements are met', () => {
    const manager = new CampaignManager();

    expect(manager.updatePreparation(incomplete)).toBe(false);
    expect(manager.getViewState().phase).toBe('preparation');

    expect(manager.updatePreparation(complete)).toBe(true);
    expect(manager.getViewState().phase).toBe('ready');
  });

  it('completes the first chapter ready action without starting a defense', () => {
    const manager = new CampaignManager();
    manager.updatePreparation(complete);

    expect(manager.startReadyAction()).toBe('complete');
    expect(manager.getViewState().phase).toBe('complete');
  });

  it('rejects defense start before preparation is ready', () => {
    const manager = new CampaignManager();
    manager.restore({
      currentChapterIndex: 1,
      phase: 'preparation',
      chapterStartRevision: 0,
      defenseTimeRemaining: 0,
      defeatedEnemies: 0,
      claimedChapterIds: [],
      endlessWave: 0,
      lastProgress: incomplete,
    });

    expect(manager.startReadyAction()).toBe('rejected');
    expect(manager.getViewState().phase).toBe('preparation');
  });

  it('requires both elapsed defense time and enough kills', () => {
    const manager = new CampaignManager();
    manager.restore({
      currentChapterIndex: 1,
      phase: 'preparation',
      chapterStartRevision: 0,
      defenseTimeRemaining: 0,
      defeatedEnemies: 0,
      claimedChapterIds: ['establish-outpost'],
      endlessWave: 0,
      lastProgress: incomplete,
    });
    manager.updatePreparation(complete);

    expect(manager.startReadyAction()).toBe('defense');
    expect(manager.tickDefense(30)).toBe(false);
    expect(manager.getViewState().phase).toBe('defense');

    manager.recordKill();
    manager.recordKill();
    manager.recordKill();

    expect(manager.tickDefense(0)).toBe(true);
    expect(manager.getViewState().phase).toBe('complete');
  });

  it('returns a failed defense to ready without advancing', () => {
    const manager = new CampaignManager();
    manager.restore({
      currentChapterIndex: 1,
      phase: 'ready',
      chapterStartRevision: 8,
      defenseTimeRemaining: 0,
      defeatedEnemies: 0,
      claimedChapterIds: ['establish-outpost'],
      endlessWave: 0,
      lastProgress: complete,
    });
    manager.startReadyAction();
    manager.recordKill();

    manager.failDefense();

    const view = manager.getViewState();
    expect(view.phase).toBe('ready');
    expect(view.chapterNumber).toBe(2);
    expect(view.defeatedEnemies).toBe(0);
  });

  it('grants a chapter reward once and advances with a new placement baseline', () => {
    const manager = new CampaignManager();
    manager.updatePreparation(complete);
    manager.startReadyAction();

    const rewards = manager.claimCompletion(12);
    const duplicate = manager.claimCompletion(20);

    expect(rewards).toEqual(CAMPAIGN_CHAPTERS[0].rewards);
    expect(duplicate).toEqual([]);
    expect(manager.getViewState().chapterNumber).toBe(2);
    expect(manager.getViewState().phase).toBe('preparation');
    expect(manager.snapshot().chapterStartRevision).toBe(12);
    expect(manager.snapshot().claimedChapterIds).toContain('establish-outpost');
  });

  it('advances from the fifth chapter into endless defense', () => {
    const manager = new CampaignManager();
    const fifth = CAMPAIGN_CHAPTERS[4];
    manager.restore({
      currentChapterIndex: 4,
      phase: 'complete',
      chapterStartRevision: 40,
      defenseTimeRemaining: 0,
      defeatedEnemies: fifth.defense!.killTarget,
      claimedChapterIds: CAMPAIGN_CHAPTERS.slice(0, 4).map(chapter => chapter.id),
      endlessWave: 0,
      lastProgress: complete,
    });

    expect(manager.claimCompletion(55)).toEqual(fifth.rewards);

    const view = manager.getViewState();
    expect(view.isEndless).toBe(true);
    expect(view.endlessWave).toBe(1);
    expect(view.phase).toBe('ready');
    expect(view.actionLabel).toContain('第 1 波');
  });

  it('normalizes a saved active defense back to ready', () => {
    const manager = new CampaignManager();
    const snapshot: CampaignSnapshot = {
      currentChapterIndex: 2,
      phase: 'defense',
      chapterStartRevision: 10,
      defenseTimeRemaining: 20,
      defeatedEnemies: 2,
      claimedChapterIds: ['establish-outpost', 'light-the-hearth'],
      endlessWave: 0,
      lastProgress: complete,
    };

    manager.restore(snapshot);

    const view = manager.getViewState();
    expect(view.phase).toBe('ready');
    expect(view.defenseTimeRemaining).toBe(0);
    expect(view.defeatedEnemies).toBe(0);
  });
});
