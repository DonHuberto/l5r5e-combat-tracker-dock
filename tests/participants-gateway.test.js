import assert from "node:assert/strict";
import test from "node:test";
import { SystemGateway } from "../src/api/system-gateway.js";
import { ParticipantService } from "../src/services/participant-service.js";
import { installFoundryGlobals, makeActor } from "./helpers.js";

installFoundryGlobals();

test("token membership delegates to TokenDocument.createCombatants", async () => {
    const calls = [];
    globalThis.TokenDocument = { implementation: { createCombatants: async (tokens, options) => { calls.push({ tokens, options }); return tokens; } } };
    const combat = { started: false, getCombatantsByToken: () => [] };
    const service = new ParticipantService({ gateway: {} });
    const tokens = [{ id: "a" }, { id: "b" }];
    await service.addTokens(combat, tokens);
    assert.deepEqual(calls, [{ tokens, options: { combat } }]);
});

test("actor-only membership uses embedded Combatant creation and never duplicates actors", async () => {
    const actor = makeActor({ id: "solo" });
    const created = [];
    const combat = {
        started: false,
        getCombatantsByActor: () => [],
        createEmbeddedDocuments: async (type, data) => { created.push({ type, data }); return data; },
    };
    const service = new ParticipantService({ gateway: {} });
    await service.addActor(combat, actor, { preferSceneToken: false });
    assert.equal(created[0].type, "Combatant");
    assert.equal(created[0].data[0].actorId, actor.id);
    combat.getCombatantsByActor = () => [{ id: "existing" }];
    assert.deepEqual(await service.addActor(combat, actor), []);
});

test("gateway delegates initiative and NPC rolls only to public Combat methods", async () => {
    const calls = [];
    const combat = {
        rollInitiative: async (...args) => calls.push(["rollInitiative", ...args]),
        rollNPC: async (...args) => calls.push(["rollNPC", ...args]),
    };
    const gateway = new SystemGateway({ system: { id: "l5r5e", version: "1.14.103" }, l5r5e: {} });
    await gateway.rollInitiative(combat, "combatant", { messageOptions: { skillId: "tactics" } });
    await gateway.rollNpc(combat, { messageMode: "gmroll" });
    assert.deepEqual(calls[0], ["rollInitiative", ["combatant"], { messageOptions: { skillId: "tactics" } }]);
    assert.deepEqual(calls[1], ["rollNPC", { messageMode: "gmroll" }]);
});
