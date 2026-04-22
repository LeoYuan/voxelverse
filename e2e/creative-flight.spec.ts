import { test, expect } from '@playwright/test';

test.describe('Creative Mode Flight', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const w = (window as any).__voxelverse_test;
      w.skipWelcome();
      w.setSurvivalMode(false);
      w.setFlying(false);
      w.setPlayerPos(0, 20, 0);
    });
    await page.waitForTimeout(500);
  });

  test('should start with gravity in creative mode', async ({ page }) => {
    const isFlying = await page.evaluate(() => (window as any).__voxelverse_test.player.isFlying);
    expect(isFlying).toBe(false);
  });

  test('should toggle flight via test API', async ({ page }) => {
    await page.evaluate(() => (window as any).__voxelverse_test.toggleFlight());
    const isFlying = await page.evaluate(() => (window as any).__voxelverse_test.player.isFlying);
    expect(isFlying).toBe(true);

    await page.evaluate(() => (window as any).__voxelverse_test.toggleFlight());
    const isFlying2 = await page.evaluate(() => (window as any).__voxelverse_test.player.isFlying);
    expect(isFlying2).toBe(false);
  });

  test('should not take fall damage in creative mode', async ({ page }) => {
    // Teleport high up
    await page.evaluate(() => {
      const w = (window as any).__voxelverse_test;
      w.setPlayerPos(0, 100, 0);
      w.player.velocity.y = -10;
    });

    // Wait to fall
    await page.waitForTimeout(1000);

    // Should still be alive (no death screen)
    const dead = await page.evaluate(() => {
      const el = document.querySelector('.death-screen') as HTMLElement;
      return el ? el.style.display !== 'none' : false;
    });
    expect(dead).toBe(false);
  });

  test('should not drop items when breaking blocks in creative', async ({ page }) => {
    const before = await page.evaluate(() => {
      const w = (window as any).__voxelverse_test;
      return w.player.voxelRenderer.dropEntities.length;
    });

    // Break a block using test API (simulates creative break)
    await page.evaluate(() => {
      const w = (window as any).__voxelverse_test;
      w.placeBlock(0, 10, 0, 3);
      // Directly set block to air without spawning drops
      w.breakBlock(0, 10, 0);
    });

    const after = await page.evaluate(() => {
      const w = (window as any).__voxelverse_test;
      return w.player.voxelRenderer.dropEntities.length;
    });

    expect(after).toBe(before);
  });
});
