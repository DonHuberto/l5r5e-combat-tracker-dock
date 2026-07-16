# L5R5e core patch 1.14.103

The dock requires one deliberately small backend addition in `Nasze_L5R_FoundryVTT`:

- `game.l5r5e.lateArrivals` stores a versioned `flags.l5r5e.lateArrival` scheduling record on a late Combatant;
- Foundry's native `Combatant#roundJoined` remains the only turn-eligibility mechanism and is never duplicated or overwritten;
- the elected authority GM requests the existing `Combat#rollInitiative` with a skill/TN override at the eligible round;
- the existing core roll path still owns PC pickers, adversary automation, minions, opportunity, Strife, stance, tie keys and groups;
- an active Duel rejects a third participant, including a defensive post-create check for batch races;
- `CombatL5r5e#rollInitiative` now honors per-call difficulty settings for automated adversaries and resolves combatants from the receiving Combat document.

No module namespace stores mechanical initiative, action, movement or condition truth.
