import { describe, expect, it } from 'vitest';
import {
  HAMMER_IDLE_POSE,
  HAMMER_SWING_DURATION,
  HAMMER_SWING_IMPACT_TIME,
  getHammerSwingPose,
} from '../player/hammerSwing';

describe('hammer swing animation', () => {
  it('starts from the right side and lands near the lower center at impact', () => {
    const start = getHammerSwingPose(0);
    const impact = getHammerSwingPose(HAMMER_SWING_IMPACT_TIME);

    expect(start.position.x).toBeGreaterThan(HAMMER_IDLE_POSE.position.x);
    expect(start.position.y).toBeGreaterThan(impact.position.y);
    expect(start.rotation.x).toBeLessThan(0);

    expect(impact.position.x).toBeLessThan(start.position.x);
    expect(impact.position.x).toBeGreaterThanOrEqual(-0.02);
    expect(impact.position.y).toBeLessThan(start.position.y);
    expect(impact.rotation.x).toBeGreaterThan(0.5);
    expect(Math.abs(impact.rotation.z)).toBeGreaterThan(0.8);
  });

  it('moves toward the lower center before impact without large sideways drift', () => {
    const sampleTimes = [0, 0.04, 0.08, 0.12, 0.16];
    const poses = sampleTimes.map((time) => getHammerSwingPose(time));
    const start = poses[0];
    const impact = getHammerSwingPose(HAMMER_SWING_IMPACT_TIME);

    for (let i = 1; i < poses.length; i++) {
      expect(poses[i].position.x).toBeLessThan(poses[i - 1].position.x);
      expect(poses[i].position.y).toBeLessThan(poses[i - 1].position.y);
    }

    expect(start.position.x - impact.position.x).toBeLessThan(0.2);
  });

  it('returns to the idle pose when the swing finishes', () => {
    const end = getHammerSwingPose(HAMMER_SWING_DURATION);

    expect(end.position).toEqual(HAMMER_IDLE_POSE.position);
    expect(end.rotation).toEqual(HAMMER_IDLE_POSE.rotation);
  });
});
