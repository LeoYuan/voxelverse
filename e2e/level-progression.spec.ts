import { expect, test } from '@playwright/test';

test.describe('Tutorial Level Progression', () => {
  test.setTimeout(90000);

  test('validates the first four tutorial levels in one loaded world', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean((window as any).__voxelverse_test), undefined, { timeout: 60000 });

    const results = await page.evaluate(() => {
      const w = (window as any).__voxelverse_test;
      w.skipWelcome();
      w.resetLevels();

      const level1Title = w.getLevelTitle();
      w.placeBlock(0, 18, 0, 3);
      w.setPlayerPos(0, 20, 0);
      const lvl1 = w.levelManager.check(w.chunkManager, w.player.position);

      w.levelManager.nextLevel();
      w.updateLevelUI();
      const level2Title = w.getLevelTitle();
      w.placeBlock(0, 20, 0, 3);
      w.placeBlock(0, 21, 0, 3);
      w.placeBlock(0, 22, 0, 3);
      w.setPlayerPos(0, 25, 0);
      const lvl2 = w.levelManager.check(w.chunkManager, w.player.position);

      w.levelManager.nextLevel();
      w.updateLevelUI();
      const level3Title = w.getLevelTitle();
      for (let x = 0; x < 3; x++) {
        for (let z = 0; z < 3; z++) {
          w.placeBlock(x, 18, z, 4);
        }
      }
      w.setPlayerPos(5, 20, 5);
      const lvl3 = w.levelManager.check(w.chunkManager, w.player.position);

      w.levelManager.nextLevel();
      w.updateLevelUI();
      const level4Title = w.getLevelTitle();
      const level4 = w.levelManager.current;
      for (const block of level4.targetBlocks) {
        w.placeBlock(block.x, block.y + 18, block.z, 10);
      }
      w.setPlayerPos(5, 20, 5);
      const lvl4 = w.levelManager.check(w.chunkManager, w.player.position);

      w.levelManager.nextLevel();

      return {
        level1Title,
        level2Title,
        level3Title,
        level4Title,
        lvl1,
        lvl2,
        lvl3,
        lvl4,
        currentLevel: w.levelManager.currentLevel,
      };
    });

    expect(results).toMatchObject({
      level1Title: '第一块方块',
      level2Title: '小小高塔',
      level3Title: '小平台',
      level4Title: '小房子',
      lvl1: true,
      lvl2: true,
      lvl3: true,
      lvl4: true,
      currentLevel: 4,
    });
  });
});
