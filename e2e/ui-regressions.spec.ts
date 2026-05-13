import { expect, test } from '@playwright/test';

test.describe('UI regressions', () => {
  test.setTimeout(90000);

  test('hides pointer-lock hint behind the start menu and surfaces the ALU entry', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean((window as any).__voxelverse_test), undefined, { timeout: 60000 });

    await expect(page.locator('#pointer-lock-hint')).toBeHidden();

    await page.evaluate(() => {
      const w = (window as any).__voxelverse_test;
      w.startMode('creative');
      document.getElementById('settings-btn')?.click();
    });

    await expect(page.locator('#arithmetic-toggle')).toBeVisible();
    await expect(page.locator('.creative-tool-hint')).toContainText('ALU');
  });
});
