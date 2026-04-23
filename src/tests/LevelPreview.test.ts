import { describe, expect, it } from 'vitest';
import { getLevelPreviewLayout } from '../tutorial/levelPreview';

describe('getLevelPreviewLayout', () => {
  it('returns an empty layout for empty previews', () => {
    expect(getLevelPreviewLayout([])).toEqual({
      width: 0,
      height: 0,
      topFaces: [],
      leftFaces: [],
      rightFaces: [],
      ground: [],
    });
  });

  it('normalizes preview polygons into a positive canvas', () => {
    const layout = getLevelPreviewLayout([
      { x: 0, y: 0, z: 0, color: 0xff0000 },
      { x: 1, y: 0, z: 0, color: 0x00ff00 },
      { x: 0, y: 1, z: 0, color: 0x0000ff },
    ]);

    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
    for (const face of [...layout.topFaces, ...layout.leftFaces, ...layout.rightFaces, ...layout.ground]) {
      for (const pair of face.points.split(' ')) {
        const [x, y] = pair.split(',').map(Number);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('creates separate top and side faces for vertical structures', () => {
    const layout = getLevelPreviewLayout([
      { x: 0, y: 0, z: 0, color: 0xff0000 },
      { x: 0, y: 1, z: 0, color: 0x00ff00 },
      { x: 1, y: 0, z: 0, color: 0x0000ff },
    ]);

    expect(layout.topFaces).toHaveLength(3);
    expect(layout.leftFaces).toHaveLength(3);
    expect(layout.rightFaces).toHaveLength(3);
    expect(layout.ground.length).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(layout.width / 2);
  });

  it('uses role metadata to render floor and wall blocks differently', () => {
    const layout = getLevelPreviewLayout([
      { x: 0, y: 0, z: 0, color: 0xb8864b, role: 'floor' },
      { x: 0, y: 1, z: 0, color: 0xb8864b, role: 'wall' },
    ]);

    expect(layout.topFaces[0].fill).not.toBe(layout.topFaces[1].fill);
    expect(layout.leftFaces[0].fill).not.toBe(layout.leftFaces[1].fill);
  });
});
