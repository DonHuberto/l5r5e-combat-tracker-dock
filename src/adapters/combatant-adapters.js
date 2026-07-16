import { finiteNumber, getProperty, toArray } from "../services/utils.js";

class GenericCombatantAdapter {
    constructor(combatant) {
        this.combatant = combatant;
        this.actor = combatant?.actor ?? null;
    }

    get kind() {
        return "generic";
    }

    get stance() {
        return String(this.actor?.system?.stance ?? this.combatant?.flags?.l5r5e?.groupStance ?? "");
    }

    get prepared() {
        return Boolean(this.actor?.isPrepared ?? this.actor?.system?.prepared);
    }

    resources() {
        return [];
    }

    statusKeys() {
        const statuses = this.actor?.statuses;
        return statuses instanceof Set ? new Set(statuses) : new Set(toArray(statuses));
    }

    effects() {
        return toArray(this.actor?.temporaryEffects ?? this.actor?.effects);
    }

    thresholdState(gateway) {
        if (gateway?.conditions?.thresholdState && this.actor) return gateway.conditions.thresholdState(this.actor);
        return {};
    }

    optionalExact() {
        return {};
    }
}

class CharacterLikeCombatantAdapter extends GenericCombatantAdapter {
    resources() {
        const system = this.actor?.system ?? {};
        return [
            {
                key: "fatigue",
                profileKey: "fatigue",
                labelKey: "L5RCTD.Resource.Fatigue",
                value: finiteNumber(system.fatigue?.value),
                max: finiteNumber(system.fatigue?.max ?? system.endurance),
            },
            {
                key: "strife",
                profileKey: "strife",
                labelKey: "L5RCTD.Resource.Strife",
                value: finiteNumber(system.strife?.value),
                max: finiteNumber(system.strife?.max ?? system.composure),
            },
        ];
    }

    optionalExact() {
        const system = this.actor?.system ?? {};
        return {
            endurance: finiteNumber(system.endurance),
            composure: finiteNumber(system.composure),
            voidPoints: system.void_points ? {
                value: finiteNumber(system.void_points.value),
                max: finiteNumber(system.void_points.max ?? system.rings?.void),
            } : null,
        };
    }
}

export class CharacterCombatantAdapter extends CharacterLikeCombatantAdapter {
    get kind() {
        return "character";
    }
}

export class AdversaryCombatantAdapter extends CharacterLikeCombatantAdapter {
    get kind() {
        return "adversary";
    }
}

export class MinionCombatantAdapter extends CharacterLikeCombatantAdapter {
    get kind() {
        return "minion";
    }
}

export class ArmyCombatantAdapter extends GenericCombatantAdapter {
    get kind() {
        return "army";
    }

    resources() {
        const system = this.actor?.system ?? {};
        return [
            {
                key: "armyStrength",
                profileKey: "armyStrength",
                labelKey: "L5RCTD.Resource.Strength",
                value: finiteNumber(getProperty(system, "battle_readiness.casualties_strength.value")),
                max: finiteNumber(getProperty(system, "battle_readiness.casualties_strength.max")),
            },
            {
                key: "armyDiscipline",
                profileKey: "armyDiscipline",
                labelKey: "L5RCTD.Resource.Discipline",
                value: finiteNumber(getProperty(system, "battle_readiness.panic_discipline.value")),
                max: finiteNumber(getProperty(system, "battle_readiness.panic_discipline.max")),
            },
        ];
    }
}

export { GenericCombatantAdapter };

export function createCombatantAdapter(combatant) {
    const actor = combatant?.actor;
    if (actor?.isArmy || actor?.type === "army") return new ArmyCombatantAdapter(combatant);
    if (actor?.isMinion || (actor?.type === "npc" && actor?.system?.type === "minion")) return new MinionCombatantAdapter(combatant);
    if (actor?.isAdversary || (actor?.type === "npc" && actor?.system?.type === "adversary")) return new AdversaryCombatantAdapter(combatant);
    if (actor?.isCharacter || actor?.type === "character") return new CharacterCombatantAdapter(combatant);
    return new GenericCombatantAdapter(combatant);
}
