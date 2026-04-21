import { describe, it, expect } from 'vitest';
import { RedstoneEngine } from '../redstone/RedstoneEngine';

describe('RedstoneEngine', () => {
  it('should power a lamp from a lever', () => {
    const engine = new RedstoneEngine();
    engine.registerComponent({ x: 0, y: 0, z: 0, type: 'lever', active: true });
    engine.registerComponent({ x: 1, y: 0, z: 0, type: 'dust' });
    engine.registerComponent({ x: 2, y: 0, z: 0, type: 'lamp' });

    engine.tick();
    engine.tick();

    expect(engine.getPower(2, 0, 0)).toBeGreaterThanOrEqual(1);
    expect(engine.isLampLit(2, 0, 0)).toBe(true);
  });

  it('should implement NOT gate with torch', () => {
    const engine = new RedstoneEngine();
    // Lever at (0,0,0), dust at (1,0,0), torch attached to dust pointing up
    engine.registerComponent({ x: 0, y: 0, z: 0, type: 'lever', active: true });
    engine.registerComponent({ x: 1, y: 0, z: 0, type: 'dust' });
    engine.registerComponent({ x: 1, y: 1, z: 0, type: 'torch', facing: { x: 0, y: -1, z: 0 } });
    engine.registerComponent({ x: 1, y: 2, z: 0, type: 'lamp' });

    // Tick to propagate lever -> dust
    engine.tick();
    engine.tick();

    // Dust should be powered, torch should be OFF (attached to powered block)
    expect(engine.getPower(1, 0, 0)).toBeGreaterThanOrEqual(1);
    expect(engine.getPower(1, 1, 0)).toBe(0);
    expect(engine.isLampLit(1, 2, 0)).toBe(false);

    // Turn lever off
    engine.toggleLever(0, 0, 0);
    engine.tick();
    engine.tick();

    // Dust unpowered, torch ON
    expect(engine.getPower(1, 0, 0)).toBe(0);
    expect(engine.getPower(1, 1, 0)).toBe(15);
    expect(engine.isLampLit(1, 2, 0)).toBe(true);
  });

  it('should attenuate signal through dust', () => {
    const engine = new RedstoneEngine();
    engine.registerComponent({ x: 0, y: 0, z: 0, type: 'block' });
    for (let i = 1; i <= 16; i++) {
      engine.registerComponent({ x: i, y: 0, z: 0, type: 'dust' });
    }

    engine.tick();
    engine.tick();

    expect(engine.getPower(1, 0, 0)).toBe(15);
    expect(engine.getPower(15, 0, 0)).toBe(1);
    expect(engine.getPower(16, 0, 0)).toBe(0);
  });

  it('should keep redstone block permanently powered', () => {
    const engine = new RedstoneEngine();
    engine.registerComponent({ x: 0, y: 0, z: 0, type: 'block' });
    engine.registerComponent({ x: 1, y: 0, z: 0, type: 'dust' });

    for (let i = 0; i < 5; i++) {
      engine.tick();
    }

    expect(engine.getPower(1, 0, 0)).toBe(15);
  });

  it('should handle button press', () => {
    const engine = new RedstoneEngine();
    engine.registerComponent({ x: 0, y: 0, z: 0, type: 'button', active: false });
    engine.registerComponent({ x: 1, y: 0, z: 0, type: 'dust' });
    engine.registerComponent({ x: 2, y: 0, z: 0, type: 'lamp' });

    engine.pressButton(0, 0, 0);
    engine.tick();
    engine.tick();

    expect(engine.isLampLit(2, 0, 0)).toBe(true);
  });

  it('should handle repeater delay', () => {
    const engine = new RedstoneEngine();
    engine.registerComponent({ x: 0, y: 0, z: 0, type: 'lever', active: true });
    engine.registerComponent({ x: 1, y: 0, z: 0, type: 'dust' });
    engine.registerComponent({ x: 2, y: 0, z: 0, type: 'repeater', facing: { x: -1, y: 0, z: 0 }, delay: 2 });
    engine.registerComponent({ x: 3, y: 0, z: 0, type: 'lamp' });

    // Tick 1: lever on, dust powered, repeater input registered
    engine.tick();
    expect(engine.getPower(3, 0, 0)).toBe(0);

    // Tick 2: repeater queue fills
    engine.tick();
    expect(engine.getPower(3, 0, 0)).toBe(0);

    // Tick 3: repeater output active (2-tick delay)
    engine.tick();
    expect(engine.getPower(3, 0, 0)).toBe(15);
    expect(engine.isLampLit(3, 0, 0)).toBe(true);
  });

  it('should implement OR gate with two levers', () => {
    const engine = new RedstoneEngine();
    // Two levers on opposite sides of dust
    engine.registerComponent({ x: 0, y: 0, z: 0, type: 'lever', active: false });
    engine.registerComponent({ x: 1, y: 0, z: 0, type: 'dust' });
    engine.registerComponent({ x: 2, y: 0, z: 0, type: 'lever', active: false });
    engine.registerComponent({ x: 1, y: 0, z: 1, type: 'lamp' });

    // Both off -> lamp off
    engine.tick(); engine.tick();
    expect(engine.isLampLit(1, 0, 1)).toBe(false);

    // A on -> lamp on
    engine.toggleLever(0, 0, 0);
    engine.tick(); engine.tick();
    expect(engine.isLampLit(1, 0, 1)).toBe(true);

    // Both on -> lamp on
    engine.toggleLever(2, 0, 0);
    engine.tick(); engine.tick();
    expect(engine.isLampLit(1, 0, 1)).toBe(true);

    // A off, B on -> lamp on
    engine.toggleLever(0, 0, 0);
    engine.tick(); engine.tick();
    expect(engine.isLampLit(1, 0, 1)).toBe(true);
  });

  it('should implement NAND gate with two torches', () => {
    const engine = new RedstoneEngine();
    // Input A: lever(0,0,0) -> dust(1,0,0) -> torch(1,1,0)
    engine.registerComponent({ x: 0, y: 0, z: 0, type: 'lever', active: false });
    engine.registerComponent({ x: 1, y: 0, z: 0, type: 'dust' });
    engine.registerComponent({ x: 1, y: 1, z: 0, type: 'torch', facing: { x: 0, y: -1, z: 0 } });
    // Input B: lever(4,0,0) -> dust(3,0,0) -> torch(3,1,0)
    engine.registerComponent({ x: 4, y: 0, z: 0, type: 'lever', active: false });
    engine.registerComponent({ x: 3, y: 0, z: 0, type: 'dust' });
    engine.registerComponent({ x: 3, y: 1, z: 0, type: 'torch', facing: { x: 0, y: -1, z: 0 } });
    // Output lamp between the torches
    engine.registerComponent({ x: 2, y: 1, z: 0, type: 'lamp' });

    // Both off -> both torches ON -> lamp lit
    engine.tick(); engine.tick();
    expect(engine.isLampLit(2, 1, 0)).toBe(true);

    // A on, B off -> torch A OFF, torch B ON -> lamp lit
    engine.toggleLever(0, 0, 0);
    engine.tick(); engine.tick();
    expect(engine.isLampLit(2, 1, 0)).toBe(true);

    // Both on -> both torches OFF -> lamp unlit (NAND)
    engine.toggleLever(4, 0, 0);
    engine.tick(); engine.tick();
    expect(engine.isLampLit(2, 1, 0)).toBe(false);

    // A off, B on -> torch A ON, torch B OFF -> lamp lit
    engine.toggleLever(0, 0, 0);
    engine.tick(); engine.tick();
    expect(engine.isLampLit(2, 1, 0)).toBe(true);
  });
});
