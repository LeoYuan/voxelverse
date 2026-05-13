# Game Modes and Persistence Roadmap

Status: active plan
Owner: local gameplay iteration
Last updated: 2026-05-13

## Direction

VoxelVerse should grow around three playable surfaces:

- Challenge mode: guided building levels and onboarding. This is already the strongest loop.
- Survival mode: resource gathering, inventory, crafting, furnace, food, mobs, death, and recovery.
- Creative mode: free building plus redstone engineering tools that make complex circuits understandable.

The immediate priority is persistence. Survival and redstone engineering both lose value if a world cannot be resumed.

## Phase A: Minimal Persistent World

Goal: close the "save, reload, continue" loop without waiting for full compressed chunk storage.

- Save player position, velocity, view direction, game mode, flight state, spawn point, health, hunger, inventory, selected hotbar slot, day/night time, level progress, furnace states, redstone components, and player-edited block deltas.
- Store in IndexedDB with at least three slots.
- Add start-menu actions for saving and continuing from a slot.
- Rebuild affected chunk meshes after loading.
- Keep the format versioned so chunk compression and thumbnails can land later.

Acceptance:

- Place blocks, toggle a lever, use a furnace, move away, save, reload the page, continue from the same state.
- Loading a save restores player-placed and player-removed blocks against the procedural seed.
- Redstone lamps and lever states recover after the next redstone tick.

## Phase B: Survival Completion

Goal: make survival a complete day-one loop.

- Make mode selection explicit: Challenge, Survival, Creative.
- Keep inventory quantities authoritative in survival; creative can keep infinite hotbar semantics.
- Harden crafting UI: clear missing ingredient feedback, support 2x2 anywhere and 3x3 near crafting table.
- Harden furnace UI: return items on invalid placement, support cooked food and ingots.
- Add survival tuning pass: hunger drain, mob caps, food values, starter kit option.
- Add death drop behavior once inventory is stable.

Acceptance:

- From an empty inventory, a player can collect wood, craft planks/sticks/pickaxe, mine stone, build shelter, cook food, and survive the first night.

## Phase C: Redstone Debug Layer

Goal: make redstone circuits debuggable before building larger arithmetic.

- Add a redstone probe/overlay showing component type, signal strength, input direction, output direction, delay, active state, and tick number.
- Add single-step/pause redstone controls in creative mode.
- Add visible powered/unpowered variants for dust and basic components.
- Add tests for serialized redstone state and repeaters.

Acceptance:

- A player can inspect a lever-to-dust-to-repeater-to-lamp chain and understand why it is on or off.

## Phase D: Creative Redstone Lab

Goal: provide repeatable building blocks for digital logic.

- Add blueprint placement for half-adder, full-adder, RS latch, T flip-flop, clock, 4-bit register, 7-segment display, and lamp bus.
- Start with 2-bit addition, then 4-bit addition, then 8-bit addition.
- Use lamp arrays for binary input, carry, output, and step state.
- Add validation scenarios so a blueprint can be tested automatically.

Acceptance:

- Creative mode can place and verify a 2-bit adder without manual block-by-block construction.

## Phase E: 8-bit Arithmetic Visualizer

Goal: turn the redstone lab into a visible 8-bit four-operation demo.

- Addition: ripple-carry adder, step shows carry propagation.
- Subtraction: two's complement path, step shows inversion plus carry-in.
- Multiplication: shift-and-add path, step shows partial products and accumulator.
- Division: restoring division path, step shows shift, subtract trial, restore, quotient bit.
- Add operation selector, A/B inputs, clock step, reset, and result display.

Acceptance:

- The player can enter two 8-bit numbers, select `+`, `-`, `*`, or `/`, step through the redstone process, and see intermediate and final binary output.

## Implementation Notes

- Keep the persistence format independent of rendering.
- Save player-edited block deltas before full chunk compression.
- Treat redstone blueprints as authored structures plus validation metadata, not hard-coded one-off scenes.
- Do not commit this work unless explicitly requested.
