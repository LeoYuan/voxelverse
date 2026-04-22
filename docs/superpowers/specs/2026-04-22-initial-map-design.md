# Initial Map Design

Date: 2026-04-22

## Goal

Make the initial map feel more interesting by emphasizing guided exploration.

The opening experience should:

- pull the player toward a clear first destination
- naturally form a short early-game route
- teach basic actions through the world layout rather than heavy UI
- preserve the sandbox feel after the first few points of interest

## Chosen Direction

Use a ring-shaped "light tutorial village" layout centered on the spawn area.

The player starts in a safe central plaza and is visually guided through a short sequence of points:

1. material point
2. building point
3. utility point
4. reward / lookout point

This is intentionally not a linear corridor. The layout should feel like a small living starter area with a recommended route.

## Experience Principles

### 1. World-led guidance

The map should guide primarily through:

- sightlines
- paths
- elevation
- landmarks
- partial structures that imply a next action

Avoid relying on extra UI overlays or verbose instructions.

### 2. One lesson per node

Each point of interest should communicate one main idea:

- material point: collect
- building point: build
- utility point: interact with systems
- reward point: look outward and continue exploring

### 3. Short-distance progression

Each early destination should be reachable quickly from the previous one.

Target feel:

- first destination visible immediately from spawn
- each follow-up point reachable within roughly 5-15 seconds
- reward point slightly farther, but visible from multiple earlier nodes

## Layout

### Spawn Plaza

Purpose:

- provide a safe, legible center
- frame the first route
- let the player immediately read the surrounding opportunities

Design:

- flat, clean central area
- one strongest visible path leaving the plaza
- clear sightline to at least one secondary landmark

Avoid:

- clutter
- too many interactables at once
- full starter-base complexity directly at spawn

### Material Point

Purpose:

- communicate that the world is meant to be mined / harvested

Design:

- very near spawn
- simple, readable resources
- likely a small tree cluster plus exposed stone or a shallow pit

Should feel like:

"I can start here right now."

### Building Point

Purpose:

- convert collected materials into a natural build prompt

Design:

- a partial structure, not a completed house
- examples: foundation, a few pillars, incomplete wall line, open doorway frame

Should feel like:

"This place wants me to finish it."

### Utility Point

Purpose:

- reveal that the game supports more than placing blocks

Design:

- a compact crafting / smelting / simple redstone area
- readable in one glance
- not mechanically dense

Should feel like:

"There is another layer of play here."

### Reward / Lookout Point

Purpose:

- give the player a medium-distance destination
- reward movement with broader map comprehension

Design:

- visually stronger than other nodes
- preferably slightly elevated
- examples: tower, windmill, lookout platform, lit marker

Should feel like:

"If I go there, I will understand the whole starting area."

## Content Limits

To keep the map readable:

- one primary visual landmark
- two to three nearby functional nodes
- one elevated reward point
- no dense scatter of unrelated props around spawn

The area should feel curated, not crowded.

## Implementation Strategy

### Existing Structure

Keep the current hand-authored starter scene approach.

Do not replace world generation or build a separate level system for the starting map.

### Change Scope

Refactor the current initial scene placement in `src/main.ts` so that existing structures are repositioned and repurposed into guided nodes.

Expected work:

- redesign spawn into a true central plaza
- re-sequence existing POIs by discovery order
- strengthen connecting paths
- improve sightlines between nodes
- simplify or remove scene clutter that weakens route readability

### Non-Goals

This iteration should not include:

- a procedural POI system
- a quest tracker
- a new tutorial UI framework
- save-format changes
- a total rewrite of world initialization

## Verification

Implementation should be considered successful if:

- a new player can identify an obvious first destination from spawn
- the next destination becomes visually understandable after reaching the prior one
- the starting area feels more memorable and less like a set of disconnected buildings
- existing tests and build continue to pass

