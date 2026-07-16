# API and clean-room audit

Audit date: 2026-07-16.

## Versions

- Target system remote `master`: `d47fc16c82d2be15d87e8b1720727e0e4cc3fe3e`, release `1.14.102`.
- UX reference remote `master`: `054abf08d8897f22a59a9d5e6278fec6a1868034`.
- Foundry documentation checked against V14 Stable API (currently 14.364).

The two supplied Git revisions remain the current public branch tips. The reference dock manifest is internally inconsistent (`version: 1.0` but a `0.9.7.3` download URL), so none of its release metadata is reused.

## Clean-room boundary

The reference repository has no repository-wide license file that grants reuse of the application source and assets. It was inspected only to enumerate behavior, settings, toolbar actions, layout modes, and failure modes. This module has independent JavaScript, Handlebars, CSS, architecture, and assets. It has no runtime dependency on the reference module, libWrapper, Tagger, or Opportunities Made Easy.

## System findings

- The documented services are constructed once during `init` and exposed through `game.l5r5e`.
- `turns.getState(combatant, lifecycle)` accepts `{ combat }`; getters return action, free movement, Water action, remaining movement, and undo availability.
- `movement.undoMovement(combatant, tokenDocument, lifecycle)` is public.
- `conditions.thresholdState(actor, changes)` uses strict `>` thresholds and distinguishes minion defeat.
- `Combat.rollInitiative(ids, { formula, updateTurn, messageOptions })` is the actual system override. Foundry's documented top-level `messageMode` is not part of that override; the system consumes `messageOptions.messageMode`.
- `Combat.rollNPC` is inherited from Foundry VTT 14, not documented in `docs/hud-api.md`, and delegates to the overridden `rollInitiative`.
- `initiative === 0` is a valid rolled result.
- Structural NPC groups use `flags.l5r5e.initiativeGroupId`; the dock must only display it.
- System `1.14.102` has no `game.l5r5e.lateArrivals` service or late-arrival hook.
- The adversary automation branch reads the global initiative TN even when `messageOptions.difficulty` is supplied. The core patch must fix this before TN 2 late arrivals can be delegated safely.

## Foundry VTT 14 findings

- Module dependency metadata belongs under `relationships.systems`, with compatibility constraints.
- V14 applications use `foundry.applications.api.HandlebarsApplicationMixin(ApplicationV2)`, `DEFAULT_OPTIONS`, `PARTS`, `_prepareContext`, and `_onRender`.
- `Combatant.roundJoined` is a native numeric schema field. A combatant created before combat starts is treated as joining round 1.
- `TokenDocument.implementation.createCombatants(tokens, { combat })`, `TokenDocument.toggleCombatant`, and Combat actor/token lookup helpers are public.
- `combatRound` fires on the initiating client before the database update; `combatTurnChange` fires on all clients after it. Durable activation is therefore written only by the elected L5R5e GM and guarded by persisted event state.
- Compendium indices can be expanded with `getIndex({ fields })`; individual templates can then be loaded by UUID without fetching every document.

## Documentation/code differences

- `docs/hud-api.md` does not list Foundry's inherited `Combat.rollNPC`, although it is public in V14 and available on the system Combat subclass.
- Foundry documents a `messageMode` roll-initiative option, while the current system override expects the value within `messageOptions`.
- The supplied requirements assumed `lateArrivals` would need confirmation; the audit confirms it is absent and requires a separate core patch.

## Sources

- https://foundryvtt.com/api/v14/classes/foundry.documents.Combat.html
- https://foundryvtt.com/api/v14/classes/foundry.documents.Combatant.html
- https://foundryvtt.com/api/v14/classes/foundry.documents.TokenDocument.html
- https://foundryvtt.com/api/functions/foundry.applications.api.HandlebarsApplicationMixin.html
- https://foundryvtt.com/article/module-development/
