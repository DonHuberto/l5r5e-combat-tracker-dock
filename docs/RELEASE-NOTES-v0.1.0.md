# L5R5e Combat Tracker Dock 0.1.0

This is the first independent release of a native Foundry VTT 14 Combat Tracker Dock for the `l5r5e` system.

## Relationship to the original reference dock

The public `combat-tracker-dock` project was audited only as a UX and settings reference. Its repository did not provide a repository-wide license suitable for source or asset reuse, so this module is a clean-room implementation with independent JavaScript, Handlebars, CSS, architecture, localization, tests, and release metadata.

Compared with the reference dock, this release:

- reimplements docked and floating layouts, horizontal/vertical orientation, alignment, portrait sizing/aspect, roundness, auto-fit/scroll/fixed overflow, disposition colors, token/actor image selection, initiative badges, compact toolbar, conflicting-UI hiding, and previous/next-turn keybindings;
- replaces arbitrary resource paths with explicit L5R5e adapters and an OWNER/GM-only exact-data policy;
- replaces generic resource bars for non-owners with validated, configurable descriptive states that never expose value, maximum, percentage, bar width, tooltip numbers, or movement budget;
- replaces fake event Combatants with a versioned event timeline stored on Combat;
- replaces custom initiative sorting and Tagger-based grouping with the canonical `combat.turns`, `Combat#rollInitiative`, `Combat#rollNPC`, and `flags.l5r5e.initiativeGroupId` APIs;
- replaces hide-only defeated handling with authoritative removal of dead Combatants and optionally defeated minions, while preserving Actors and Tokens;
- intentionally omits arbitrary CSS/assets, arbitrary attribute paths, player-to-player exact-data overrides, private sorters, executable event scripts, and reference assets because of privacy, public-API, mechanics, or licensing constraints.

## New L5R5e functionality

- Added privacy-safe adapters for character, adversary, minion, army, and generic Combatants.
- Added world-configurable Fatigue, Strife, Army Strength, and Army Discipline profiles with zero to four active states, English/Polish labels, safe colors, validation, preview, ordering, and default restoration.
- Added terminal-state precedence for Incapacitated, Defeated, Compromised, and army end-of-round threshold warnings without mutating conditions.
- Added dynamic ActiveEffect display, permission-aware removal, safe descriptions, and OWNER/GM-only Dying round details.
- Added stance, primary action, free movement, Water action, Wait, Guard, and movement-undo indicators from public L5R5e services.
- Added native Combat start/end, previous/next turn, reset, single initiative, and NPC initiative controls, including valid initiative zero.
- Added Conflict Setup with participants, absolute/relative scheduling, activate-now confirmation, ordering, moving, resolving, deleting, visibility, safe chat cards, and localized fallbacks.
- Added cached JournalEntry event templates, drag-and-drop snapshots, `sourceUuid`, writable-pack selection, and Save as Template.
- Added a sanitized current-plus-future-round horizon with 1–10 configurable future rounds, GM drag-and-drop, pending late arrivals, and no hidden placeholders.
- Added selected-token, Actor, Token, actor-only, and drag-and-drop participant creation through public Foundry APIs with duplicate checks and actor-only warnings.
- Added Withdraw with confirmation and departure history without applying Dead or Defeated.
- Added authority-only, idempotent cleanup for Dead and optionally defeated minion Combatants.
- Added integration with the new `game.l5r5e.lateArrivals` service from system `1.14.103` for Intrigue, Skirmish, Duel, and Mass Battle.
- Added responsive styling, accessibility labels, no-canvas/other-scene guards, debounced refresh hooks, and complete listener cleanup.

## Quality and packaging

- Added English and Polish localization with 159-key parity validation.
- Added 24 automated module tests covering privacy, leaks, profiles, thresholds, initiative, events, horizon, removal, participants, hooks, and localization/build validation.
- Added syntax, format, manifest, localization, build, CI, and ZIP packaging scripts without runtime dependencies.
- Added API audit, feature matrix, core-patch boundary, implementation plan, and Foundry VTT 14 manual two-client checklist.
- The release requires Foundry VTT 14 and `l5r5e` system `1.14.103` or newer.
