import { describe, expect, it } from 'vitest';
import {
  getNextFlightToggleState,
  shouldIgnoreSettingsButtonKeyboardActivation,
} from '../player/inputBehavior';

describe('flight toggle input behavior', () => {
  it('ignores repeated space keydown events while flying', () => {
    const result = getNextFlightToggleState({
      isSurvivalMode: false,
      isFlying: true,
      lastSpacePressTime: 1000,
      spaceTapCount: 1,
      now: 1100,
      isRepeat: true,
    });

    expect(result.isFlying).toBe(true);
    expect(result.spaceTapCount).toBe(1);
    expect(result.lastSpacePressTime).toBe(1000);
  });

  it('toggles flight on a real double tap', () => {
    const result = getNextFlightToggleState({
      isSurvivalMode: false,
      isFlying: false,
      lastSpacePressTime: 1000,
      spaceTapCount: 1,
      now: 1200,
      isRepeat: false,
    });

    expect(result.isFlying).toBe(true);
    expect(result.spaceTapCount).toBe(0);
    expect(result.lastSpacePressTime).toBe(1200);
  });
});

describe('settings button keyboard behavior', () => {
  it('blocks space from activating the settings button while the game is focused', () => {
    expect(shouldIgnoreSettingsButtonKeyboardActivation('Space')).toBe(true);
  });

  it('allows other keys through', () => {
    expect(shouldIgnoreSettingsButtonKeyboardActivation('Enter')).toBe(false);
  });
});
