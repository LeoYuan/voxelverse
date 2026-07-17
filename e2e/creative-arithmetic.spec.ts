import { expect, test } from '@playwright/test';

test.describe('Creative arithmetic visualizer', () => {
  test.setTimeout(90000);

  test('visualizes 8-bit arithmetic traces through the creative test API', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean((window as any).__voxelverse_test), undefined, { timeout: 60000 });

    const result = await page.evaluate(() => {
      const w = (window as any).__voxelverse_test;
      w.skipWelcome();
      w.startMode('creative');

      w.setArithmeticInputs(200, 12);
      w.setArithmeticOperation('div');
      w.setArithmeticStep(7);
      const division = w.getArithmeticTraceState();

      w.setArithmeticInputs(250, 10);
      w.setArithmeticOperation('add');
      const addition = w.getArithmeticTraceState();

      w.setPlayerPos(0, 12, 0);
      w.buildArithmeticComponents();
      const outputBits = Array.from({ length: 8 }, (_, index) => w.chunkManager.getBlock(3 + index, 11, 9));

      return {
        divisionResult: division.trace.result,
        divisionStatus: division.status,
        divisionNote: division.note,
        additionResult: addition.trace.result,
        additionOverflow: addition.trace.overflow,
        additionStatus: addition.status,
        outputBits,
      };
    });

    expect(result.divisionResult).toBe(16);
    expect(result.divisionStatus).toContain('00010000');
    expect(result.divisionNote).toContain('bit 0');
    expect(result.additionResult).toBe(4);
    expect(result.additionOverflow).toBe(true);
    expect(result.additionStatus).toContain('overflow');
    expect(result.outputBits.filter((blockId: number) => blockId === 54)).toHaveLength(1);
  });
});
