import { describe, expect, it, vi } from 'vitest';
import type {
  CampaignEnemyKind,
  CampaignReward,
} from '../campaign/CampaignConfig';
import { CampaignManager, type CampaignProgress } from '../campaign/CampaignManager';
import {
  CampaignRuntime,
  type CampaignRuntimeDeps,
} from '../campaign/CampaignRuntime';
import { CampaignWaveController } from '../campaign/CampaignWaveController';

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

function createHarness(options: {
  manager?: CampaignManager;
  evaluate?: () => CampaignProgress;
  addReward?: (reward: CampaignReward) => number;
} = {}) {
  const manager = options.manager ?? new CampaignManager();
  const spawned: Array<{ id: string; kind: CampaignEnemyKind }> = [];
  const cleared: string[][] = [];
  const calls = {
    setDay: vi.fn(),
    setNight: vi.fn(),
    requestSave: vi.fn(),
    evaluateObjective: vi.fn(options.evaluate ?? (() => incomplete)),
    addReward: vi.fn(options.addReward ?? (() => 0)),
  };
  const deps: CampaignRuntimeDeps = {
    evaluateObjective: calls.evaluateObjective,
    getPlacementRevision: () => 20,
    addReward: calls.addReward,
    setDay: calls.setDay,
    setNight: calls.setNight,
    spawnEnemy: kind => {
      const id = `mob-${spawned.length}`;
      spawned.push({ id, kind });
      return id;
    },
    clearEnemies: ids => cleared.push([...ids]),
    requestSave: calls.requestSave,
  };
  const runtime = new CampaignRuntime(
    manager,
    new CampaignWaveController(() => 0.1),
    deps,
  );
  runtime.setActive(true);
  return { runtime, manager, spawned, cleared, calls };
}

function restoreChapterTwoReady(manager: CampaignManager) {
  manager.restore({
    currentChapterIndex: 1,
    phase: 'ready',
    chapterStartRevision: 5,
    defenseTimeRemaining: 0,
    defeatedEnemies: 0,
    claimedChapterIds: ['establish-outpost'],
    endlessWave: 0,
    lastProgress: complete,
  });
}

describe('CampaignRuntime', () => {
  it('evaluates preparation at four times per second', () => {
    const { runtime, calls } = createHarness();

    runtime.tick(0.24);
    expect(calls.evaluateObjective).not.toHaveBeenCalled();

    runtime.tick(0.01);
    expect(calls.evaluateObjective).toHaveBeenCalledTimes(1);

    runtime.tick(0.25);
    expect(calls.evaluateObjective).toHaveBeenCalledTimes(2);
  });

  it('starts a ready defense and switches the world to night', () => {
    const manager = new CampaignManager();
    restoreChapterTwoReady(manager);
    const { runtime, calls } = createHarness({ manager });

    expect(runtime.runReadyAction()).toBe(true);

    expect(manager.getViewState().phase).toBe('defense');
    expect(calls.setNight).toHaveBeenCalledTimes(1);
    expect(calls.requestSave).toHaveBeenCalledTimes(1);
  });

  it('completes a no-defense chapter, grants rewards, and advances', () => {
    const manager = new CampaignManager();
    manager.updatePreparation(complete);
    const { runtime, calls } = createHarness({ manager });

    expect(runtime.runReadyAction()).toBe(true);

    expect(manager.getViewState().chapterNumber).toBe(2);
    expect(manager.getViewState().phase).toBe('preparation');
    expect(calls.addReward).toHaveBeenCalledTimes(2);
    expect(calls.setDay).toHaveBeenCalledTimes(1);
    expect(calls.requestSave).toHaveBeenCalled();
  });

  it('wins a defense only after timer and campaign kills complete', () => {
    const manager = new CampaignManager();
    restoreChapterTwoReady(manager);
    const { runtime, spawned, calls } = createHarness({ manager });
    runtime.runReadyAction();

    runtime.tick(30);
    expect(spawned).toHaveLength(3);
    expect(manager.getViewState().phase).toBe('defense');

    for (const mob of spawned) runtime.recordEnemyDeath(mob.id);
    runtime.tick(0);

    expect(manager.getViewState().chapterNumber).toBe(3);
    expect(manager.getViewState().phase).toBe('preparation');
    expect(calls.setDay).toHaveBeenCalledTimes(1);
    expect(calls.addReward).toHaveBeenCalledTimes(3);
  });

  it('soft-fails a defense by clearing enemies and returning to ready', () => {
    const manager = new CampaignManager();
    restoreChapterTwoReady(manager);
    const { runtime, manager: liveManager, cleared, calls } = createHarness({ manager });
    runtime.runReadyAction();
    runtime.tick(3);

    runtime.failDefense();

    expect(liveManager.getViewState().phase).toBe('ready');
    expect(cleared).toHaveLength(1);
    expect(cleared[0]).toEqual(['mob-0']);
    expect(calls.setDay).toHaveBeenCalledTimes(1);
    expect(calls.requestSave).toHaveBeenCalledTimes(2);
  });

  it('autosaves every ten active seconds', () => {
    const { runtime, calls } = createHarness();
    runtime.tick(9.9);
    expect(calls.requestSave).not.toHaveBeenCalled();

    runtime.tick(0.1);
    expect(calls.requestSave).toHaveBeenCalledTimes(1);

    runtime.setActive(false);
    runtime.tick(20);
    expect(calls.requestSave).toHaveBeenCalledTimes(1);
  });

  it('retains overflow rewards and retries them after restore', () => {
    let hasSpace = false;
    const manager = new CampaignManager();
    manager.updatePreparation(complete);
    const first = createHarness({
      manager,
      addReward: reward => hasSpace ? 0 : reward.count,
    });

    first.runtime.runReadyAction();
    expect(first.runtime.getPendingRewards()).toHaveLength(2);

    const savedPending = first.runtime.getPendingRewards();
    const second = createHarness({
      addReward: reward => hasSpace ? 0 : reward.count,
    });
    second.runtime.restorePendingRewards(savedPending);
    hasSpace = true;
    second.runtime.tick(0.25);

    expect(second.runtime.getPendingRewards()).toEqual([]);
    expect(second.calls.addReward).toHaveBeenCalledTimes(2);
  });
});
