import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildCombatantViewModel, containsSensitiveNumbers } from "../src/services/combatant-view-model.js";
import { canSeeCombatant, canSeeExact } from "../src/services/visibility-policy.js";
import { gatewayFor, installFoundryGlobals, makeActor, makeCombatant, makeUser, profiles } from "./helpers.js";

installFoundryGlobals();

test("exact values are limited to GM and the current actor OWNER", () => {
    const gm = makeUser({ id: "gm", isGM: true });
    const owner = makeUser({ id: "owner", level: 3 });
    const observer = makeUser({ id: "observer", level: 2 });
    const stranger = makeUser({ id: "stranger", level: 0 });
    const actor = makeActor({ permissions: { owner: 3, observer: 2 } });
    assert.equal(canSeeExact(actor, gm), true);
    assert.equal(canSeeExact(actor, owner), true);
    assert.equal(canSeeExact(actor, observer), false);
    assert.equal(canSeeExact(actor, stranger), false);
    assert.equal(actor.hasPlayerOwner, true);
    assert.equal(canSeeExact(actor, stranger), false);
});

test("friendly disposition never grants exact values and hidden combatants disappear", () => {
    const user = makeUser({ id: "player", level: 0 });
    const actor = makeActor();
    const friendly = makeCombatant({ actor, disposition: 1 });
    assert.equal(canSeeCombatant(friendly, user), true);
    assert.equal(canSeeExact(actor, user), false);
    assert.equal(canSeeCombatant(makeCombatant({ actor, hidden: true }), user), false);
    assert.equal(canSeeCombatant(makeCombatant({ actor, visible: false }), user), false);
});

test("sanitized non-owner view-model and template cannot contain secret resource numbers", async () => {
    const user = makeUser({ id: "observer", level: 2 });
    const actor = makeActor({ permissions: { observer: 2 }, fatigue: 937, endurance: 941, strife: 881, composure: 887 });
    const combatant = makeCombatant({ actor, initiative: 0 });
    const combat = { combatant, turns: [combatant], turn: 0 };
    const viewModel = await buildCombatantViewModel({ combatant, combat, user, profiles, settings: { informationPolicy: "descriptive", portraitImage: "actor", hideEnemyInitiative: true }, gateway: gatewayFor(actor) });
    assert.equal(containsSensitiveNumbers(viewModel), false);
    assert.equal(viewModel.initiativeRolled, true);
    assert.equal(viewModel.initiative, "L5RCTD.Common.Unknown");
    assert.equal(viewModel.signals.movementRemaining, null);
    assert.equal(viewModel.img, actor.img);
    const serialized = JSON.stringify(viewModel);
    for (const secret of ["937", "941", "881", "887", "823"]) assert.equal(serialized.includes(secret), false);
    const templatePath = fileURLToPath(new URL("../src/templates/combat-dock.hbs", import.meta.url));
    const template = readFileSync(templatePath, "utf8");
    assert.doesNotMatch(template, /actor\.system|data-(?:value|max|percentage)|title=[^\n]*(?:resource\.value|resource\.max|resource\.percentage)/);
    for (const secret of ["937", "941", "881", "887", "823"]) assert.equal(`${template}\n${serialized}`.includes(secret), false);
});

test("GM view retains exact values, zero initiative, and group data without mutation", async () => {
    const actor = makeActor({ fatigue: 4, endurance: 10 });
    const flags = { l5r5e: { initiativeGroupId: "wave-one", groupStance: "water" } };
    const combatant = makeCombatant({ actor, initiative: 0, flags });
    const before = structuredClone(combatant.flags);
    const viewModel = await buildCombatantViewModel({ combatant, combat: { combatant, turns: [combatant], turn: 0 }, user: makeUser({ id: "gm", isGM: true }), profiles, settings: { informationPolicy: "descriptive" }, gateway: gatewayFor(actor) });
    assert.equal(viewModel.initiativeRolled, true);
    assert.equal(viewModel.initiative, 0);
    assert.equal(viewModel.resources[0].value, 4);
    assert.equal(viewModel.resources[0].max, 10);
    assert.equal(viewModel.groupBadge, "wave-one");
    assert.deepEqual(combatant.flags, before);
});

test("Actor/Token portrait setting selects the exact source, supports video and synthetic actors", async () => {
    const actor = makeActor({ permissions: { gm: 3 } });
    actor.img = "Actor portraits/O'Hara.webp";
    const combatant = makeCombatant({ actor });
    combatant.token.texture.src = "tokens/animated.webm";
    const base = { combatant, combat: { combatant, turns: [combatant], turn: 0 }, user: makeUser({ id: "gm", isGM: true }), profiles, gateway: gatewayFor(actor) };
    const actorView = await buildCombatantViewModel({ ...base, settings: { informationPolicy: "descriptive", portraitImage: "actor" } });
    const tokenView = await buildCombatantViewModel({ ...base, settings: { informationPolicy: "descriptive", portraitImage: "token" } });
    assert.equal(actorView.img, actor.img);
    assert.equal(actorView.portraitVideo, false);
    assert.equal(tokenView.img, combatant.token.texture.src);
    assert.equal(tokenView.portraitVideo, true);
    const synthetic = { ...actor, id: "synthetic", img: "synthetic-actor.png", isToken: true };
    combatant.actor = synthetic;
    const syntheticView = await buildCombatantViewModel({ ...base, combatant, gateway: gatewayFor(synthetic), settings: { informationPolicy: "descriptive", portraitImage: "actor" } });
    assert.equal(syntheticView.img, "synthetic-actor.png");
});

test("portrait template uses media elements rather than inline CSS URLs", () => {
    const template = readFileSync(fileURLToPath(new URL("../src/templates/combat-dock.hbs", import.meta.url)), "utf8");
    assert.doesNotMatch(template, /background-image/);
    assert.match(template, /<img class="l5rctd-portrait-media"/);
    assert.match(template, /<video class="l5rctd-portrait-media"/);
});
