export function getNextFlightToggleState(input: {
  isSurvivalMode: boolean;
  isFlying: boolean;
  lastSpacePressTime: number;
  spaceTapCount: number;
  now: number;
  isRepeat: boolean;
}) {
  const {
    isSurvivalMode,
    isFlying,
    lastSpacePressTime,
    spaceTapCount,
    now,
    isRepeat,
  } = input;

  if (isSurvivalMode || isRepeat) {
    return { isFlying, spaceTapCount, lastSpacePressTime };
  }

  if (now - lastSpacePressTime < 300) {
    const nextTapCount = spaceTapCount + 1;
    if (nextTapCount >= 2) {
      return {
        isFlying: !isFlying,
        spaceTapCount: 0,
        lastSpacePressTime: now,
      };
    }
    return {
      isFlying,
      spaceTapCount: nextTapCount,
      lastSpacePressTime: now,
    };
  }

  return {
    isFlying,
    spaceTapCount: 1,
    lastSpacePressTime: now,
  };
}

export function shouldIgnoreSettingsButtonKeyboardActivation(code: string) {
  return code === 'Space';
}
