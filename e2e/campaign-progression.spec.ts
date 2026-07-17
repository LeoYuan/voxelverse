import { expect, test, type Page } from '@playwright/test';

async function waitForGame(page: Page) {
  await page.waitForFunction(() => Boolean((window as any).__voxelverse_test));
}

async function startCampaign(page: Page) {
  await page.evaluate(() => (window as any).__voxelverse_test.startCampaign());
}

async function buildChapterOneShelter(page: Page) {
  await page.evaluate(() => {
    const game = (window as any).__voxelverse_test;
    for (let x = 0; x < 3; x++) {
      for (let z = 0; z < 3; z++) {
        game.placeBlock(x, 10, z, 10);
      }
    }
    const walls = [
      [0, 0], [1, 0], [2, 0],
      [0, 1], [2, 1],
      [0, 2], [2, 2],
    ];
    for (const [x, z] of walls) {
      game.placeBlock(x, 11, z, 3);
    }
    game.tickCampaign(0.25);
  });
}

test.describe('Persistent campaign progression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForGame(page);
  });

  test('defaults the start menu to the base campaign', async ({ page }) => {
    const campaignCard = page.locator('.mode-card[data-mode="campaign"]');
    await expect(campaignCard).toHaveClass(/selected/);
    await expect(campaignCard).toContainText('基地战役');
  });

  test('starts chapter one and advances after completing the shelter', async ({ page }) => {
    await startCampaign(page);

    await expect(page.locator('.campaign-hud')).toBeVisible();
    await expect(page.locator('.campaign-hud__title')).toHaveText('建立据点');

    await buildChapterOneShelter(page);
    await expect(page.locator('.campaign-hud__action')).toContainText('完成建设');

    const result = await page.evaluate(() => {
      const game = (window as any).__voxelverse_test;
      const first = game.runCampaignAction();
      const second = game.runCampaignAction();
      return {
        first,
        second,
        state: game.getCampaignState(),
        stonePickaxes: game.player.inventory.countOf(42),
      };
    });

    expect(result.first).toBe(true);
    expect(result.second).toBe(false);
    expect(result.state.campaign.chapterNumber).toBe(2);
    expect(result.state.campaign.phase).toBe('preparation');
    expect(result.stonePickaxes).toBe(1);
  });

  test('restores the campaign chapter and player-built blocks after reload', async ({ page }) => {
    await startCampaign(page);
    await buildChapterOneShelter(page);
    await page.evaluate(() => {
      const game = (window as any).__voxelverse_test;
      game.runCampaignAction();
      game.saveCampaign();
    });

    await page.reload();
    await waitForGame(page);
    await startCampaign(page);

    const restored = await page.evaluate(() => {
      const game = (window as any).__voxelverse_test;
      return {
        state: game.getCampaignState(),
        floorBlock: game.chunkManager.getBlock(0, 10, 0),
        wallBlock: game.chunkManager.getBlock(0, 11, 0),
      };
    });

    expect(restored.state.campaign.chapterNumber).toBe(2);
    expect(restored.floorBlock).toBe(10);
    expect(restored.wallBlock).toBe(3);
  });

  test('soft-fails a defense without removing the base', async ({ page }) => {
    await startCampaign(page);
    await buildChapterOneShelter(page);
    await page.evaluate(() => {
      const game = (window as any).__voxelverse_test;
      game.runCampaignAction();
      game.placeBlock(4, 10, 4, 23);
      game.placeBlock(5, 10, 4, 24);
      game.placeBlock(6, 12, 6, 3);
      game.tickCampaign(0.25);
      game.runCampaignAction();
      game.playerStats.damage(999);
    });

    await page.waitForFunction(() => {
      const game = (window as any).__voxelverse_test;
      return game.getCampaignState().campaign.phase === 'ready';
    });

    const result = await page.evaluate(() => {
      const game = (window as any).__voxelverse_test;
      return {
        state: game.getCampaignState(),
        retainedBlock: game.chunkManager.getBlock(6, 12, 6),
        health: game.playerStats.health,
      };
    });

    expect(result.state.campaign.chapterNumber).toBe(2);
    expect(result.state.campaign.phase).toBe('ready');
    expect(result.retainedBlock).toBe(3);
    expect(result.health).toBeGreaterThan(0);
  });
});
