import assert from "node:assert/strict";
import test from "node:test";
import { EVENT_STATE, EVENT_VISIBILITY } from "../src/constants.js";
import { EventTemplateService } from "../src/services/event-template-service.js";
import { calculateTargetRound, EventTimelineService, eventDisplay } from "../src/services/event-timeline-service.js";
import { buildDockEvents, buildEventViewModel } from "../src/services/timeline-view-model.js";
import { installFoundryGlobals } from "./helpers.js";

installFoundryGlobals();

function fakeCombat({ round = 1, started = true } = {}) {
    let timeline;
    return {
        round,
        started,
        getFlag: () => timeline,
        setFlag: async (_scope, _key, value) => { timeline = structuredClone(value); },
        timeline: () => structuredClone(timeline),
    };
}

test("absolute and relative scheduling calculates target rounds and requires confirmation for now/past", () => {
    assert.deepEqual(calculateTargetRound({ mode: "absolute", value: 7 }), { ok: true, targetRound: 7, activateNow: false });
    assert.deepEqual(calculateTargetRound({ currentRound: 4, mode: "relative", value: 3, started: true }), { ok: true, targetRound: 7, activateNow: false });
    assert.equal(calculateTargetRound({ currentRound: 4, mode: "relative", value: 0, started: true }).code, "confirmActivateNow");
    assert.deepEqual(calculateTargetRound({ currentRound: 4, mode: "relative", value: 0, started: true, activateNow: true }), { ok: true, targetRound: 4, activateNow: true });
    assert.equal(calculateTargetRound({ currentRound: 4, mode: "absolute", value: 2, started: true }).code, "confirmActivateNow");
});

test("events activate once, survive reload, and only the authority mutates", async () => {
    const combat = fakeCombat({ round: 3 });
    const service = new EventTimelineService({ now: () => 1234, localize: (key) => key });
    const event = await service.add(combat, { name: "Storm", targetRound: 3, visibility: EVENT_VISIBILITY.PREVIEW });
    const nonAuthority = await service.activateDue(combat, 3, { authority: false });
    assert.equal(nonAuthority.skipped, true);
    const first = await service.activateDue(combat, 3, { authority: true });
    const second = await new EventTimelineService({ now: () => 9999 }).activateDue(combat, 3, { authority: true });
    assert.equal(first.activated.length, 1);
    assert.equal(second.activated.length, 0);
    assert.equal(service.read(combat).events.find((entry) => entry.id === event.id).triggeredAt, 1234);
});

test("update, sort, move-to-now, resolve and remove persist normalized state", async () => {
    const combat = fakeCombat({ round: 5 });
    const service = new EventTimelineService({ now: () => 77 });
    const event = await service.add(combat, { targetRound: 8, sort: 2000 });
    let result = await service.update(combat, event.id, { targetRound: 4, sort: 17 });
    assert.equal(result.code, "confirmActivateNow");
    result = await service.update(combat, event.id, { targetRound: 4, sort: 17 }, { activateNow: true });
    assert.equal(result.event.targetRound, 5);
    assert.equal(result.event.sort, 17);
    assert.equal(result.event.state, EVENT_STATE.ACTIVE);
    await service.resolve(combat, event.id);
    assert.equal(service.read(combat).events[0].state, EVENT_STATE.RESOLVED);
    assert.equal(await service.remove(combat, event.id), true);
    assert.equal(service.read(combat).events.length, 0);
});

test("template copy is a snapshot with sourceUuid and fallbacks remain usable", async () => {
    const source = {
        uuid: "Compendium.world.events.JournalEntry.storm",
        flags: { "l5r5e-combat-tracker-dock": { eventTemplate: { name: "Storm", icon: "storm.webp", targetRound: 9, description: "Original" } } },
    };
    globalThis.fromUuid = async () => source;
    const service = new EventTemplateService();
    const snapshot = await service.snapshot(source.uuid, { targetRound: 4 });
    source.flags["l5r5e-combat-tracker-dock"].eventTemplate.description = "Changed";
    assert.equal(snapshot.sourceUuid, source.uuid);
    assert.equal(snapshot.targetRound, 4);
    assert.equal(snapshot.description, "Original");
    const fallback = eventDisplay({ name: "", icon: "" }, (key) => `localized:${key}`);
    assert.equal(fallback.name, "localized:L5RCTD.Event.FallbackName");
    assert.ok(fallback.icon);
});

test("hidden and GM-only scheduled events never enter a player view-model or active dock", () => {
    const hidden = { id: "hidden", targetRound: 2, sort: 0, name: "Secret", icon: "x", visibility: EVENT_VISIBILITY.HIDDEN, state: EVENT_STATE.SCHEDULED };
    const gmOnly = { ...hidden, id: "gm", visibility: EVENT_VISIBILITY.GM_ONLY };
    assert.equal(buildEventViewModel(hidden, { isGM: false, round: 2, horizon: true }), null);
    assert.equal(buildEventViewModel(gmOnly, { isGM: false, round: 2, horizon: true }), null);
    assert.deepEqual(buildDockEvents({ events: [hidden, gmOnly] }, { user: { isGM: false }, round: 2 }), []);
});
