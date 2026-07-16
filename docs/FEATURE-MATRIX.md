# Reference feature compatibility matrix

| Reference behavior/setting | Decision | L5R5e dock behavior |
| --- | --- | --- |
| Horizontal/vertical direction | Implement | Client setting with horizontal and vertical layouts. |
| Docked/floating placement | Implement | Docked top edge by default, optional bottom edge, or framed floating `ApplicationV2`. |
| Portrait size and aspect | Implement | Numeric size plus square/portrait/wide aspect; the image-first default is 128 px at a 1.5 portrait aspect. |
| Overflow/carousel | Implement | Auto-fit, scrolling, and fixed-size overflow without re-sorting `combat.turns`. |
| Alignment | Implement | Start, center, or end alignment. |
| Carousel rotation | Replace with L5R5e solution | Current participant is highlighted and scrolled into view; initiative order remains the system's canonical order. |
| Roundness | Implement | Sharp, soft, and round client choices. |
| Resource colors/layout | Replace with L5R5e solution | Exact private values or semantic labels from validated profiles; arbitrary resource paths are not accepted. |
| Resource descriptions | Implement | World policy selects semantic state or no information for non-owners. |
| Hide defeated | Intentionally omit as queue control | Defeated minions are authoritatively removed when enabled; other defeated states remain visible. Hiding alone would leave them in turn order. |
| Disposition colors | Implement | Optional CSS border based on Foundry disposition colors. |
| Initiative on portrait | Implement | Includes valid zero; optional enemy masking affects only this module's view-model. |
| Actor/token image source | Implement | Client choice, with safe fallback. |
| Name visibility | Replace with Foundry policy | Non-GMs receive a name only for visible combatants under the selected Foundry-aware policy. |
| Custom portrait border/background assets | Intentionally omit | Independent CSS theme avoids unclear reference asset licensing and unsafe arbitrary CSS/file settings. |
| System icons | Replace with L5R5e solution | Stance, action, Water, movement, Wait, Guard, and undo indicators come from public system services. |
| Limited toolbar | Implement | Compact native Combat controls, horizon, setup/events, participant add, and NPC initiative. |
| Hide conflicting UI | Implement | Optional client-side class only while this dock is rendered. |
| Previous/next hotkeys | Implement | Configurable Foundry keybindings delegate to `Combat.previousTurn/nextTurn` after permission checks. |
| First-round enemy hiding | Implement, off by default | Filters only the sanitized dock/horizon view-model; no prototype patch. |
| Enemy initiative hiding | Implement, off by default | Replaces the dock value with a localized unknown label; native tracker is untouched. |
| Generic arbitrary attributes | Intentionally omit | Sensitive-path bypass risk; explicit adapters and whitelisted resources enforce OWNER/GM privacy. |
| Player-to-player permission override | Intentionally omit | Conflicts with the required OWNER-only exact-data policy. |
| Global events | Replace with L5R5e solution | Versioned Combat timeline with visibility, round scheduling, history, templates, and GM authority. |
| Event as fake Combatant | Intentionally omit | Events are timeline records, never Combatants, so they cannot corrupt initiative or turns. |
| Effect display/removal | Implement | Dynamic ActiveEffects; removal only for GM/OWNER through standard document deletion. |
| Manual private sorter | Intentionally omit | Uses `combat.turns` exactly; no `_sortCombatants` call or custom tie resolver. |
