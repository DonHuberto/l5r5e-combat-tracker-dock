import { MODULE_ID } from "../constants.js";
import { createCombatantAdapter } from "../adapters/combatant-adapters.js";
import { toArray } from "./utils.js";

export class RemovalService {
    constructor({ gateway, timelineService, setting = (key) => globalThis.game?.settings?.get?.(MODULE_ID, key) } = {}) {
        this.gateway = gateway;
        this.timeline = timelineService;
        this.setting = setting;
        this.pending = new Set();
    }

    removalReason(combatant) {
        const adapter = createCombatantAdapter(combatant);
        const statuses = adapter.statusKeys();
        if (statuses.has("dead")) return "dead";
        const defeatedMinion = adapter.kind === "minion" && Boolean(combatant.isDefeated ?? combatant.defeated);
        if (defeatedMinion && this.setting("autoRemoveDefeatedMinions")) return "defeatedMinion";
        return null;
    }

    async prune(combat) {
        if (!combat || !this.gateway?.isAuthority?.()) return [];
        const candidates = toArray(combat.combatants).map((combatant) => ({ combatant, reason: this.removalReason(combatant) }))
            .filter(({ combatant, reason }) => reason && !this.pending.has(combatant.id));
        if (!candidates.length) return [];
        const ids = candidates.map(({ combatant }) => combatant.id);
        ids.forEach((id) => this.pending.add(id));
        try {
            await combat.deleteEmbeddedDocuments("Combatant", ids, { l5r5eCombatTrackerDock: { automatic: true } });
            return candidates.map(({ combatant, reason }) => ({ id: combatant.id, reason }));
        } finally {
            ids.forEach((id) => this.pending.delete(id));
        }
    }

    async withdraw(combat, combatant) {
        if (!globalThis.game?.user?.isGM || !combat || !combatant) return false;
        if (this.pending.has(combatant.id)) return false;
        this.pending.add(combatant.id);
        try {
            await this.timeline.appendHistory(combat, {
                type: "participantDeparture",
                reason: "withdrawn",
                actorUuid: combatant.actor?.uuid ?? null,
                tokenUuid: combatant.token?.uuid ?? null,
                round: combat.round ?? 0,
                turn: combat.turn ?? null,
            });
            await combat.deleteEmbeddedDocuments("Combatant", [combatant.id], { l5r5eCombatTrackerDock: { withdrawn: true } });
            return true;
        } finally {
            this.pending.delete(combatant.id);
        }
    }
}
