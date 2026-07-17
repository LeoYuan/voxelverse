import { expect, test } from '@playwright/test';

test.describe('Creative Mode Flight', () => {
  test.setTimeout(90000);

  test('handles creative flight and block breaking through the test API', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean((window as any).__voxelverse_test), undefined, { timeout: 60000 });

    const result = await page.evaluate(async () => {
      const w = (window as any).__voxelverse_test;
      w.skipWelcome();
      w.setSurvivalMode(false);
      w.setFlying(false);
      w.setPlayerPos(0, 20, 0);

      const startsGrounded = w.player.isFlying === false;

      w.toggleFlight();
      const toggledOn = w.player.isFlying === true;
      w.toggleFlight();
      const toggledOff = w.player.isFlying === false;

      w.setPlayerPos(0, 100, 0);
      w.player.velocity.y = -10;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const deathScreen = document.querySelector('.death-screen') as HTMLElement | null;
      const noFallDeath = deathScreen ? deathScreen.style.display === 'none' : true;

      const beforeDrops = w.player.voxelRenderer.dropEntities.length;
      w.placeBlock(0, 10, 0, 3);
      w.breakBlock(0, 10, 0);
      const afterDrops = w.player.voxelRenderer.dropEntities.length;

      return {
        startsGrounded,
        toggledOn,
        toggledOff,
        noFallDeath,
        noCreativeDrops: afterDrops === beforeDrops,
      };
    });

    expect(result).toEqual({
      startsGrounded: true,
      toggledOn: true,
      toggledOff: true,
      noFallDeath: true,
      noCreativeDrops: true,
    });
  });
});
