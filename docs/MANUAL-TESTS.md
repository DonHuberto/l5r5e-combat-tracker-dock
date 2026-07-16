# Foundry VTT 14 manual smoke tests

Status legend: `[ ]` requires a running Foundry client; automated analogues are covered by `npm test`.

- [ ] Install system `l5r5e 1.14.103` and module `0.1.0`; confirm no compatibility warning.
- [ ] Open one GM and one player client. Give the player OWNER, OBSERVER and NONE access to three different actors.
- [ ] Inspect the player DOM: exact Fatigue/Strife/maxima, percentages, bar widths and hidden movement budgets occur only for the OWNER actor.
- [ ] Test character, adversary, minion and army; initiative `0`, null initiative, group badge and hidden Combatant.
- [ ] Change Fatigue, Strife and their maxima; add/remove ActiveEffects; verify immediate debounced refresh.
- [ ] Verify stance, action, free movement, Water extra action, wait/guard and undo movement indicators.
- [ ] Start through Conflict Setup; schedule same-round and future hidden, preview and GM-only events.
- [ ] Reload both clients immediately before/after a round change; verify one trigger and no GM-only leak/chat card.
- [ ] Move an event to the current/past round and verify the explicit activate-now confirmation.
- [ ] Save a JournalEntry template, add it from the index and drag it back; then edit the source and confirm the scheduled snapshot does not change.
- [ ] Expand 1, 3 and 10 future rounds; test horizontal, vertical, floating, docked, resize, overflow and no-canvas operation.
- [ ] Kill a participant during its own turn; verify the next native turn and that Actor/Token still exist.
- [ ] Mark a minion Defeated with the world setting on/off; verify PCs/adversaries and Incapacitated/Unconscious/Dying remain.
- [ ] Withdraw an active and last participant; verify history, native next turn/end behavior and no `dead` mutation.
- [ ] Add selected Token, dropped Token/Actor and actor-only participant to a running conflict.
- [ ] Test late arrival separately: Intrigue/Sentiment now, Skirmish/Tactics TN 2 next round, Duel third-participant rejection, Mass Battle/Command TN 2 next round.
- [ ] Repeat event trigger, death cleanup and late arrival with two active GMs; only the elected authority should mutate.
- [ ] Test previous/next-turn keybindings and verify closing/reopening the dock does not duplicate hooks or listeners.
