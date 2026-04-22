import { describe, expect, it } from 'vitest';
import { distanceBetween, getInitialSceneLayout } from '../world/initialSceneLayout';

describe('InitialSceneLayout', () => {
  it('places spawn at the center of the guided route', () => {
    const layout = getInitialSceneLayout();
    expect(layout.spawn).toEqual({ x: 0, z: 0 });
  });

  it('places the material node closest to spawn', () => {
    const layout = getInitialSceneLayout();

    const materialDistance = distanceBetween(layout.spawn, layout.materialPoint);
    const buildingDistance = distanceBetween(layout.spawn, layout.buildingPoint);
    const utilityDistance = distanceBetween(layout.spawn, layout.utilityPoint);
    const rewardDistance = distanceBetween(layout.spawn, layout.rewardPoint);

    expect(materialDistance).toBeLessThan(buildingDistance);
    expect(materialDistance).toBeLessThan(utilityDistance);
    expect(materialDistance).toBeLessThan(rewardDistance);
  });

  it('places the building point after the material point in the route', () => {
    const layout = getInitialSceneLayout();
    expect(distanceBetween(layout.spawn, layout.buildingPoint)).toBeGreaterThan(
      distanceBetween(layout.spawn, layout.materialPoint)
    );
  });

  it('keeps the reward landmark farther than the utility point', () => {
    const layout = getInitialSceneLayout();
    expect(distanceBetween(layout.spawn, layout.rewardPoint)).toBeGreaterThan(
      distanceBetween(layout.spawn, layout.utilityPoint)
    );
  });

  it('connects spawn and the guided nodes with a closed route', () => {
    const layout = getInitialSceneLayout();
    expect(layout.paths).toHaveLength(5);
    expect(layout.paths[0]).toEqual({ from: layout.spawn, to: layout.materialPoint });
    expect(layout.paths[4]).toEqual({ from: layout.rewardPoint, to: layout.spawn });
  });

  it('aims the spawn view toward the first material destination', () => {
    const layout = getInitialSceneLayout();
    expect(layout.spawnLookTarget).toEqual(layout.materialPoint);
  });

  it('uses a tall reward beacon so the landmark stays readable from afar', () => {
    const layout = getInitialSceneLayout();
    expect(layout.rewardBeaconHeight).toBeGreaterThanOrEqual(9);
  });
});
