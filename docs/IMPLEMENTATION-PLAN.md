# Implementation plan

1. Audit the current L5R5e public API, Foundry VTT 14 manifests and `ApplicationV2`, and the reference dock's behavior.
2. Build privacy policy, actor adapters, descriptive state profiles, and sanitized view-models with unit tests.
3. Build the `ApplicationV2` combat dock, native Combat controls, effects, L5R5e turn signals, and responsive layouts.
4. Build the versioned event timeline, conflict setup, JournalEntry templates, round activation, and a sanitized horizon view.
5. Add native participant creation, withdrawal/history, authoritative dead/defeated cleanup, and late-arrival delegation.
6. Add the minimal `game.l5r5e.lateArrivals` core service in the system repository and raise the module requirement to the first system release that contains it.
7. Complete Polish/English localization, accessibility, automated checks, release packaging, and the manual Foundry VTT checklist.

## Integration points found by the audit

- Combat order and controls: `combat.turns`, `Combat.rollInitiative`, `rollNPC`, `startCombat`, `endCombat`, `previousTurn`, `nextTurn`, `resetAll`.
- L5R5e state: `game.l5r5e.turns.getState(combatant, { combat })` and `game.l5r5e.turns.getters(state)`.
- Movement: `game.l5r5e.movement.remaining` and `undoMovement`.
- Conditions: `game.l5r5e.conditions.thresholdState(actor)` and Actor status/effect documents.
- Authority: `game.l5r5e.authority.isAuthority()`; only that GM writes timeline triggers or automatic removals.
- Participant creation: V14 `TokenDocument.implementation.createCombatants(tokens, { combat })`, then `Combat.getCombatantsByToken/Actor` for duplicate checks.
- Event lifecycle: V14 `combatStart`, `combatRound`, `combatTurnChange`, plus document hooks for durable, idempotent state.
- Refresh hooks: L5R5e turn/action/movement/roll hooks and Foundry Combat, Combatant, Actor, ActiveEffect, Scene, canvas, and tracker hooks.
- Compendium templates: JournalEntry indices/cache, one-document `fromUuid` loading, and writable world JournalEntry packs.
- Missing core boundary: `game.l5r5e.lateArrivals`; system `1.14.102` also ignores an explicit adversary initiative TN in `messageOptions`.
