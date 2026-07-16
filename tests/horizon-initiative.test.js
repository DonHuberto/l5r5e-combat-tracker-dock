import assert from "node:assert/strict";
import test from "node:test";
import { EVENT_STATE, EVENT_VISIBILITY } from "../src/constants.js";
import { buildHorizonViewModel } from "../src/services/timeline-view-model.js";
import { gatewayFor, installFoundryGlobals, makeActor, makeCombatant, makeUser, profiles } from "./helpers.js";

installFoundryGlobals();

test("horizon projects current plus requested future rounds without changing combat order", async () => {
    const first = makeCombatant({ id: "first", actor: makeActor({ id: "first" }), initiative: 9 });
    const second = makeCombatant({ id: "second", actor: makeActor({ id: "second" }), initiative: 4 });
    const turns = [first, second];
    const before = turns.map((entry) => entry.id);
    const combat = { round: 2, turn: 0, turns, combatant: first };
    const horizon = await buildHorizonViewModel({ combat, timelineData: {}, futureRounds: 3, user: makeUser({ id: "gm", isGM: true }), profiles, locale: "en", settings: {}, gateway: gatewayFor(first.actor) });
    assert.equal(horizon.lanes.length, 4);
    assert.deepEqual(horizon.lanes.map((lane) => lane.round), [2, 3, 4, 5]);
    assert.deepEqual(horizon.lanes[0].participants.map((entry) => entry.id), before);
    assert.deepEqual(turns.map((entry) => entry.id), before);
});

test("late arrival appears pending to GM before eligibility and joins projection in eligible round", async () => {
    const actor = makeActor({ id: "late" });
    const late = makeCombatant({ id: "late", actor, flags: { l5r5e: { lateArrival: { joinedRound: 2, eligibleRound: 3, state: "pending" } } } });
    late.roundJoined = 2;
    const combat = { round: 2, turn: -1, turns: [], combatants: [late] };
    const gm = await buildHorizonViewModel({ combat, timelineData: {}, futureRounds: 2, user: makeUser({ id: "gm", isGM: true }), profiles, settings: {}, gateway: gatewayFor(actor) });
    assert.equal(gm.lanes[0].participants[0].pending, true);
    assert.equal(gm.lanes[1].participants[0].pending, undefined);
    const player = await buildHorizonViewModel({ combat, timelineData: {}, futureRounds: 2, user: makeUser({ id: "player" }), profiles, settings: {}, gateway: gatewayFor(actor) });
    assert.equal(player.lanes[0].participants.length, 0);
    assert.equal(player.lanes[1].participants.length, 1);
});

test("hidden events and combatants create no player placeholders", async () => {
    const actor = makeActor({ id: "hidden" });
    const hiddenCombatant = makeCombatant({ id: "hidden", actor, hidden: true });
    const timelineData = { events: [{ id: "secret", targetRound: 1, sort: 0, name: "Secret", icon: "x", visibility: EVENT_VISIBILITY.GM_ONLY, state: EVENT_STATE.SCHEDULED }] };
    const horizon = await buildHorizonViewModel({ combat: { round: 1, turns: [hiddenCombatant] }, timelineData, futureRounds: 1, user: makeUser({ id: "player" }), profiles, settings: {}, gateway: gatewayFor(actor) });
    assert.equal(horizon.lanes[0].participants.length, 0);
    assert.equal(horizon.lanes[0].events.length, 0);
});
