import { expect, test } from '@playwright/test';

test.describe('Survival mode entry', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean((window as any).__voxelverse_test), undefined, { timeout: 60000 });
  });

  test('starts survival mode with an empty inventory by default', async ({ page }) => {
    const result = await page.evaluate(() => {
      const w = (window as any).__voxelverse_test;
      w.startMode('survival', false);
      return {
        survivalMode: w.player.survivalMode,
        skippedLevels: w.levelManager.skipped,
        inventory: w.inventorySummary(),
      };
    });

    expect(result.survivalMode).toBe(true);
    expect(result.skippedLevels).toBe(true);
    expect(result.inventory.every((slot: { blockId: number; count: number }) => slot.blockId === 0 && slot.count === 0)).toBe(true);
  });

  test('can opt into the survival starter kit', async ({ page }) => {
    const result = await page.evaluate(() => {
      const w = (window as any).__voxelverse_test;
      w.startMode('survival', true);
      return {
        survivalMode: w.player.survivalMode,
        inventory: w.inventorySummary(),
      };
    });

    expect(result.survivalMode).toBe(true);
    expect(result.inventory.some((slot: { blockId: number; count: number }) => slot.blockId === 4 && slot.count === 16)).toBe(true);
    expect(result.inventory.some((slot: { blockId: number; count: number }) => slot.blockId === 41 && slot.count === 1)).toBe(true);
  });
});
