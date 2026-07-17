import { test, expect } from '@playwright/test';

test.describe('Tutorial Level Progression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => Boolean((window as any).__voxelverse_test));
    // Skip welcome modal and ensure fresh level state
    await page.evaluate(() => {
      const w = (window as any).__voxelverse_test;
      w.skipWelcome();
      w.resetLevels();
    });
  });

  test('Level 1: should complete after placing a player-placed block', async ({ page }) => {
    const title = await page.evaluate(() => (window as any).__voxelverse_test.getLevelTitle());
    expect(title).toBe('第一块方块');

    // Place a block near player
    await page.evaluate(() => {
      const w = (window as any).__voxelverse_test;
      w.placeBlock(0, 18, 0, 3); // stone
    });

    // Move player to trigger check
    await page.evaluate(() => {
      const w = (window as any).__voxelverse_test;
      w.setPlayerPos(0, 20, 0);
    });

    // Wait for game loop to check level
    await page.waitForTimeout(200);

    const complete = await page.evaluate(() => (window as any).__voxelverse_test.isLevelCompleteVisible());
    expect(complete).toBe(true);
  });

  test('Level 2: should complete after stacking 3 blocks', async ({ page }) => {
    // Advance to level 2
    await page.evaluate(() => {
      const w = (window as any).__voxelverse_test;
      w.resetLevels();
      w.levelManager.nextLevel();
      w.updateLevelUI();
    });

    const title = await page.evaluate(() => (window as any).__voxelverse_test.getLevelTitle());
    expect(title).toBe('小小高塔');

    // Stack 3 blocks within py±5 range
    await page.evaluate(() => {
      const w = (window as any).__voxelverse_test;
      w.placeBlock(0, 20, 0, 3);
      w.placeBlock(0, 21, 0, 3);
      w.placeBlock(0, 22, 0, 3);
      w.setPlayerPos(0, 25, 0);
    });

    await page.waitForTimeout(200);

    const complete = await page.evaluate(() => (window as any).__voxelverse_test.isLevelCompleteVisible());
    expect(complete).toBe(true);
  });

  test('Level 3: should complete after building 3x3 platform', async ({ page }) => {
    await page.evaluate(() => {
      const w = (window as any).__voxelverse_test;
      w.resetLevels();
      w.levelManager.nextLevel();
      w.levelManager.nextLevel();
      w.updateLevelUI();
    });

    const title = await page.evaluate(() => (window as any).__voxelverse_test.getLevelTitle());
    expect(title).toBe('小平台');

    // Build 3x3 platform
    await page.evaluate(() => {
      const w = (window as any).__voxelverse_test;
      for (let x = 0; x < 3; x++) {
        for (let z = 0; z < 3; z++) {
          w.placeBlock(x, 18, z, 4); // wood
        }
      }
      w.setPlayerPos(5, 20, 5);
    });

    await page.waitForTimeout(200);

    const complete = await page.evaluate(() => (window as any).__voxelverse_test.isLevelCompleteVisible());
    expect(complete).toBe(true);
  });

  test('Level 4: should complete after building a small house', async ({ page }) => {
    await page.evaluate(() => {
      const w = (window as any).__voxelverse_test;
      w.resetLevels();
      w.levelManager.nextLevel();
      w.levelManager.nextLevel();
      w.levelManager.nextLevel();
      w.updateLevelUI();
    });

    const title = await page.evaluate(() => (window as any).__voxelverse_test.getLevelTitle());
    expect(title).toBe('小房子');

    // Build the current 3x3 floor + seven-wall shelter target
    await page.evaluate(() => {
      const w = (window as any).__voxelverse_test;
      for (let x = 0; x < 3; x++) {
        for (let z = 0; z < 3; z++) {
          w.placeBlock(x, 18, z, 10); // planks
        }
      }
      const walls = [
        [0, 0], [2, 0],
        [0, 1], [2, 1],
        [0, 2], [1, 2], [2, 2],
      ];
      for (const [x, z] of walls) {
        w.placeBlock(x, 19, z, 10);
      }
      w.setPlayerPos(5, 20, 5);
    });

    await page.waitForTimeout(200);

    const complete = await page.evaluate(() => (window as any).__voxelverse_test.isLevelCompleteVisible());
    expect(complete).toBe(true);
  });

  test('should progress through the first four levels', async ({ page }) => {
    // Use direct API calls to avoid pointer-lock popup interactions
    const results = await page.evaluate(() => {
      const w = (window as any).__voxelverse_test;
      w.resetLevels();

      // Level 1
      w.placeBlock(0, 18, 0, 3);
      w.setPlayerPos(0, 20, 0);
      const lvl1 = w.levelManager.check(w.chunkManager, w.player.position);

      w.levelManager.nextLevel();

      // Level 2
      w.placeBlock(0, 20, 0, 3);
      w.placeBlock(0, 21, 0, 3);
      w.placeBlock(0, 22, 0, 3);
      w.setPlayerPos(0, 25, 0);
      const lvl2 = w.levelManager.check(w.chunkManager, w.player.position);

      w.levelManager.nextLevel();

      // Level 3
      for (let x = 0; x < 3; x++) {
        for (let z = 0; z < 3; z++) {
          w.placeBlock(x, 18, z, 4);
        }
      }
      w.setPlayerPos(5, 20, 5);
      const lvl3 = w.levelManager.check(w.chunkManager, w.player.position);

      w.levelManager.nextLevel();

      // Level 4
      for (let x = 0; x < 3; x++) {
        for (let z = 0; z < 3; z++) {
          w.placeBlock(x, 18, z, 10);
        }
      }
      const walls = [
        [0, 0], [2, 0],
        [0, 1], [2, 1],
        [0, 2], [1, 2], [2, 2],
      ];
      for (const [x, z] of walls) {
        w.placeBlock(x, 19, z, 10);
      }
      w.setPlayerPos(5, 20, 5);
      const lvl4 = w.levelManager.check(w.chunkManager, w.player.position);

      w.levelManager.nextLevel();

      return {
        lvl1,
        lvl2,
        lvl3,
        lvl4,
        currentLevel: w.levelManager.currentLevel,
        complete: w.levelManager.isComplete(),
      };
    });

    expect(results.lvl1).toBe(true);
    expect(results.lvl2).toBe(true);
    expect(results.lvl3).toBe(true);
    expect(results.lvl4).toBe(true);
    expect(results.currentLevel).toBe(4);
    expect(results.complete).toBe(false);
  });
});
