# Persistent Survival-Building Campaign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a five-chapter persistent base campaign that alternates construction objectives with soft-failure defense nights, including player combat, lightweight saves, and targeted chunk-loading performance fixes.

**Architecture:** Keep campaign rules in pure modules under `src/campaign/`, world mutation persistence in `ChunkManager`, and combat selection in `src/combat/`. `main.ts` remains the integration point but delegates state transitions, objective evaluation, wave accounting, persistence validation, and HUD rendering to focused units.

**Tech Stack:** TypeScript 6, Three.js 0.184, Vitest 4, Playwright 1.59, Vite 8, browser `localStorage`.

**Design reference:** `docs/superpowers/specs/2026-07-16-persistent-survival-building-campaign-design.md`

---

## File Map

### New files

- `src/campaign/CampaignConfig.ts` — chapter, objective, defense, and reward configuration.
- `src/campaign/CampaignManager.ts` — pure campaign phase state machine and serialization.
- `src/campaign/CampaignObjectiveEvaluator.ts` — converts world mutations into chapter progress.
- `src/campaign/CampaignWaveController.ts` — bounded enemy spawn/kill accounting.
- `src/campaign/CampaignRuntime.ts` — coordinates manager, objectives, waves, rewards, and save requests through callbacks.
- `src/campaign/CampaignSaveStore.ts` — versioned save validation and `localStorage` adapter.
- `src/campaign/CampaignHud.ts` — campaign DOM creation and view-model rendering.
- `src/combat/playerAttack.ts` — item damage, cooldown, ray-target selection, and knockback direction.
- `src/tests/CampaignManager.test.ts`
- `src/tests/CampaignObjectiveEvaluator.test.ts`
- `src/tests/CampaignWaveController.test.ts`
- `src/tests/CampaignRuntime.test.ts`
- `src/tests/CampaignSaveStore.test.ts`
- `src/tests/PlayerAttack.test.ts`
- `e2e/campaign-progression.spec.ts`

### Modified files

- `src/engine/ChunkManager.ts` — persistent mutation records, revision tracking, and chunk-boundary loading.
- `src/tests/ChunkManager.test.ts` — mutation import/export and load-delta coverage.
- `src/engine/DayNightCycle.ts` — explicit day/night setters and paused-state query.
- `src/tests/DayNightCycle.test.ts` — mode-time behavior.
- `src/player/PlayerController.ts` — primary attack callback, campaign mode-toggle lock, player mutation API.
- `src/entities/Mob.ts` — hit flash and knockback application.
- `src/main.ts` — game-mode selection, campaign integration, mob tagging, save lifecycle, and chunk deltas.
- `src/style.css` — campaign menu card, HUD, progress, and action controls.
- `playwright.config.ts` — stable startup and timeout settings if still needed after performance fixes.

---

## Chunk 1: Persistent World and Campaign Rules

### Task 1: Make chunk loading delta-based

**Files:**
- Modify: `src/engine/ChunkManager.ts:4-112`
- Modify: `src/tests/ChunkManager.test.ts`

- [ ] **Step 1: Write failing tests for same-chunk no-op and load deltas**

Add tests that call `updatePlayerPosition(0, 0, 1)` twice and assert the second call returns empty `loaded` and `unloaded` arrays. Add a second test that moves from world X `0` to `16` and asserts only edge chunks are loaded/unloaded.

```ts
it('does not regenerate or rescan chunks while the player remains in one chunk', () => {
  const cm = new ChunkManager(42);
  const first = cm.updatePlayerPosition(0, 0, 1);
  const second = cm.updatePlayerPosition(15.9, 0, 1);
  expect(first.loaded).toHaveLength(9);
  expect(second).toEqual({ loaded: [], unloaded: [] });
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- --run src/tests/ChunkManager.test.ts`

Expected: FAIL because `updatePlayerPosition` currently returns `void` and repeats work.

- [ ] **Step 3: Implement cached chunk-center and delta results**

Introduce:

```ts
export interface ChunkLoadDelta {
  loaded: Chunk[];
  unloaded: Array<{ cx: number; cz: number }>;
}
```

Track the last player chunk and render distance. Return an empty delta when all three are unchanged. When movement crosses a chunk boundary, ensure missing chunks, collect newly created chunks, delete distant chunks, and return their coordinates.

- [ ] **Step 4: Run focused and full tests**

Run:

```bash
npm test -- --run src/tests/ChunkManager.test.ts
npm test -- --run
```

Expected: focused tests PASS; all existing tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/ChunkManager.ts src/tests/ChunkManager.test.ts
git commit -m "perf: update chunks only at chunk boundaries"
```

### Task 2: Persist player world mutations across chunk regeneration

**Files:**
- Modify: `src/engine/ChunkManager.ts`
- Modify: `src/player/PlayerController.ts:384-480`
- Modify: `src/tests/ChunkManager.test.ts`

- [ ] **Step 1: Write failing mutation round-trip tests**

Cover:

- player placement export contains block ID and revision
- player removal exports block ID `0`
- unloading/reloading reapplies mutations
- importing invalid coordinates, block IDs, or more than 20,000 records throws without partial application
- `countPlayerPlacementsSince(revision, center, radius)` counts only currently placed blocks

Use this serialized shape:

```ts
export interface WorldMutation {
  x: number;
  y: number;
  z: number;
  blockId: number;
  revision: number;
}
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- --run src/tests/ChunkManager.test.ts`

Expected: FAIL because mutation APIs do not exist.

- [ ] **Step 3: Implement mutation source of truth**

Add:

```ts
setPlayerBlock(x: number, y: number, z: number, blockId: number): void
exportMutations(): WorldMutation[]
importMutations(records: WorldMutation[]): Array<{ cx: number; cz: number }>
getPlacementRevision(): number
countPlayerPlacementsSince(revision: number, cx: number, cy: number, cz: number, radius: number): number
countPlacedBlockIds(cx: number, cy: number, cz: number, radius: number): Record<number, number>
```

`setBlock` remains the non-persistent API for generated scenery, redstone lamp state, and free-survival explosions. `setPlayerBlock` updates the mutation map, placement/removal sets, revision, and currently loaded chunk. `ensureChunk` reapplies all mutations belonging to that chunk after generation.

- [ ] **Step 4: Route player placement and mining through `setPlayerBlock`**

In `PlayerController.breakBlockAt` and `placeBlock`, replace the `setBlock` plus manual mark calls with one `setPlayerBlock` call. Keep `onBlockChange` responsible for mesh/redstone refresh.

- [ ] **Step 5: Run focused and full tests**

Run:

```bash
npm test -- --run src/tests/ChunkManager.test.ts src/tests/BuildingLevels.test.ts src/tests/LevelValidation.test.ts
npm test -- --run
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/engine/ChunkManager.ts src/player/PlayerController.ts src/tests/ChunkManager.test.ts
git commit -m "feat: persist player block mutations"
```

### Task 3: Define campaign chapters and state machine

**Files:**
- Create: `src/campaign/CampaignConfig.ts`
- Create: `src/campaign/CampaignManager.ts`
- Create: `src/tests/CampaignManager.test.ts`

- [ ] **Step 1: Write failing transition and reward tests**

Test:

- all five chapters have explicit objectives and rewards
- preparation becomes `ready` only when objective progress is complete
- chapter 1 completes without a defense
- defense chapters reject early start
- timer reaching zero without enough kills remains in defense
- timer plus kill target yields `complete`
- failure returns to `ready`
- claiming completion advances exactly once
- chapter 5 advances into endless ready state
- a defense snapshot imports as `ready`

Core types:

```ts
export type CampaignPhase = 'preparation' | 'ready' | 'defense' | 'complete';

export type CampaignObjective =
  | { type: 'shelter'; floor: number; walls: number }
  | { type: 'required_blocks'; requirements: Record<number, number> }
  | { type: 'reinforcement'; count: number; requirements?: Record<number, number> };

export interface CampaignProgress {
  objectiveCurrent: number;
  objectiveTarget: number;
  requirementsMet: boolean;
}
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- --run src/tests/CampaignManager.test.ts`

Expected: FAIL because campaign modules do not exist.

- [ ] **Step 3: Implement `CAMPAIGN_CHAPTERS`**

Encode the five design-spec chapters. Use block constants instead of numeric literals. Include Chinese player-facing title, objective copy, reward copy, defense duration, kill target, and composition weights.

- [ ] **Step 4: Implement the pure state machine**

Required public API:

```ts
class CampaignManager {
  updatePreparation(progress: CampaignProgress): boolean;
  startReadyAction(currentPlacementRevision: number): 'complete' | 'defense' | 'rejected';
  recordKill(): void;
  tickDefense(dt: number): boolean;
  failDefense(): void;
  claimCompletion(currentPlacementRevision: number): CampaignReward[];
  getViewState(): CampaignViewState;
  snapshot(): CampaignSnapshot;
  restore(snapshot: CampaignSnapshot): void;
}
```

Keep claimed chapter IDs in the snapshot. `restore` normalizes `defense` to `ready`.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- --run src/tests/CampaignManager.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/campaign/CampaignConfig.ts src/campaign/CampaignManager.ts src/tests/CampaignManager.test.ts
git commit -m "feat: add persistent campaign state machine"
```

### Task 4: Evaluate campaign construction objectives

**Files:**
- Create: `src/campaign/CampaignObjectiveEvaluator.ts`
- Create: `src/tests/CampaignObjectiveEvaluator.test.ts`

- [ ] **Step 1: Write failing evaluator tests**

Build synthetic chunks with `setPlayerBlock` and verify:

- a 3×3 floor with seven ring-wall blocks satisfies shelter
- generated initial-scene blocks do not count
- required crafting table/furnace counts use player mutations inside the base radius
- reinforcement ignores revisions at or below the chapter baseline
- removed blocks do not count
- redstone lamp lit/unlit IDs both satisfy a lamp requirement

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- --run src/tests/CampaignObjectiveEvaluator.test.ts`

Expected: FAIL because evaluator does not exist.

- [ ] **Step 3: Implement evaluator**

Expose:

```ts
export function evaluateCampaignObjective(
  objective: CampaignObjective,
  cm: ChunkManager,
  base: Vec3,
  chapterStartRevision: number,
): CampaignProgress;
```

Implement the bounded 3×3 shelter scan directly in this focused evaluator. Do not import live tutorial level definitions into campaign code.

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- --run src/tests/CampaignObjectiveEvaluator.test.ts
npm test -- --run
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/campaign/CampaignObjectiveEvaluator.ts src/tests/CampaignObjectiveEvaluator.test.ts
git commit -m "feat: evaluate campaign building objectives"
```

### Task 5: Add versioned campaign save validation

**Files:**
- Create: `src/campaign/CampaignSaveStore.ts`
- Create: `src/tests/CampaignSaveStore.test.ts`

- [ ] **Step 1: Write failing save-store tests**

Use an in-memory `StorageLike` fake. Test:

- valid save round trip
- missing or wrong version returns `null`
- malformed JSON returns `null`
- invalid inventory length/counts returns `null`
- invalid player numbers return `null`
- invalid mutations return `null`
- failed validation never returns partially sanitized data
- clear removes the save

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- --run src/tests/CampaignSaveStore.test.ts`

Expected: FAIL because store does not exist.

- [ ] **Step 3: Implement strict validator and adapter**

```ts
export const CAMPAIGN_SAVE_KEY = 'voxelverse-campaign-v1';

export interface CampaignSaveData {
  version: 1;
  campaign: CampaignSnapshot;
  pendingRewards: CampaignReward[];
  inventory: { slots: InventorySlot[]; selectedSlot: number };
  player: { x: number; y: number; z: number };
  spawn: { x: number; y: number; z: number };
  mutations: WorldMutation[];
}
```

`load()` catches parsing errors and returns `null`; `save()` serializes only already-validated runtime data; `clear()` removes one key.

- [ ] **Step 4: Run focused and full tests**

Run:

```bash
npm test -- --run src/tests/CampaignSaveStore.test.ts
npm test -- --run
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/campaign/CampaignSaveStore.ts src/tests/CampaignSaveStore.test.ts
git commit -m "feat: add versioned campaign save store"
```

## Chunk 2: Combat, Waves, and Runtime

### Task 6: Add player attack selection and cooldown

**Files:**
- Create: `src/combat/playerAttack.ts`
- Create: `src/tests/PlayerAttack.test.ts`
- Modify: `src/player/PlayerController.ts:63-95,243-272`
- Modify: `src/entities/Mob.ts`

- [ ] **Step 1: Write failing combat-helper tests**

Test item damage values, nearest target selection, rejection outside four blocks, rejection outside ray radius, dead-target filtering, and 350 ms cooldown.

```ts
const hit = selectAttackTarget(
  { x: 0, y: 1.6, z: 0 },
  { x: 0, y: 0, z: -1 },
  [{ id: 'near', x: 0.2, y: 0.9, z: -2, dead: false }],
  4,
  0.8,
);
expect(hit?.id).toBe('near');
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- --run src/tests/PlayerAttack.test.ts`

Expected: FAIL because helper does not exist.

- [ ] **Step 3: Implement helper**

Implement `getAttackDamage`, `selectAttackTarget`, `AttackCooldown.tryUse(now)`, and normalized knockback direction. Keep it independent of Three.js classes.

- [ ] **Step 4: Add primary-attack callback to `PlayerController`**

Extend constructor options with `onPrimaryAttack?: () => boolean`. On left mouse down:

1. trigger arm swing
2. call primary attack
3. if it returns true, do not mine
4. otherwise preserve current creative/survival mining behavior

Add `modeToggleEnabled` and ignore `KeyG` when false.

- [ ] **Step 5: Add mob hit feedback**

Add `applyHit(damage, knockbackX, knockbackZ)` to `Mob`. It calls `takeDamage`, applies bounded horizontal velocity, sets a short flash timer, and restores the original material color during `update`.

- [ ] **Step 6: Run tests**

Run:

```bash
npm test -- --run src/tests/PlayerAttack.test.ts
npm test -- --run
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/combat/playerAttack.ts src/tests/PlayerAttack.test.ts src/player/PlayerController.ts src/entities/Mob.ts
git commit -m "feat: let players attack mobs"
```

### Task 7: Add bounded campaign wave accounting

**Files:**
- Create: `src/campaign/CampaignWaveController.ts`
- Create: `src/tests/CampaignWaveController.test.ts`

- [ ] **Step 1: Write failing wave tests**

Test:

- `start` resets prior wave
- spawn callbacks never exceed target count
- spawn schedule uses the configured interval
- registered campaign mob deaths increment kills once
- ambient mob deaths are ignored
- `clear` returns all active campaign IDs and resets counters

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- --run src/tests/CampaignWaveController.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement controller**

Use opaque string IDs:

```ts
class CampaignWaveController {
  start(defense: CampaignDefense): void;
  tick(dt: number, spawn: (kind: CampaignEnemyKind) => string | null): void;
  recordDeath(id: string): boolean;
  getProgress(): { spawned: number; active: number; defeated: number; target: number };
  clear(): string[];
}
```

Choose enemy kinds using deterministic cumulative weights with an injectable random function for tests.

- [ ] **Step 4: Run tests and commit**

Run: `npm test -- --run src/tests/CampaignWaveController.test.ts`

Expected: PASS.

```bash
git add src/campaign/CampaignWaveController.ts src/tests/CampaignWaveController.test.ts
git commit -m "feat: add bounded campaign defense waves"
```

### Task 8: Coordinate campaign lifecycle in `CampaignRuntime`

**Files:**
- Create: `src/campaign/CampaignRuntime.ts`
- Create: `src/tests/CampaignRuntime.test.ts`

- [ ] **Step 1: Write failing runtime tests**

Use callback spies to verify:

- objective evaluation is throttled to four times per second
- ready action starts defense and requests night
- chapter 1 ready action completes immediately
- wave victory grants reward once, requests day, clears enemies, advances chapter, and saves
- death failure clears enemies, requests day, returns to ready, and saves
- autosave fires every ten seconds only while active
- pending reward remains when inventory callback reports overflow
- pending reward survives runtime snapshot/restore and is retried after inventory space becomes available

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- --run src/tests/CampaignRuntime.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement callback-driven runtime**

Dependencies:

```ts
interface CampaignRuntimeDeps {
  evaluateObjective: () => CampaignProgress;
  getPlacementRevision: () => number;
  addReward: (reward: CampaignReward) => number;
  setDay: () => void;
  setNight: () => void;
  spawnEnemy: (kind: CampaignEnemyKind) => string | null;
  clearEnemies: (ids: string[]) => void;
  requestSave: () => void;
}
```

Public API:

```ts
tick(dt: number): void
runReadyAction(): boolean
recordEnemyDeath(id: string): void
failDefense(): void
setActive(active: boolean): void
getViewModel(): CampaignHudViewModel
getPendingRewards(): CampaignReward[]
restorePendingRewards(rewards: CampaignReward[]): void
```

- [ ] **Step 4: Run focused and full tests**

Run:

```bash
npm test -- --run src/tests/CampaignRuntime.test.ts
npm test -- --run
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/campaign/CampaignRuntime.ts src/tests/CampaignRuntime.test.ts
git commit -m "feat: coordinate campaign progression"
```

### Task 9: Add explicit day/night mode controls

**Files:**
- Modify: `src/engine/DayNightCycle.ts`
- Modify: `src/tests/DayNightCycle.test.ts`

- [ ] **Step 1: Write failing tests**

Test `setDay`, `setNight`, and `isPaused`. Ensure `setDay(true)` pauses at noon, `setNight(true)` pauses at midnight, and free-survival `resume()` advances time.

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- --run src/tests/DayNightCycle.test.ts`

Expected: FAIL because setters/query do not exist.

- [ ] **Step 3: Implement controls**

```ts
setDay(paused = true) {
  this.timeOfDay = DAY_LENGTH * 0.5;
  this.paused = paused;
}

setNight(paused = true) {
  this.timeOfDay = DAY_LENGTH * 0.9;
  this.paused = paused;
}

get isPaused() {
  return this.paused;
}
```

- [ ] **Step 4: Run and commit**

Run: `npm test -- --run src/tests/DayNightCycle.test.ts`

Expected: PASS.

```bash
git add src/engine/DayNightCycle.ts src/tests/DayNightCycle.test.ts
git commit -m "feat: control campaign day and night states"
```

## Chunk 3: UI, Game Integration, and Verification

### Task 10: Build campaign HUD

**Files:**
- Create: `src/campaign/CampaignHud.ts`
- Modify: `src/style.css`

- [ ] **Step 1: Define a DOM-independent HUD view model**

In `CampaignHud.ts`, export:

```ts
export interface CampaignHudViewModel {
  visible: boolean;
  eyebrow: string;
  title: string;
  objective: string;
  progressLabel: string;
  progressRatio: number;
  reward: string;
  actionLabel: string | null;
  defenseLabel: string | null;
}
```

- [ ] **Step 2: Implement DOM creation and rendering**

`CampaignHud` creates one root node, updates text with `textContent`, clamps progress from `0` to `1`, exposes `setActionHandler`, and never writes player-derived values through `innerHTML`.

- [ ] **Step 3: Add focused campaign styles**

Add responsive styles for `.campaign-hud`, `.campaign-progress`, `.campaign-action`, `.campaign-defense`, and a highlighted `.mode-card.campaign-card`. Keep the HUD clear of the hotbar and health bars at 1280×720.

- [ ] **Step 4: Build to verify TypeScript and CSS integration**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/campaign/CampaignHud.ts src/style.css
git commit -m "feat: add campaign HUD"
```

### Task 11: Integrate campaign mode, saves, combat, and waves

**Files:**
- Modify: `src/main.ts`
- Modify: `src/style.css`
- Modify: `src/player/Inventory.ts` if snapshot helpers reduce unsafe direct assignment

- [ ] **Step 1: Add game-mode state and lower startup render distance**

Define:

```ts
type GameMode = 'campaign' | 'challenge' | 'creative' | 'survival';
const RENDER_DISTANCE = 4;
let activeMode: GameMode = 'campaign';
```

Use the delta returned by `ChunkManager.updatePlayerPosition` for mesh add/remove. Remove the per-frame old/new set scans. Queue newly loaded chunks and build a small fixed number of meshes per frame.

- [ ] **Step 2: Load save metadata before rendering the start menu**

Construct `CampaignSaveStore` and call `load()` once. Do not apply mutations or inventory until campaign mode starts. Use save metadata to label the campaign card `继续战役 · 第 N 章`; otherwise label it `新战役`.

- [ ] **Step 3: Make campaign the selected primary menu mode**

Add a campaign card before classic challenges. Preserve the challenge level dropdown. Add a `重新开始` control when a save exists; it clears the campaign save and reloads the page after confirmation through a second click, not a blocking browser dialog.

- [ ] **Step 4: Implement mode activation**

Centralize mode setup in `activateMode(mode)`:

- campaign: survival physics, disable `G`, hide classic-level HUD, load or initialize campaign state, apply mutations, restore inventory/player/spawn, set day, activate runtime
- challenge: creative physics, enable classic levels, set day, deactivate runtime
- creative: creative physics, skip levels, set day
- survival: survival physics, starter kit, resume day/night, ambient mobs enabled

Clear campaign enemies on every mode switch.

- [ ] **Step 5: Wire combat callback**

Build one target list from zombies, skeletons, creepers, and cows. Convert camera world direction to the pure attack helper input. On a successful cooldown-approved hit, call `mob.applyHit`, and return `true` to stop mining.

- [ ] **Step 6: Tag campaign mobs and report deaths**

Assign an opaque ID when runtime requests a spawn. Maintain `Map<string, Mob>` and `WeakMap<Mob, string>`. In each existing death path, call `runtime.recordEnemyDeath(id)` before removal. Ambient mobs have no campaign ID.

Pass `destroyTerrain = activeMode !== 'campaign'` into creeper explosion handling.

- [ ] **Step 7: Wire campaign death and retry**

When campaign player health reaches zero:

- call `runtime.failDefense()` if defending
- reset stats
- respawn immediately after a short result message
- keep inventory and mutations
- avoid showing the free-survival death screen

Free survival retains the existing R-to-respawn behavior.

- [ ] **Step 8: Wire rewards and save lifecycle**

Implement `buildCampaignSave()` from manager snapshot, runtime pending rewards, inventory, player/spawn, and mutations. Save on runtime request, every autosave event, and `beforeunload`. Restore a defense save as ready through `CampaignManager.restore`, then restore pending rewards into the runtime.

Give a new campaign a compact starter kit once:

```ts
[
  { blockId: BLOCK_PLANKS, count: 20 },
  { blockId: BLOCK_WOODEN_PICKAXE, count: 1 },
  { blockId: BLOCK_COOKED_BEEF, count: 2 },
]
```

- [ ] **Step 9: Wire HUD and action button**

Create `CampaignHud`, render its view model after runtime ticks, and connect its action to `runtime.runReadyAction()`. Hide the classic level HUD in campaign mode.

- [ ] **Step 10: Extend the development test API**

Expose read-only campaign helpers and deterministic actions:

```ts
getCampaignState()
startCampaign()
runCampaignAction()
recordCampaignKill(id?)
saveCampaign()
clearCampaignSave()
```

Do not expose private mutable maps directly.

- [ ] **Step 11: Run unit tests and build**

Run:

```bash
npm test -- --run
npm run build
```

Expected: all unit tests PASS; build PASS.

- [ ] **Step 12: Commit**

```bash
git add src/main.ts src/style.css src/player/Inventory.ts
git commit -m "feat: integrate persistent survival campaign"
```

### Task 12: Add end-to-end campaign coverage and finish performance verification

**Files:**
- Create: `e2e/campaign-progression.spec.ts`
- Modify: `e2e/creative-flight.spec.ts`
- Modify: `e2e/level-progression.spec.ts`

- [ ] **Step 1: Add a shared readiness condition**

Wait for `window.__voxelverse_test` with:

```ts
await page.waitForFunction(() => Boolean((window as any).__voxelverse_test));
```

Replace arbitrary initial 500 ms waits in existing tests where practical.

- [ ] **Step 2: Write campaign E2E tests**

Cover:

- menu defaults to `基地战役`
- starting campaign shows chapter 1 HUD
- placing a valid shelter changes action to completion
- completing chapter 1 advances and grants reward once
- save/reload restores a placed campaign block and chapter
- defense failure returns to ready while the block remains

Use the development API for deterministic world placement and state transitions; use DOM locators for menu/HUD assertions.

- [ ] **Step 3: Run E2E and inspect failures**

Run: `npm run test:e2e`

Expected: all E2E tests PASS without 30-second `page.evaluate` stalls.

- [ ] **Step 4: Measure startup responsiveness**

Run one cold Chromium navigation and record time until `__voxelverse_test` exists. Target under 8 seconds on the local machine. If above target, reduce initial synchronous mesh builds further by creating the center chunk first and draining the queue over animation frames.

- [ ] **Step 5: Run final verification**

Run:

```bash
npm test -- --run
npm run build
npm run test:e2e
git diff --check
git status --short
```

Expected:

- all unit tests pass
- production build succeeds
- all E2E tests pass
- no whitespace errors
- only intended files are changed

- [ ] **Step 6: Commit**

```bash
git add e2e/campaign-progression.spec.ts e2e/creative-flight.spec.ts e2e/level-progression.spec.ts
git commit -m "test: cover persistent campaign progression"
```

### Task 13: Update product documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/requirements/task-tracker.md`

- [ ] **Step 1: Document the new primary loop**

Update README mode descriptions, campaign controls, combat behavior, persistence scope, and the distinction between campaign and free survival.

- [ ] **Step 2: Update task tracker truthfully**

Mark only implemented capabilities complete. Add a campaign milestone containing persistent base, five chapters, soft-failure defense, combat, and one local save slot.

- [ ] **Step 3: Verify docs and commit**

Run: `git diff --check`

Expected: no errors.

```bash
git add README.md docs/requirements/task-tracker.md
git commit -m "docs: describe survival building campaign"
```

---

## Final Acceptance Checklist

- [ ] Campaign is the default menu selection.
- [ ] Five chapters can progress in one world.
- [ ] Construction remains after chapter changes, chunk unload/reload, death, and browser reload.
- [ ] Player left-click attacks a targeted mob and otherwise mines normally.
- [ ] Campaign waves are bounded and do not mix with ambient spawning.
- [ ] Campaign creepers do not alter terrain.
- [ ] Defense failure keeps base, inventory, and claimed rewards.
- [ ] Free survival resumes the day/night cycle.
- [ ] Classic challenge and creative modes still work.
- [ ] Startup test API becomes available in under 8 seconds locally.
- [ ] Unit tests, build, and E2E suite all pass.
