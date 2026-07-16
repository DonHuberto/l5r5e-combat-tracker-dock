import assert from "node:assert/strict";
import test from "node:test";
import { HookRegistry } from "../src/services/hook-registry.js";
import { REFRESH_HOOKS } from "../src/constants.js";
import { RemovalService } from "../src/services/removal-service.js";
import { debounce } from "../src/services/utils.js";
import { installFoundryGlobals, makeActor, makeCombatant } from "./helpers.js";

installFoundryGlobals();

function fakeCombat(combatants) {
    return {
        round: 3,
        turn: 0,
        combatants,
        deleted: [],
        async deleteEmbeddedDocuments(type, ids) {
            assert.equal(type, "Combatant");
            this.deleted.push(...ids);
            this.combatants = this.combatants.filter((entry) => !ids.includes(entry.id));
        },
    };
}

test("dead is removed exactly once without deleting Actor or Token", async () => {
    const actor = makeActor({ statuses: ["dead"] });
    const combatant = makeCombatant({ id: "dead", actor });
    const combat = fakeCombat([combatant]);
    const service = new RemovalService({ gateway: { isAuthority: () => true }, timelineService: {}, setting: () => true });
    await service.prune(combat);
    await service.prune(combat);
    assert.deepEqual(combat.deleted, ["dead"]);
    assert.equal(actor.id, "actor");
    assert.equal(combatant.token.id, "token-dead");
});

test("only configured defeated minions are removed; incapacitated, unconscious, and dying remain", async () => {
    const minion = makeCombatant({ id: "minion", actor: makeActor({ id: "minion", type: "npc", subtype: "minion" }), defeated: true });
    const adversary = makeCombatant({ id: "adversary", actor: makeActor({ id: "adversary", type: "npc", subtype: "adversary" }), defeated: true });
    const impaired = ["incapacitated", "unconscious", "dying"].map((status) => makeCombatant({ id: status, actor: makeActor({ id: status, statuses: [status] }) }));
    const combat = fakeCombat([minion, adversary, ...impaired]);
    const enabled = new RemovalService({ gateway: { isAuthority: () => true }, timelineService: {}, setting: () => true });
    await enabled.prune(combat);
    assert.deepEqual(combat.deleted, ["minion"]);
    const disabledCombat = fakeCombat([minion]);
    const disabled = new RemovalService({ gateway: { isAuthority: () => true }, timelineService: {}, setting: () => false });
    await disabled.prune(disabledCombat);
    assert.deepEqual(disabledCombat.deleted, []);
});

test("Withdraw records history and removes only the Combatant", async () => {
    globalThis.game.user.isGM = true;
    const entries = [];
    const actor = makeActor({ id: "retreat" });
    const combatant = makeCombatant({ id: "retreat", actor });
    const combat = fakeCombat([combatant]);
    const service = new RemovalService({ gateway: { isAuthority: () => true }, timelineService: { appendHistory: async (_combat, entry) => entries.push(entry) } });
    assert.equal(await service.withdraw(combat, combatant), true);
    assert.deepEqual(combat.deleted, ["retreat"]);
    assert.equal(entries[0].reason, "withdrawn");
    assert.equal(actor.statuses.has("dead"), false);
});

test("hook registry unregisters every listener and debounce coalesces bursts", async () => {
    for (const hook of ["updateActor", "updateToken", "updateCombatant", "updateActiveEffect"]) assert.equal(REFRESH_HOOKS.includes(hook), true);
    let next = 1;
    const removed = [];
    const hooks = { on: () => next++, once: () => next++, off: (name, id) => removed.push([name, id]) };
    const registry = new HookRegistry(hooks);
    registry.on("updateActor", () => {});
    registry.once("updateCombatant", () => {});
    registry.clear();
    assert.deepEqual(removed, [["updateActor", 1], ["updateCombatant", 2]]);
    let calls = 0;
    const handler = debounce(() => { calls += 1; }, 10);
    handler();
    handler();
    handler();
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(calls, 1);
    handler.cancel();
});
