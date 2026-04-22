# Initial Map Guided Exploration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the hand-authored starting area into a guided exploration village that naturally leads the player through a short early-game route.

**Architecture:** Keep the existing hand-built startup scene in `src/main.ts`, but reorganize it around a central spawn plaza plus a ring of purposeful points of interest. Extract scene-layout helpers where needed so the route logic is readable, while preserving current world generation, HUD, and interaction systems.

**Tech Stack:** TypeScript, Vite, Three.js, Vitest

---

## File Map

### Existing files to modify

- `src/main.ts`
  - Owns the current startup scene, spawn platform, path building, and point-of-interest placement.
  - Will be updated to build a central plaza and resequence POIs into a guided route.
- `src/tests/`
  - A new scene-layout-focused test file should be added if layout helpers become pure enough to test directly.

### Files to create only if needed

- `src/world/initialSceneLayout.ts`
  - Optional helper module for spawn/POI coordinates and route definitions if `src/main.ts` becomes harder to reason about.
- `src/tests/InitialSceneLayout.test.ts`
  - Optional test file for pure layout helpers if they are extracted.

### Verification files

- `src/main.ts`
- `src/tests/*.test.ts`

## Chunk 1: Define the Route Layout

### Task 1: Capture current scene responsibilities before moving pieces

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Identify and list current startup scene units in comments or notes**

Review:
- `buildInitialScene()`
- `buildWoodenHouse()`
- `buildBrickHouse()`
- `buildStorageShed()`
- `buildStoneTower()`
- `buildMineEntrance()`
- `buildFarmPlot()`
- `buildRedstoneDemo()`
- `buildVillagePaths()`
- spawn platform logic near `spawnY`

Expected outcome:
- clear mapping from current structures to new roles: spawn plaza, material point, building point, utility point, reward point

- [ ] **Step 2: Decide the new route order and coordinates**

Target route:
1. central spawn plaza
2. nearby material point
3. nearby partial build site
4. compact utility point
5. visible elevated reward point

Expected outcome:
- concrete coordinates for each point
- no implementation yet

- [ ] **Step 3: Commit planning checkpoint**

```bash
git add src/main.ts
git commit -m "chore: outline guided initial scene layout"
```

Only commit if code or inline structure notes were actually changed.

## Chunk 2: Rebuild Spawn as the Center

### Task 2: Turn the technical spawn pad into a readable plaza

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Write the failing test or verifiable assertion target**

If a pure helper is extracted:

```ts
it('places spawn at the center of the guided route', () => {
  const layout = getInitialSceneLayout();
  expect(layout.spawn).toEqual({ x: 0, z: 0 });
});
```

If no helper is extracted:
- define manual verification target in comments and use runtime verification later

- [ ] **Step 2: Run focused test if a helper test exists**

Run:

```bash
npm test -- src/tests/InitialSceneLayout.test.ts
```

Expected:
- failing assertion or missing helper

- [ ] **Step 3: Implement the plaza**

In `src/main.ts`:
- replace the current plain spawn platform with a small plaza
- keep it flat and safe
- ensure one strongest outgoing path is visually obvious
- keep view lines open toward the next two points

Keep scope tight:
- no extra UI
- no quest logic

- [ ] **Step 4: Run focused verification**

If helper tests exist:

```bash
npm test -- src/tests/InitialSceneLayout.test.ts
```

If not:
- run the full build after later tasks in this chunk

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/tests/InitialSceneLayout.test.ts src/world/initialSceneLayout.ts
git commit -m "feat: redesign spawn into central plaza"
```

Stage only the files that actually changed.

## Chunk 3: Convert Structures into Guided Nodes

### Task 3: Rework the nearest point into a material node

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Write a failing test for extracted layout metadata, if applicable**

```ts
it('places the material node closest to spawn', () => {
  const layout = getInitialSceneLayout();
  expect(layout.materialPoint.distanceFromSpawn).toBeLessThan(layout.utilityPoint.distanceFromSpawn);
});
```

- [ ] **Step 2: Run the focused test**

Run:

```bash
npm test -- src/tests/InitialSceneLayout.test.ts
```

- [ ] **Step 3: Implement the material point**

Update `src/main.ts` so the closest point:
- contains obvious harvestable resources
- is readable immediately from spawn
- invites the first interaction without clutter

Likely source structures:
- tree cluster
- exposed stone
- shallow pit / mine mouth

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- src/tests/InitialSceneLayout.test.ts
```

or defer to full verification if using manual scene validation only

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/tests/InitialSceneLayout.test.ts src/world/initialSceneLayout.ts
git commit -m "feat: add guided material point near spawn"
```

### Task 4: Convert one nearby area into a partial build site

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Write the failing test for build-site placement, if applicable**

```ts
it('places the building point after the material point in the route', () => {
  const layout = getInitialSceneLayout();
  expect(layout.buildingPoint.distanceFromSpawn).toBeGreaterThan(layout.materialPoint.distanceFromSpawn);
});
```

- [ ] **Step 2: Run the test to verify failure**

Run:

```bash
npm test -- src/tests/InitialSceneLayout.test.ts
```

- [ ] **Step 3: Implement the building point**

Change one current structure or area into a partial build prompt:
- incomplete frame
- foundation
- partial walls
- readable open doorway

Important:
- do not make it a fully solved building
- it should clearly suggest player completion

- [ ] **Step 4: Run focused verification**

Run:

```bash
npm test -- src/tests/InitialSceneLayout.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/tests/InitialSceneLayout.test.ts src/world/initialSceneLayout.ts
git commit -m "feat: add guided building point"
```

### Task 5: Reposition the utility point and reward landmark

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Write the failing test for route ordering, if applicable**

```ts
it('keeps the reward landmark farther than the utility point', () => {
  const layout = getInitialSceneLayout();
  expect(layout.rewardPoint.distanceFromSpawn).toBeGreaterThan(layout.utilityPoint.distanceFromSpawn);
});
```

- [ ] **Step 2: Run the test to verify failure**

Run:

```bash
npm test -- src/tests/InitialSceneLayout.test.ts
```

- [ ] **Step 3: Implement utility and reward points**

Update `src/main.ts` so that:
- utility point contains a compact, readable systems teaser
- reward point is elevated or otherwise strongly visible
- reward point can be seen from multiple earlier nodes

Candidate reuse:
- brick house / smelting zone
- redstone demo
- stone tower as lookout landmark

- [ ] **Step 4: Run focused verification**

Run:

```bash
npm test -- src/tests/InitialSceneLayout.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/tests/InitialSceneLayout.test.ts src/world/initialSceneLayout.ts
git commit -m "feat: add utility point and lookout landmark"
```

## Chunk 4: Strengthen Movement Through the World

### Task 6: Rebuild the connecting paths around the new route

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Write the failing test for path connections, if helpers were extracted**

```ts
it('connects spawn to each guided node with a defined path segment', () => {
  const layout = getInitialSceneLayout();
  expect(layout.paths.length).toBeGreaterThanOrEqual(4);
});
```

- [ ] **Step 2: Run the focused test**

Run:

```bash
npm test -- src/tests/InitialSceneLayout.test.ts
```

- [ ] **Step 3: Implement route-first pathing**

Update path construction so:
- the strongest route leaves spawn toward the material point
- later branches remain readable
- paths support the ring feel instead of unrelated spokes

Avoid:
- overbuilding paths everywhere
- making the map feel like a corridor

- [ ] **Step 4: Verify the path logic**

Run:

```bash
npm test -- src/tests/InitialSceneLayout.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/tests/InitialSceneLayout.test.ts src/world/initialSceneLayout.ts
git commit -m "feat: rebuild starter village paths for guided exploration"
```

### Task 7: Reduce clutter and reinforce sightlines

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Define manual acceptance criteria**

Document in code comments or plan notes:
- spawn should see the first destination
- at least one later landmark should be visible early
- ambient decoration should not obscure route readability

- [ ] **Step 2: Make minimal world-polish changes**

In `src/main.ts`:
- relocate or reduce ambient clutter that distracts from route reading
- preserve atmosphere with a smaller number of stronger details
- keep one dominant landmark and a few supporting points

- [ ] **Step 3: Run build verification**

Run:

```bash
npm run build
```

Expected:
- successful production build

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat: tune initial scene sightlines and atmosphere"
```

## Chunk 5: Full Verification

### Task 8: Run automated verification

**Files:**
- Test: `src/tests/*.test.ts`

- [ ] **Step 1: Run any new focused tests**

Run:

```bash
npm test -- src/tests/InitialSceneLayout.test.ts
```

Only if such a file was created.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npm test
```

Expected:
- all tests pass

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected:
- build succeeds

- [ ] **Step 4: Manual runtime review**

Run:

```bash
npm run dev
```

Manual checks:
- spawn plaza reads clearly
- first destination is obvious
- route progression feels natural
- reward landmark is visible and enticing
- map feels more memorable than the previous scattered village

- [ ] **Step 5: Final commit**

```bash
git add src/main.ts src/world/initialSceneLayout.ts src/tests/InitialSceneLayout.test.ts
git commit -m "feat: redesign initial map for guided exploration"
```

Again, only include files that actually changed.

Plan complete and saved to `docs/superpowers/plans/2026-04-22-initial-map-guided-exploration.md`. Ready to execute?
