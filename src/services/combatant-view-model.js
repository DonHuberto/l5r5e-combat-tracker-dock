import { createCombatantAdapter } from "../adapters/combatant-adapters.js";
import { canManageEffect, canObserveActor, canSeeCombatant, canSeeExact, visibleCombatantName } from "./visibility-policy.js";
import { classifyResource } from "./state-profile-service.js";
import { clamp, finiteNumber } from "./utils.js";

function localize(key, fallback = key) {
    return globalThis.game?.i18n?.localize?.(key) ?? fallback;
}

function terminalFor(resource, adapter, thresholds) {
    if (resource.key === "fatigue" && thresholds?.defeated) return { key: "defeated", label: localize("COMBAT.Defeated", "Defeated") };
    if (resource.key === "fatigue" && thresholds?.incapacitated) return { key: "incapacitated", label: localize("l5r5e.conditions.incapacitated", "Incapacitated") };
    if (resource.key === "strife" && thresholds?.compromised) return { key: "compromised", label: localize("l5r5e.conditions.compromised", "Compromised") };
    if (["armyStrength", "armyDiscipline"].includes(resource.key) && resource.max > 0 && resource.value > resource.max) {
        return { key: "thresholdExceeded", label: localize("L5RCTD.State.ArmyThreshold", "Threshold exceeded — resolve at round end") };
    }
    return null;
}

function buildResources(adapter, exact, profiles, locale, gateway, informationPolicy) {
    if (!exact && informationPolicy === "none") return [];
    const thresholds = adapter.thresholdState(gateway);
    return adapter.resources().map((resource) => {
        const base = { key: resource.key, label: localize(resource.labelKey, resource.key) };
        const terminal = terminalFor(resource, adapter, thresholds);
        if (exact) {
            const max = finiteNumber(resource.max);
            const value = finiteNumber(resource.value);
            return {
                ...base,
                exact: true,
                value,
                max,
                percentage: max > 0 ? clamp((value / max) * 100, 0, 100) : null,
                state: terminal ? classifyResource({ terminal }) : null,
            };
        }
        return {
            ...base,
            exact: false,
            state: classifyResource({
                value: resource.value,
                max: resource.max,
                states: profiles?.[resource.profileKey] ?? [],
                locale,
                terminal,
            }),
        };
    }).filter((resource) => resource.exact || resource.state);
}

async function buildEffects(adapter, { exact, descriptions }) {
    const output = [];
    for (const effect of adapter.effects()) {
        if (!effect || effect.visible === false || !effect.img) continue;
        const entry = {
            id: String(effect.id ?? ""),
            uuid: String(effect.uuid ?? ""),
            name: localize(effect.name ?? effect.label ?? "", effect.name ?? effect.label ?? ""),
            img: String(effect.img),
            removable: canManageEffect(adapter.actor),
        };
        if (exact && descriptions && effect.description) {
            entry.description = globalThis.foundry?.applications?.ux?.TextEditor?.implementation?.enrichHTML
                ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(effect.description, { async: true })
                : String(effect.description);
        }
        if (exact && effect.statuses?.has?.("dying")) entry.dyingRounds = finiteNumber(adapter.actor?.flags?.l5r5e?.dyingRounds, null);
        output.push(entry);
    }
    return output;
}

function portraitImage(combatant, source, user) {
    if (source === "actor" && canObserveActor(combatant.actor, user)) return String(combatant.actor?.img ?? combatant.img ?? combatant.token?.texture?.src ?? "icons/svg/mystery-man.svg");
    return String(combatant.token?.texture?.src ?? combatant.img ?? combatant.actor?.img ?? "icons/svg/mystery-man.svg");
}

function dispositionClass(combatant, enabled) {
    if (!enabled) return null;
    const value = combatant.token?.disposition;
    const dispositions = globalThis.CONST?.TOKEN_DISPOSITIONS ?? {};
    if (value === dispositions.FRIENDLY) return "friendly";
    if (value === dispositions.HOSTILE) return "hostile";
    if (value === dispositions.SECRET) return "secret";
    return "neutral";
}

export async function buildCombatantViewModel({ combatant, combat, user = globalThis.game?.user, profiles = {}, locale = "en", settings = {}, gateway } = {}) {
    if (!canSeeCombatant(combatant, user)) return null;
    const adapter = createCombatantAdapter(combatant);
    const exact = canSeeExact(adapter.actor, user);
    const rawSignals = gateway?.turnSignals?.(combatant, combat) ?? {};
    const signals = exact ? rawSignals : {
        actionUsed: Boolean(rawSignals.actionUsed),
        freeMovementUsed: Boolean(rawSignals.freeMovementUsed),
        waterActionAvailable: Boolean(rawSignals.waterActionAvailable),
        waterActionUsed: Boolean(rawSignals.waterActionUsed),
        movementRemaining: null,
        movementUndoAvailable: false,
        waiting: Boolean(rawSignals.waiting),
        guarding: Boolean(rawSignals.guarding),
    };
    const name = visibleCombatantName(combatant, user, settings.nameVisibility ?? "foundry") || localize("L5RCTD.Combatant.Unknown", "Unknown combatant");
    const active = combat?.combatant?.id === combatant.id || combat?.turns?.[combat?.turn]?.id === combatant.id;
    const initiativeRolled = combatant.initiative !== null && combatant.initiative !== undefined;
    const hideInitiative = !user?.isGM && !exact && settings.hideEnemyInitiative;
    const viewModel = {
        id: String(combatant.id),
        actorId: String(combatant.actor?.id ?? ""),
        tokenId: String(combatant.token?.id ?? combatant.tokenId ?? ""),
        sceneId: String(combatant.sceneId ?? combatant.token?.parent?.id ?? ""),
        name,
        img: portraitImage(combatant, settings.portraitImage, user),
        kind: adapter.kind,
        disposition: dispositionClass(combatant, settings.showDisposition),
        active,
        hidden: Boolean(combatant.hidden),
        defeated: Boolean(combatant.isDefeated ?? combatant.defeated),
        initiativeRolled,
        initiative: initiativeRolled ? (hideInitiative ? localize("L5RCTD.Common.Unknown", "?") : combatant.initiative) : null,
        groupBadge: combatant.flags?.l5r5e?.initiativeGroupId ? String(combatant.flags.l5r5e.initiativeGroupId) : null,
        stance: adapter.stance,
        prepared: adapter.prepared,
        resources: buildResources(adapter, exact, profiles, locale, gateway, settings.informationPolicy),
        effects: await buildEffects(adapter, { exact, descriptions: settings.effectDescriptions }),
        signals,
        permissions: {
            exact,
            observe: canObserveActor(adapter.actor, user),
            rollInitiative: Boolean(user?.isGM || combatant.isOwner || exact),
            withdraw: Boolean(user?.isGM),
            ping: Boolean((user?.isGM || canObserveActor(adapter.actor, user)) && combatant.sceneId === globalThis.canvas?.scene?.id && user?.hasPermission?.("PING_CANVAS")),
            undoMovement: Boolean(signals.movementUndoAvailable && (user?.isGM || combatant.token?.isOwner || exact)),
        },
    };
    if (exact) viewModel.exactDetails = adapter.optionalExact();
    return viewModel;
}

export function containsSensitiveNumbers(viewModel) {
    if (!viewModel) return false;
    const serialized = JSON.stringify(viewModel);
    return serialized.includes('"percentage"') || serialized.includes('"exactDetails"') || serialized.includes('"value"') || serialized.includes('"max"');
}
