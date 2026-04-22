export type HammerPose = {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
};

export const HAMMER_IDLE_POSE: HammerPose = {
  position: { x: 0.11, y: -0.19, z: -0.16 },
  rotation: { x: -0.34, y: -0.04, z: 0.1 },
};

const HAMMER_SWING_START_POSE: HammerPose = {
  position: { x: 0.19, y: -0.08, z: -0.16 },
  rotation: { x: -1.02, y: 0.04, z: 0.24 },
};

const HAMMER_SWING_REBOUND_POSE: HammerPose = {
  position: { x: 0.08, y: -0.22, z: -0.15 },
  rotation: { x: 0.46, y: -0.06, z: -0.56 },
};

const HAMMER_SWING_IMPACT_POSE: HammerPose = {
  position: { x: 0.02, y: -0.28, z: -0.13 },
  rotation: { x: 0.94, y: -0.1, z: -0.98 },
};

export const HAMMER_SWING_DURATION = 0.26;
export const HAMMER_SWING_IMPACT_TIME = 0.17;
const HAMMER_SWING_REBOUND_TIME = 0.205;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function easeInCubic(value: number): number {
  return value * value * value;
}

function easeOutQuad(value: number): number {
  return 1 - (1 - value) * (1 - value);
}

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

function interpolatePose(from: HammerPose, to: HammerPose, t: number): HammerPose {
  return {
    position: {
      x: lerp(from.position.x, to.position.x, t),
      y: lerp(from.position.y, to.position.y, t),
      z: lerp(from.position.z, to.position.z, t),
    },
    rotation: {
      x: lerp(from.rotation.x, to.rotation.x, t),
      y: lerp(from.rotation.y, to.rotation.y, t),
      z: lerp(from.rotation.z, to.rotation.z, t),
    },
  };
}

export function getHammerSwingPose(time: number): HammerPose {
  if (time <= 0) return HAMMER_SWING_START_POSE;
  if (time >= HAMMER_SWING_DURATION) return HAMMER_IDLE_POSE;

  if (time < HAMMER_SWING_IMPACT_TIME) {
    const t = easeInCubic(clamp01(time / HAMMER_SWING_IMPACT_TIME));
    return interpolatePose(HAMMER_SWING_START_POSE, HAMMER_SWING_IMPACT_POSE, t);
  }

  if (time < HAMMER_SWING_REBOUND_TIME) {
    const t = easeOutQuad(
      clamp01((time - HAMMER_SWING_IMPACT_TIME) / (HAMMER_SWING_REBOUND_TIME - HAMMER_SWING_IMPACT_TIME))
    );
    return interpolatePose(HAMMER_SWING_IMPACT_POSE, HAMMER_SWING_REBOUND_POSE, t);
  }

  const t = easeOutCubic(
    clamp01((time - HAMMER_SWING_REBOUND_TIME) / (HAMMER_SWING_DURATION - HAMMER_SWING_REBOUND_TIME))
  );
  return interpolatePose(HAMMER_SWING_REBOUND_POSE, HAMMER_IDLE_POSE, t);
}
