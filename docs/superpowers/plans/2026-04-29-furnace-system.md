# Furnace System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a minimal furnace system that turns fuel plus smeltable inputs into outputs for survival progression.

**Architecture:** Keep furnace rules in a small pure TypeScript module so behavior is testable without the DOM. Add item/block IDs for smelting outputs, then wire a minimal furnace overlay into the existing game loop and inventory patterns in `src/main.ts`.

**Tech Stack:** TypeScript, Vitest, Vite, existing DOM UI.

---

## File Map

- Create: `src/crafting/FurnaceRegistry.ts`
  - Owns smelting recipes, fuel definitions, and `FurnaceState.tick()`.
- Create: `src/tests/FurnaceRegistry.test.ts`
  - Covers fuel consumption, cooking progress, output generation, invalid input, and blocked output.
- Modify: `src/blocks/BlockRegistry.ts`
  - Adds minimal output item IDs: iron ingot, gold ingot, cooked beef.
- Modify: `src/main.ts`
  - Adds a small furnace overlay and ticks one active furnace state.
- Modify: `src/style.css`
  - Styles the furnace overlay.
- Modify: `docs/requirements/task-tracker.md`
  - Marks P3-T8 complete after verification.

## Chunk 1: Pure Furnace Logic

### Task 1: Add failing furnace tests

- [x] Write `src/tests/FurnaceRegistry.test.ts` for recipes, fuel, output, and blocked output.
- [x] Run `npm test -- src/tests/FurnaceRegistry.test.ts` and confirm failure because the module does not exist.

### Task 2: Implement furnace logic

- [x] Create `src/crafting/FurnaceRegistry.ts`.
- [x] Add output IDs to `src/blocks/BlockRegistry.ts`.
- [x] Run `npm test -- src/tests/FurnaceRegistry.test.ts` and confirm pass.

## Chunk 2: Minimal Game Integration

### Task 3: Add furnace overlay

- [x] Import furnace logic in `src/main.ts`.
- [x] Open the overlay when interacting with a furnace block.
- [x] Let players move selected hotbar items into input/fuel slots and collect output.
- [x] Tick the active furnace state in the game loop.

### Task 4: Verify and update tracker

- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Mark P3-T8 complete in `docs/requirements/task-tracker.md`.
