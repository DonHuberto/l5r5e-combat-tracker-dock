import assert from "node:assert/strict";
import test from "node:test";
import { buildCombatantViewModel } from "../src/services/combatant-view-model.js";
import { classifyResource, validateProfile } from "../src/services/state-profile-service.js";
import { gatewayFor, installFoundryGlobals, makeActor, makeCombatant, makeUser, profiles } from "./helpers.js";

installFoundryGlobals();

const states = profiles.fatigue;

test("profiles accept zero to four states and reject invalid order, duplicates, range, and final bound", () => {
    assert.equal(validateProfile([]).valid, true);
    assert.equal(validateProfile(states).valid, true);
    const four = [25, 50, 75, 100].map((upperBoundPercent, order) => ({ ...states[0], id: `valid-${order}`, order, upperBoundPercent }));
    assert.equal(validateProfile(four).valid, true);
    assert.equal(validateProfile([...states, { ...states[2], id: "four", enabled: true, order: 3, upperBoundPercent: 100 }]).valid, false);
    assert.ok(validateProfile([{ ...states[0], upperBoundPercent: 66 }, { ...states[1], upperBoundPercent: 33 }, states[2]]).errors.includes("profile:boundsNotIncreasing"));
    assert.ok(validateProfile([{ ...states[0], upperBoundPercent: 33 }, { ...states[1], upperBoundPercent: 33 }, states[2]]).errors.includes("profile:boundsNotIncreasing"));
    assert.ok(validateProfile([{ ...states[0], upperBoundPercent: -1 }, states[2]]).errors.includes("profile:invalidBound"));
    assert.ok(validateProfile([{ ...states[0], upperBoundPercent: 99 }]).errors.includes("profile:mustEndAt100"));
    const five = Array.from({ length: 5 }, (_, index) => ({ ...states[0], id: String(index), order: index, upperBoundPercent: (index + 1) * 20 }));
    assert.ok(validateProfile(five).errors.includes("profile:tooManyActive"));
});

test("classification handles exact 0/33/66/100 boundaries and invalid maxima", () => {
    assert.equal(classifyResource({ value: 0, max: 100, states }).key, "low");
    assert.equal(classifyResource({ value: 33, max: 100, states }).key, "low");
    assert.equal(classifyResource({ value: 66, max: 100, states }).key, "medium");
    assert.equal(classifyResource({ value: 100, max: 100, states }).key, "high");
    assert.equal(classifyResource({ value: 5, max: 0, states }), null);
    assert.equal(classifyResource({ value: 5, max: undefined, states }), null);
});

test("changing a disease-modified maximum immediately changes descriptive classification", () => {
    assert.equal(classifyResource({ value: 5, max: 20, states }).key, "low");
    assert.equal(classifyResource({ value: 5, max: 6, states }).key, "high");
});

async function resourceState({ subtype = null, fatigue = 0, endurance = 10, strife = 0, composure = 10 }) {
    const actor = makeActor({ type: subtype ? "npc" : "character", subtype, fatigue, endurance, strife, composure, permissions: { observer: 2 } });
    const combatant = makeCombatant({ actor });
    const model = await buildCombatantViewModel({ combatant, combat: { turns: [combatant], turn: -1 }, user: makeUser({ id: "observer", level: 2 }), profiles, settings: { informationPolicy: "descriptive" }, gateway: gatewayFor(actor) });
    return model.resources;
}

test("mechanical thresholds use strict greater-than and terminal states win", async () => {
    assert.equal((await resourceState({ fatigue: 10, endurance: 10 }))[0].state.terminal, false);
    assert.equal((await resourceState({ fatigue: 11, endurance: 10 }))[0].state.key, "incapacitated");
    assert.equal((await resourceState({ subtype: "adversary", fatigue: 11, endurance: 10 }))[0].state.key, "incapacitated");
    assert.equal((await resourceState({ subtype: "minion", fatigue: 11, endurance: 10 }))[0].state.key, "defeated");
    assert.equal((await resourceState({ strife: 11, composure: 10 }))[1].state.key, "compromised");
});

test("army exact and descriptive views do not mutate threshold status", async () => {
    const actor = makeActor({ type: "army", permissions: { observer: 2 }, system: { battle_readiness: { casualties_strength: { value: 12, max: 10 }, panic_discipline: { value: 3, max: 8 } } } });
    const combatant = makeCombatant({ actor });
    const observer = await buildCombatantViewModel({ combatant, combat: { turns: [combatant] }, user: makeUser({ id: "observer", level: 2 }), profiles, settings: { informationPolicy: "descriptive" }, gateway: gatewayFor(actor) });
    assert.equal(observer.resources[0].state.key, "thresholdExceeded");
    assert.equal(observer.resources[0].state.terminal, true);
    const gm = await buildCombatantViewModel({ combatant, combat: { turns: [combatant] }, user: makeUser({ id: "gm", isGM: true }), profiles, settings: {}, gateway: gatewayFor(actor) });
    assert.equal(gm.resources[0].value, 12);
    assert.deepEqual([...actor.statuses], []);
});
