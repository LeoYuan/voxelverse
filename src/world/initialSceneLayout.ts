export type ScenePoint = {
  x: number;
  z: number;
};

export type ScenePath = {
  from: ScenePoint;
  to: ScenePoint;
};

export type InitialSceneLayout = {
  spawn: ScenePoint;
  materialPoint: ScenePoint;
  buildingPoint: ScenePoint;
  utilityPoint: ScenePoint;
  rewardPoint: ScenePoint;
  spawnLookTarget: ScenePoint;
  rewardBeaconHeight: number;
  paths: ScenePath[];
};

function makePoint(x: number, z: number): ScenePoint {
  return { x, z };
}

export function distanceBetween(a: ScenePoint, b: ScenePoint): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function getInitialSceneLayout(): InitialSceneLayout {
  const spawn = makePoint(0, 0);
  const materialPoint = makePoint(-4, -9);
  const buildingPoint = makePoint(9, -7);
  const utilityPoint = makePoint(11, 7);
  const rewardPoint = makePoint(-12, 12);

  return {
    spawn,
    materialPoint,
    buildingPoint,
    utilityPoint,
    rewardPoint,
    spawnLookTarget: rewardPoint,
    rewardBeaconHeight: 10,
    paths: [
      { from: spawn, to: materialPoint },
      { from: materialPoint, to: buildingPoint },
      { from: buildingPoint, to: utilityPoint },
      { from: utilityPoint, to: rewardPoint },
      { from: rewardPoint, to: spawn },
    ],
  };
}
