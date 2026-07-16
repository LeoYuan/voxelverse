# Persistent Survival-Building Campaign Design

Date: 2026-07-16

## Goal

Turn VoxelVerse's existing building, survival, crafting, furnace, mob, and tutorial systems into one replayable core loop:

> Build a lasting base during preparation, defend it through a short night, keep the world and rewards, then expand for the next chapter.

The experience should remain approachable. Failure should create a reason to try again without deleting the player's construction work or long-term progress.

## Product Direction

### Considered approaches

1. **Dynamic sandbox objectives**
   - Strength: maximum freedom.
   - Weakness: goals feel disconnected without a larger content-generation system.
2. **Wave-defense-first game**
   - Strength: immediate pressure and clear scoring.
   - Weakness: combat would overshadow VoxelVerse's building identity.
3. **Persistent-world chapter campaign**
   - Strength: reuses the existing world, level validation, crafting, furnace, and mobs while giving every system a purpose.
   - Weakness: requires a small campaign state and persistence layer.

The chosen approach is the persistent-world chapter campaign. After the authored chapters, the same world transitions into an escalating repeatable defense mode.

## Player Experience

### Core loop

1. Read the current chapter objective.
2. Gather or use resources in the existing world.
3. Build the requested structure or utility.
4. Claim the chapter reward.
5. Start a short defense night.
6. Survive or retry with the same base.
7. Unlock the next construction challenge.

The player should always understand:

- what to build now
- why it helps with the next defense
- what reward is coming
- what is preserved after failure

### Tone and difficulty

- The campaign is relaxed rather than punishing.
- Preparation has no time limit.
- Defense waves are short and bounded.
- Enemies do not damage structural blocks in campaign defense.
- Creeper explosions may damage ordinary terrain during free survival, but campaign creepers damage entities only.
- Death keeps the base, chapter unlocks, and inventory.
- The active defense wave restarts from the beginning.

## Campaign Structure

The first version contains five chapters in one persistent world.

| Chapter | Preparation objective | Defense | Reward |
|---|---|---|---|
| 1. Establish the Outpost | Build a compact shelter: 3×3 floor and at least 7 surrounding wall blocks | None | Stone pickaxe and cooked food |
| 2. Light the Hearth | Place a crafting table and furnace near the starting base | 30 seconds, 3 attackers | Iron ore, wood, and building blocks |
| 3. First Night | Add at least 16 player-placed defensive blocks after the chapter begins | 45 seconds, 5 attackers | Iron pickaxe and cooked food |
| 4. Fortify the Base | Add at least 28 defensive blocks and one redstone lamp near the base | 55 seconds, 7 attackers | Redstone components and glass |
| 5. Hold Until Dawn | Add at least 40 defensive blocks and maintain two redstone lamps near the base | 70 seconds, 10 attackers | Endless defense mode |

Chapter numbers, timers, and enemy counts are configuration data rather than UI conditionals.

### Objective rules

- Shelter validation reuses the existing house-validation logic.
- Utility objectives scan for required player-placed block IDs within the campaign base radius.
- Reinforcement objectives count blocks placed after the current chapter started, preventing old construction from instantly completing every later chapter.
- Defense progress consists of both remaining time and attackers defeated.
- A defense completes only when its timer expires and its required kill count has been reached.

### Starting and retrying defense

- Completing preparation changes the primary action to `开始守夜`.
- The player chooses when to start; preparation never transitions into combat automatically.
- Starting defense moves world time to night and enables campaign spawning.
- Winning moves time to daytime, grants the reward once, saves progress, and unlocks the next chapter.
- Dying during defense clears campaign enemies, respawns the player at the base, resets health and hunger, and returns the chapter to `准备就绪`.

## Combat

### Player attack

- A primary click first checks for a living mob under the crosshair within four blocks.
- If a mob is hit, the click attacks instead of mining a block.
- If no mob is hit, existing mining and block-breaking behavior continues unchanged.
- Attack damage depends on the selected item:
  - empty hand or block: 2
  - wooden pickaxe: 3
  - stone pickaxe: 4
  - iron pickaxe: 5
  - diamond pickaxe: 6
- A short attack cooldown prevents click-spamming from bypassing difficulty.
- Successful hits produce visible feedback through a brief mob color flash and knockback.

### Campaign enemies

- Campaign waves use the existing zombie, skeleton, and creeper classes.
- Early waves favor zombies; later waves introduce skeletons and creepers.
- Only enemies spawned by the active campaign wave count toward campaign kills.
- Campaign spawning is separate from ambient night spawning to prevent double populations.
- Campaign creepers retain their fuse and player damage but skip terrain destruction.
- All active campaign enemies are removed on wave victory, retry, mode change, or save load.

## Persistence

The first version uses versioned `localStorage` data because the modified-world footprint is small and this keeps implementation focused. IndexedDB remains the later full-save target.

### Saved campaign data

- save version
- current chapter
- current campaign phase
- claimed rewards
- inventory slots and selected slot
- player position and respawn point
- player-placed and player-removed block mutations
- current endless-wave index after campaign completion

### World mutation model

`ChunkManager` becomes the source of truth for changed blocks:

- every player mutation records `{x, y, z, blockId}`
- generated blocks removed by the player are recorded as block ID `0`
- mutations are reapplied whenever a generated chunk is loaded
- unloading and regenerating a chunk therefore preserves construction
- mutation records can be exported and imported without exposing chunk internals
- imports reject non-integer coordinates, unknown block IDs, and unreasonably large mutation lists

### Save timing

- after each chapter completion
- after a defense failure
- every ten seconds while playing campaign mode
- on `beforeunload`

Malformed or unsupported save data is ignored safely and starts a new campaign. Loading must not partially apply invalid inventory or world mutation data.

The main menu includes `继续战役` when a valid save exists and `新战役` to explicitly clear campaign progress.

## UI

### Main menu

The default and visually primary mode becomes `基地战役`.

Other existing modes remain available:

- free building
- free survival
- classic building challenges

### Campaign HUD

A compact panel replaces the building-level HUD while campaign mode is active:

- chapter number and title
- current phase: preparation, ready, defense, complete
- objective description
- progress bars or counts
- upcoming reward
- `开始守夜` or `重新挑战` action when applicable

During defense it additionally shows:

- remaining seconds
- defeated / required enemies
- wave number

Completion uses one short result panel and then returns control to the same world.

## Architecture

### `CampaignManager`

Pure campaign state machine with no DOM or Three.js dependencies.

Responsibilities:

- hold chapter configuration
- track chapter phase
- evaluate generic progress inputs
- start, tick, win, and fail defense
- grant each chapter reward at most once
- export and import campaign state

It consumes a small snapshot supplied by the game:

```ts
interface CampaignProgressInput {
  shelterComplete: boolean;
  requiredBlocksPlaced: Record<number, number>;
  placedSinceChapterStart: number;
  defeatedWaveEnemies: number;
  remainingWaveEnemies: number;
}
```

It emits state transitions and rewards; it does not mutate inventory, mobs, time, or the world directly.

### `CampaignRuntime`

Integration layer owned by the game entry point.

Responsibilities:

- translate world state into `CampaignProgressInput`
- apply rewards to inventory
- start and clear campaign waves
- switch day/night presentation
- handle campaign death and respawn
- request saves after important transitions

### `CampaignSaveStore`

Small versioned persistence adapter.

Responsibilities:

- validate serialized data
- save and load one campaign slot
- clear the campaign slot
- avoid direct dependencies on UI or rendering

### Existing-system changes

- `PlayerController` receives an optional primary-attack callback.
- `Mob` gains hit feedback and knockback support.
- `ChunkManager` exports/imports persistent block mutations.
- `main.ts` wires modules together but does not own campaign rules.

The implementation should move campaign behavior out of the already large `main.ts`; unrelated rendering or UI refactors are out of scope.

## Performance Requirements

The campaign must not worsen the current startup bottleneck. This work also includes two targeted fixes needed for playable browser behavior:

- reduce the initial render distance from 8 to a conservative default of 4
- only update chunk loading when the player crosses into a different chunk, not every animation frame

Chunk meshes are created incrementally for newly loaded chunks. Campaign objective evaluation runs at a fixed low frequency, such as four times per second, rather than every frame.

The broader renderer rewrite, greedy meshing, texture atlases, and LOD remain out of scope.

## Error Handling and Edge Cases

- Rewards are idempotent and cannot be duplicated by reloading.
- Starting defense is rejected unless preparation is complete.
- Mode switching clears active campaign enemies and pauses campaign timers.
- A save made during defense loads into `准备就绪`, not into a half-restored battle.
- Inventory overflow leaves excess reward pending and displays a message; claiming can be retried after space is freed.
- Player construction outside the currently loaded area remains preserved through mutation records.
- Destroying an objective block before beginning defense returns the chapter to preparation.
- Ambient mobs never increment campaign kill progress.

## Testing

### Unit tests

- campaign phase-transition matrix
- reward idempotency
- defense timer and kill requirements
- soft-failure reset behavior
- chapter-relative block counting
- save validation and version handling
- chunk mutation export/import and reapplication
- attack damage and cooldown rules

### Integration tests

- complete chapter 1 by building a valid shelter
- place utility blocks and start chapter 2 defense
- kill a campaign mob and update wave progress
- die during a defense and verify base/progress preservation
- reload and verify inventory, campaign chapter, and block mutations

### Regression checks

- existing creative building challenges still work
- free survival spawning still works after the day/night pause issue is corrected
- existing 168 unit tests remain green
- production build succeeds

## Scope Boundaries

Included:

- five persistent campaign chapters
- player-to-mob combat
- short defense waves
- soft failure and retry
- lightweight campaign/world persistence
- campaign HUD and menu entry
- targeted chunk-loading performance fixes

Not included:

- enemies that pathfind through or intentionally mine walls
- base-core health
- traps, turrets, armor, swords, bows, or a full technology tree
- procedural quests
- multiple save slots
- cloud saves or multiplayer
- a renderer rewrite

## Success Criteria

- A new player can enter the campaign and understand the first objective without reading the controls page.
- The player can build a shelter, unlock a defense, attack enemies, survive or retry, and continue in the same world.
- Losing a defense never deletes construction or previously claimed progress.
- Closing and reopening the browser restores the base and current chapter.
- The first authored campaign can be completed, after which repeatable defense remains available.
- Startup and normal interaction remain responsive enough for automated browser tests and ordinary desktop play.
