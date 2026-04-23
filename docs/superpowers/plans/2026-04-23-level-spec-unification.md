# Level Spec Unification Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current split tutorial logic with a single level-spec source so preview rendering, progress tracking, hint counts, and completion checks are derived from the same structure definition.

**Architecture:** Introduce a `LevelSpec` layer that owns each tutorial level's target structure and validation rules. Migrate preview rendering, progress computation, and completion checks to consume compiled specs instead of duplicating counts and shape logic across `BuildingLevels.ts`, tests, and HUD code. Keep the initial migration focused on tutorial levels and existing HUD behavior rather than broader world/editor systems.

**Tech Stack:** TypeScript, Vitest, Vite, existing tutorial HUD in `src/main.ts`

---

## File Map

- Create: `src/tutorial/levelSpec.ts`
  Defines `LevelSpec`, target block roles, completion rule types, and spec helper utilities.
- Create: `src/tutorial/levelTemplates.ts`
  Contains parameterized builders for platform, tower, house, bridge, corridor, stairs, and custom-structure templates.
- Create: `src/tutorial/levelValidation.ts`
  Compiles a `LevelSpec` into reusable progress and completion evaluators for the live game and tests.
- Modify: `src/tutorial/BuildingLevels.ts`
  Shrink this file down to level catalog wiring plus backward-compatible `LevelGoal` exports driven by `LevelSpec`.
- Modify: `src/tutorial/levelPreview.ts`
  Render preview SVG from compiled spec blocks and role metadata rather than ad hoc shapes.
- Modify: `src/main.ts`
  Keep HUD wiring, but switch preview/progress/hint reads to compiled level data.
- Modify: `src/tests/BuildingLevels.test.ts`
  Replace magic-number expectations with spec-derived assertions and add regression coverage for level 4 consistency.
- Modify: `src/tests/LevelPreview.test.ts`
  Assert preview output reflects spec roles and vertical structures.
- Create: `src/tests/LevelSpec.test.ts`
  Unit tests for template output, role counts, and derived rule metadata.
- Create: `src/tests/LevelValidation.test.ts`
  Unit tests for spec-driven completion/progress evaluation independent of HUD.

## Chunk 1: Establish The Shared Level Spec Model

### Task 1: Add the failing tests for the new spec model

**Files:**
- Create: `src/tests/LevelSpec.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { createHouseSpec, createTowerSpec } from '../tutorial/levelTemplates';

describe('level templates', () => {
  it('creates a house spec with explicit floor and wall roles', () => {
    const spec = createHouseSpec({
      id: 'house_small',
      title: '小房子',
      floorSize: 3,
      wallHeight: 1,
      doorway: { x: 0, z: -1 },
    });

    const floor = spec.target.blocks.filter((block) => block.role === 'floor');
    const walls = spec.target.blocks.filter((block) => block.role === 'wall');

    expect(floor).toHaveLength(9);
    expect(walls).toHaveLength(7);
    expect(spec.target.rules).toContainEqual({ type: 'match_count', role: 'wall', required: 7 });
  });

  it('creates a tower spec that exposes vertical height in the target blocks', () => {
    const spec = createTowerSpec({
      id: 'tower_small',
      title: '小小高塔',
      height: 3,
    });

    expect(spec.target.blocks.map((block) => block.y)).toEqual([0, 1, 2]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/tests/LevelSpec.test.ts`
Expected: FAIL because `levelTemplates.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `src/tutorial/levelSpec.ts` with:
- `LevelSpec`
- `TargetBlockRole`
- `CompletionRule`
- helper types for doorway/template params

Create `src/tutorial/levelTemplates.ts` with:
- `createTowerSpec`
- `createPlatformSpec`
- `createHouseSpec`
- shared block-role emitters

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/tests/LevelSpec.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/tutorial/levelSpec.ts src/tutorial/levelTemplates.ts src/tests/LevelSpec.test.ts
git commit -m "feat: add shared tutorial level spec templates"
```

## Chunk 2: Add A Shared Validation Layer

### Task 2: Move completion/progress logic behind spec-driven validation

**Files:**
- Create: `src/tests/LevelValidation.test.ts`
- Create: `src/tutorial/levelValidation.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { ChunkManager } from '../engine/ChunkManager';
import { Vec3 } from '../utils/Vec3';
import { createHouseSpec } from '../tutorial/levelTemplates';
import { evaluateLevelSpec } from '../tutorial/levelValidation';
import { BLOCK_PLANKS } from '../blocks/BlockRegistry';

describe('evaluateLevelSpec', () => {
  it('keeps preview, progress, and validation aligned for level 4', () => {
    const cm = new ChunkManager(42);
    const spec = createHouseSpec({
      id: 'house_small',
      title: '小房子',
      floorSize: 3,
      wallHeight: 1,
      doorway: { x: 0, z: -1 },
    });

    for (const block of spec.target.blocks) {
      if (block.role === 'void') continue;
      cm.setBlock(block.x, block.y + 18, block.z, BLOCK_PLANKS);
      cm.markPlayerPlaced(block.x, block.y + 18, block.z);
    }

    const result = evaluateLevelSpec(spec, cm, new Vec3(0, 20, 0), { originY: 18 });

    expect(result.complete).toBe(true);
    expect(result.progress.find((item) => item.label === '围墙')).toEqual({
      current: 7,
      target: 7,
      label: '围墙',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/tests/LevelValidation.test.ts`
Expected: FAIL because `evaluateLevelSpec` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

In `src/tutorial/levelValidation.ts`:
- compile `match_count` rules by role
- count matching player-placed blocks relative to detected anchor/origin
- return `{ complete, progress }`

Keep this first pass scoped to current tutorial needs:
- role-based counts
- optional doorway/void exclusions
- no generalized fuzzy shape matching yet

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/tests/LevelValidation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/tutorial/levelValidation.ts src/tests/LevelValidation.test.ts
git commit -m "feat: add spec-driven tutorial validation"
```

## Chunk 3: Migrate BuildingLevels To Specs

### Task 3: Replace duplicated tutorial metadata with compiled `LevelSpec`s

**Files:**
- Modify: `src/tutorial/BuildingLevels.ts`
- Modify: `src/tests/BuildingLevels.test.ts`

- [ ] **Step 1: Write the failing test**

Add/replace tests in `src/tests/BuildingLevels.test.ts` asserting:
- level 4 preview role counts match progress targets
- level 8 has preview blocks generated from its spec
- every tutorial level exports a compiled preview and derived progress labels without hard-coded mismatches

Minimal target:

```ts
it('keeps level 4 preview and progress targets aligned', () => {
  const level = LEVELS[3];
  const wallBlocks = level.targetBlocks!.filter((block) => block.role === 'wall');
  const wallProgress = level.getProgress!(new ChunkManager(42), new Vec3(0, 20, 0))[1];

  expect(wallBlocks).toHaveLength(wallProgress.target);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/tests/BuildingLevels.test.ts`
Expected: FAIL because `targetBlocks` currently do not carry role metadata and progress is still hard-coded.

- [ ] **Step 3: Write minimal implementation**

In `src/tutorial/BuildingLevels.ts`:
- define a compiled tutorial catalog from `LevelSpec`s
- remove ad hoc preview helper counts where spec already covers them
- derive `hint` counts from spec data where the hint references a count
- keep `LevelGoal` API stable for now so `main.ts` does not need a wide rewrite in the same step

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/tests/BuildingLevels.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/tutorial/BuildingLevels.ts src/tests/BuildingLevels.test.ts
git commit -m "refactor: derive tutorial goals from level specs"
```

## Chunk 4: Make The Preview Renderer Consume Spec Roles

### Task 4: Upgrade preview rendering to show vertical structure and semantic roles

**Files:**
- Modify: `src/tutorial/levelPreview.ts`
- Modify: `src/tests/LevelPreview.test.ts`
- Modify: `src/style.css`

- [ ] **Step 1: Write the failing test**

Update `src/tests/LevelPreview.test.ts` so it asserts:
- top/left/right faces still exist
- wall/floor/void roles can influence face treatment
- vertical structures produce a taller preview than flat structures of the same footprint

```ts
it('renders wall and floor roles distinctly for a house spec', () => {
  const layout = getLevelPreviewLayout([
    { x: 0, y: 0, z: 0, color: 0xb8864b, role: 'floor' },
    { x: 0, y: 1, z: 0, color: 0xe1d2bb, role: 'wall' },
  ]);

  expect(layout.topFaces[0].fill).not.toBe(layout.topFaces[1].fill);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/tests/LevelPreview.test.ts`
Expected: FAIL because preview polygons do not yet use role metadata.

- [ ] **Step 3: Write minimal implementation**

In `src/tutorial/levelPreview.ts`:
- extend `TargetBlock` metadata consumption to include `role`
- style floor/wall/roof/support/void blocks differently
- keep the renderer SVG-based

In `src/style.css`:
- only adjust preview container sizing if needed for taller shapes

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/tests/LevelPreview.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/tutorial/levelPreview.ts src/tests/LevelPreview.test.ts src/style.css
git commit -m "feat: render tutorial previews from spec roles"
```

## Chunk 5: Switch The HUD And Runtime To Compiled Spec Data

### Task 5: Keep the runtime HUD thin and spec-driven

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Write the failing test**

Prefer a narrow unit-style regression over browser automation. Add assertions to existing tutorial tests that current level HUD data uses compiled spec counts:

```ts
it('exposes level 4 wall target count from the compiled spec', () => {
  const level = LEVELS[3];
  expect(level.getProgress!(new ChunkManager(42), new Vec3(0, 20, 0))[1].target).toBe(
    level.targetBlocks!.filter((block) => block.role === 'wall').length,
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/tests/BuildingLevels.test.ts`
Expected: FAIL before `main.ts`/runtime are fully reading compiled data.

- [ ] **Step 3: Write minimal implementation**

In `src/main.ts`:
- keep `renderLevelPreview()` as a thin renderer call
- do not compute counts in HUD code
- ensure level hint/progress/preview are all sourced from compiled level output

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/tests/BuildingLevels.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/tests/BuildingLevels.test.ts
git commit -m "refactor: use compiled specs for tutorial hud"
```

## Chunk 6: Final Verification And Cleanup

### Task 6: Run full verification and document migration constraints

**Files:**
- Modify: `src/tutorial/BuildingLevels.ts` (comments only if needed)
- Modify: `README.md` or `docs/` only if adding a short note helps future level authors

- [ ] **Step 1: Run full tests**

Run: `npm test`
Expected: PASS for all test files

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: PASS, allowing the existing non-blocking Vite chunk-size warning

- [ ] **Step 3: Add a short authoring note**

Document, near the spec/template code or in docs, how new levels should be added:
- define template params or custom blocks
- define role-based rules
- avoid hard-coded progress counts outside the spec

- [ ] **Step 4: Commit**

```bash
git add src/tutorial/BuildingLevels.ts src/tutorial/levelSpec.ts src/tutorial/levelTemplates.ts src/tutorial/levelValidation.ts src/tutorial/levelPreview.ts src/main.ts src/tests/BuildingLevels.test.ts src/tests/LevelPreview.test.ts src/tests/LevelSpec.test.ts src/tests/LevelValidation.test.ts README.md docs
git commit -m "refactor: unify tutorial specs and validation"
```

