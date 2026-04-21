export type RedstoneComponentType = 'dust' | 'torch' | 'lamp' | 'lever' | 'block' | 'button' | 'repeater';

export interface RedstoneComponent {
  x: number;
  y: number;
  z: number;
  type: RedstoneComponentType;
  /** For torch: the direction it points (which block it's attached to) */
  facing?: { x: number; y: number; z: number };
  /** For lever/button: whether it's currently activated */
  active?: boolean;
  /** For repeater: delay in ticks (1-4) */
  delay?: number;
}

export class RedstoneEngine {
  // Current tick power levels (0-15)
  private power = new Map<string, number>();
  // Next tick power levels
  private nextPower = new Map<string, number>();
  // Registered redstone components
  private components = new Map<string, RedstoneComponent>();
  // Repeater delay queues: position key -> [power values]
  private repeaterQueues = new Map<string, number[]>();

  private key(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  getPower(x: number, y: number, z: number): number {
    return this.power.get(this.key(x, y, z)) ?? 0;
  }

  private getNextPower(x: number, y: number, z: number): number {
    return this.nextPower.get(this.key(x, y, z)) ?? 0;
  }

  private setNextPower(x: number, y: number, z: number, p: number) {
    this.nextPower.set(this.key(x, y, z), Math.max(0, Math.min(15, p)));
  }

  registerComponent(comp: RedstoneComponent) {
    this.components.set(this.key(comp.x, comp.y, comp.z), comp);
  }

  removeComponent(x: number, y: number, z: number) {
    const k = this.key(x, y, z);
    this.components.delete(k);
    this.power.delete(k);
    this.nextPower.delete(k);
    this.repeaterQueues.delete(k);
  }

  getComponent(x: number, y: number, z: number): RedstoneComponent | undefined {
    return this.components.get(this.key(x, y, z));
  }

  toggleLever(x: number, y: number, z: number) {
    const comp = this.components.get(this.key(x, y, z));
    if (comp && comp.type === 'lever') {
      comp.active = !comp.active;
    }
  }

  pressButton(x: number, y: number, z: number) {
    const comp = this.components.get(this.key(x, y, z));
    if (comp && comp.type === 'button') {
      comp.active = true;
      // Button deactivates after 1 second (20 ticks at 20tps)
      setTimeout(() => {
        if (comp) comp.active = false;
      }, 1000);
    }
  }

  tick() {
    this.nextPower.clear();

    // Step 1: Torches compute output based on CURRENT power (NOT gate)
    for (const comp of this.components.values()) {
      if (comp.type === 'torch' && comp.facing) {
        const ax = comp.x + comp.facing.x;
        const ay = comp.y + comp.facing.y;
        const az = comp.z + comp.facing.z;
        const attachedPower = this.getPower(ax, ay, az);
        if (attachedPower === 0) {
          this.setNextPower(comp.x, comp.y, comp.z, 15);
        }
      }
    }

    // Step 2: Sources (lever, redstone block, button)
    for (const comp of this.components.values()) {
      if (comp.type === 'lever' || comp.type === 'button') {
        if (comp.active) {
          this.setNextPower(comp.x, comp.y, comp.z, 15);
        }
      } else if (comp.type === 'block') {
        this.setNextPower(comp.x, comp.y, comp.z, 15);
      }
    }

    // Step 3: Direct sources (lever, button, redstone block) power adjacent dust at 15
    // Torches do NOT directly power dust to avoid feedback loops
    for (const comp of this.components.values()) {
      let sourcePower = 0;
      if ((comp.type === 'lever' || comp.type === 'button') && comp.active) {
        sourcePower = 15;
      } else if (comp.type === 'block') {
        sourcePower = 15;
      }
      if (sourcePower > 0) {
        const neighbors = [
          [comp.x + 1, comp.y, comp.z], [comp.x - 1, comp.y, comp.z],
          [comp.x, comp.y + 1, comp.z], [comp.x, comp.y - 1, comp.z],
          [comp.x, comp.y, comp.z + 1], [comp.x, comp.y, comp.z - 1],
        ];
        for (const [nx, ny, nz] of neighbors) {
          const nk = this.key(nx, ny, nz);
          const ncomp = this.components.get(nk);
          if (ncomp && ncomp.type === 'dust') {
            this.setNextPower(nx, ny, nz, 15);
          }
        }
      }
    }

    // Step 4: Propagate through dust using BFS (dust-to-dust: power - 1)
    const queue: Array<[number, number, number]> = [];
    const enqueued = new Set<string>();

    for (const [k] of this.nextPower) {
      const [x, y, z] = k.split(',').map(Number);
      const comp = this.components.get(k);
      if (comp && comp.type === 'dust') {
        queue.push([x, y, z]);
        enqueued.add(k);
      }
    }

    let head = 0;
    while (head < queue.length) {
      const [x, y, z] = queue[head++];
      const currentP = this.getNextPower(x, y, z);
      if (currentP <= 1) continue;

      const neighbors = [
        [x + 1, y, z], [x - 1, y, z],
        [x, y + 1, z], [x, y - 1, z],
        [x, y, z + 1], [x, y, z - 1],
      ];

      for (const [nx, ny, nz] of neighbors) {
        const nk = this.key(nx, ny, nz);
        const comp = this.components.get(nk);
        if (comp && comp.type === 'dust') {
          const nextP = this.getNextPower(nx, ny, nz);
          if (currentP - 1 > nextP) {
            this.setNextPower(nx, ny, nz, currentP - 1);
            if (!enqueued.has(nk)) {
              queue.push([nx, ny, nz]);
              enqueued.add(nk);
            }
          }
        }
      }
    }

    // Step 5: Repeaters (delay and amplify)
    for (const comp of this.components.values()) {
      if (comp.type === 'repeater' && comp.facing) {
        // facing indicates input direction (consistent with torch convention)
        const bx = comp.x + comp.facing.x;
        const by = comp.y + comp.facing.y;
        const bz = comp.z + comp.facing.z;
        const inputPower = this.getPower(bx, by, bz);
        const k = this.key(comp.x, comp.y, comp.z);
        let q = this.repeaterQueues.get(k);
        if (!q) {
          q = [];
          this.repeaterQueues.set(k, q);
        }
        q.push(inputPower >= 1 ? 15 : 0);
        const delay = comp.delay ?? 1;
        while (q.length > delay) {
          q.shift();
        }
        if (q.length === delay) {
          this.setNextPower(comp.x, comp.y, comp.z, q[0]);
        }
      }
    }

    // Step 6: Lamps light up from adjacent powered blocks
    for (const comp of this.components.values()) {
      if (comp.type === 'lamp') {
        const neighbors = [
          [comp.x + 1, comp.y, comp.z], [comp.x - 1, comp.y, comp.z],
          [comp.x, comp.y + 1, comp.z], [comp.x, comp.y - 1, comp.z],
          [comp.x, comp.y, comp.z + 1], [comp.x, comp.y, comp.z - 1],
        ];
        for (const [nx, ny, nz] of neighbors) {
          const np = this.getNextPower(nx, ny, nz);
          if (np >= 1) {
            this.setNextPower(comp.x, comp.y, comp.z, 15);
            break;
          }
        }
      }
    }

    // Copy nextPower to power (clean swap to avoid stale values)
    this.power = new Map(this.nextPower);
  }

  isLampLit(x: number, y: number, z: number): boolean {
    // Lamp is lit if any adjacent block has power >= 1
    const neighbors = [
      [x + 1, y, z], [x - 1, y, z],
      [x, y + 1, z], [x, y - 1, z],
      [x, y, z + 1], [x, y, z - 1],
    ];
    for (const [nx, ny, nz] of neighbors) {
      if (this.getPower(nx, ny, nz) >= 1) return true;
    }
    return false;
  }

  getAllComponents(): RedstoneComponent[] {
    return Array.from(this.components.values());
  }

  clear() {
    this.power.clear();
    this.nextPower.clear();
    this.components.clear();
    this.repeaterQueues.clear();
  }
}
