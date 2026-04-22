export const DAY_LENGTH = 20 * 60; // 20 minutes in seconds
export const TICKS_PER_SECOND = 20;

export class DayNightCycle {
  public timeOfDay = DAY_LENGTH * 0.5; // Start at noon for first-time players
  public dayCount = 1;

  private paused = false;

  get sunAngle(): number {
    // 0 at sunrise, PI at sunset, 2PI at next sunrise
    return (this.timeOfDay / DAY_LENGTH) * Math.PI * 2 - Math.PI / 2;
  }

  get isDay(): boolean {
    const t = this.timeOfDay / DAY_LENGTH;
    return t > 0.25 && t < 0.75;
  }

  get isNight(): boolean {
    return !this.isDay;
  }

  get lightLevel(): number {
    // Returns 0-1 ambient light multiplier
    const t = this.timeOfDay / DAY_LENGTH;
    // Day: 0.25 to 0.75
    if (t >= 0.25 && t <= 0.75) {
      // Peak at 0.5
      return 1.0;
    } else if (t < 0.25) {
      // Dawn transition
      return 0.45 + (t / 0.25) * 0.55;
    } else {
      // Dusk transition
      return 0.45 + ((1 - t) / 0.25) * 0.55;
    }
  }

  get skyColor(): { r: number; g: number; b: number } {
    const t = this.timeOfDay / DAY_LENGTH;
    // Day sky: 0x87CEEB (135, 206, 235)
    // Night sky: 0x0a0a1a (10, 10, 26)
    // Sunset: 0xFF8C42 (255, 140, 66)

    let r: number, g: number, b: number;

    if (t >= 0.2 && t <= 0.8) {
      // Day
      r = 135; g = 206; b = 235;
    } else if (t < 0.2) {
      // Dawn
      const p = t / 0.2;
      r = 10 + (135 - 10) * p;
      g = 10 + (206 - 10) * p;
      b = 26 + (235 - 26) * p;
    } else {
      // Dusk
      const p = (t - 0.8) / 0.2;
      r = 135 + (10 - 135) * p;
      g = 206 + (10 - 206) * p;
      b = 235 + (26 - 235) * p;
    }

    return { r: r / 255, g: g / 255, b: b / 255 };
  }

  update(dt: number) {
    if (this.paused) return;
    this.timeOfDay += dt;
    if (this.timeOfDay >= DAY_LENGTH) {
      this.timeOfDay -= DAY_LENGTH;
      this.dayCount++;
    }
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }
}
