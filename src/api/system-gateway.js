import { MINIMUM_SYSTEM_VERSION } from "../constants.js";
import { compareVersions, toArray } from "../services/utils.js";

export class SystemGateway {
    constructor(gameInstance = globalThis.game) {
        this.game = gameInstance;
    }

    validate() {
        const game = this.game;
        if (game?.system?.id !== "l5r5e") return { ok: false, code: "wrongSystem" };
        if (compareVersions(game.system.version, MINIMUM_SYSTEM_VERSION) < 0) return { ok: false, code: "oldSystem", required: MINIMUM_SYSTEM_VERSION };
        const api = game.l5r5e;
        const required = ["turns", "movement", "conditions", "initiative", "authority", "lateArrivals"];
        const missing = required.filter((key) => !api?.[key]);
        if (missing.length) return { ok: false, code: "missingApi", missing };
        return { ok: true };
    }

    get api() {
        return this.game?.l5r5e ?? {};
    }

    get conditions() {
        return this.api.conditions;
    }

    get lateArrivals() {
        return this.api.lateArrivals;
    }

    currentCombat() {
        return globalThis.ui?.combat?.viewed ?? this.game?.combat ?? null;
    }

    isAuthority(user = this.game?.user) {
        return Boolean(this.api.authority?.isAuthority?.(user));
    }

    encounterType() {
        try {
            return this.game.settings.get("l5r5e", "initiative-encounter") ?? "skirmish";
        } catch {
            return "skirmish";
        }
    }

    turnSignals(combatant, combat = combatant?.combat) {
        try {
            const state = this.api.turns.getState(combatant, { combat });
            const getters = this.api.turns.getters(state);
            return {
                actionUsed: Boolean(getters.isActionUsed),
                freeMovementUsed: Boolean(getters.isFreeMovementUsed),
                waterActionAvailable: Boolean(state.waterExtraAction?.available),
                waterActionUsed: Boolean(getters.isWaterActionUsed),
                movementRemaining: Number(getters.movementRemaining ?? this.api.movement.remaining(combatant, { combat })) || 0,
                movementUndoAvailable: Boolean(getters.movementUndoAvailable),
                waiting: Boolean(state.wait),
                guarding: Boolean(state.guard),
            };
        } catch {
            return {
                actionUsed: false,
                freeMovementUsed: false,
                waterActionAvailable: false,
                waterActionUsed: false,
                movementRemaining: 0,
                movementUndoAvailable: false,
                waiting: false,
                guarding: false,
            };
        }
    }

    async undoMovement(combatant) {
        const token = combatant?.token;
        if (!token) return { ok: false, code: "tokenMissing" };
        return this.api.movement.undoMovement(combatant, token, { combat: combatant.combat });
    }

    async rollInitiative(combat, combatantId, options = {}) {
        return combat.rollInitiative([combatantId], options);
    }

    async rollNpc(combat, options = {}) {
        if (typeof combat?.rollNPC === "function") return combat.rollNPC(options);
        const ids = toArray(combat?.turns).filter((combatant) => combatant.isNPC && combatant.initiative == null).map((combatant) => combatant.id);
        if (!ids.length) return combat;
        return combat.rollInitiative(ids, options);
    }
}
