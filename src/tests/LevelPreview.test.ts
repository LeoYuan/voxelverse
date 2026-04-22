import { describe, expect, it } from 'vitest';
import { getLevelPreviewLayout } from '../tutorial/levelPreview';

describe('getLevelPreviewLayout', () => {
  it('returns an empty layout for empty previews', () => {
    expect(getLevelPreviewLayout([])).toEqual({
      width: 0,
      height: 0,
      blocks: [],
    });
  });

  it('normalizes block positions into a positive preview canvas', () => {
    const layout = getLevelPreviewLayout([
      { x: 0, y: 0, z: 0, color: 0xff0000 },
      { x: 1, y: 0, z: 0, color: 0x00ff00 },
      { x: 0, y: 1, z: 0, color: 0x0000ff },
    ]);

    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
    for (const block of layout.blocks) {
      expect(block.left).toBeGreaterThanOrEqual(0);
      expect(block.top).toBeGreaterThanOrEqual(0);
    }
  });

  it('sorts deeper blocks behind later blocks for stable stacking', () => {
    const layout = getLevelPreviewLayout([
      { x: 0, y: 0, z: 0, color: 0xff0000 },
      { x: 0, y: 1, z: 0, color: 0x00ff00 },
      { x: 1, y: 0, z: 0, color: 0x0000ff },
    ]);

    expect(layout.blocks.map((block) => block.zIndex)).toEqual([1, 2, 3]);
  });
});
