import { MODULE_ID } from "../constants.js";
import { toArray } from "./utils.js";

export class ParticipantService {
    constructor({ gateway, notify = globalThis.ui?.notifications } = {}) {
        this.gateway = gateway;
        this.notify = notify;
    }

    ensureLateArrivalApi(combat) {
        if (!combat?.started) return;
        if (!this.gateway?.lateArrivals) throw new Error("L5RCTD.Error.LateArrivalApi");
    }

    selectedTokenDocuments() {
        return toArray(globalThis.canvas?.tokens?.controlled).map((token) => token.document).filter(Boolean);
    }

    isDuplicateToken(combat, token) {
        return Boolean(combat?.getCombatantsByToken?.(token)?.length);
    }

    isDuplicateActor(combat, actor) {
        return Boolean(combat?.getCombatantsByActor?.(actor)?.length);
    }

    async addTokens(combat, tokens) {
        this.ensureLateArrivalApi(combat);
        const unique = toArray(tokens).filter((token) => token && !this.isDuplicateToken(combat, token));
        if (!unique.length) return [];
        const TokenDocumentClass = globalThis.TokenDocument?.implementation ?? globalThis.TokenDocument;
        const created = await TokenDocumentClass.createCombatants(unique, { combat });
        return created;
    }

    findSceneToken(actor, scene = globalThis.canvas?.scene) {
        return toArray(scene?.tokens).find((token) => token.actorId === actor?.id) ?? null;
    }

    async addActor(combat, actor, { preferSceneToken = true } = {}) {
        this.ensureLateArrivalApi(combat);
        if (!actor || this.isDuplicateActor(combat, actor)) return [];
        const token = preferSceneToken ? this.findSceneToken(actor) : null;
        if (token) return this.addTokens(combat, [token]);
        return combat.createEmbeddedDocuments("Combatant", [{
            actorId: actor.id,
            name: actor.name,
            img: actor.img,
            hidden: false,
            flags: { [MODULE_ID]: { actorOnly: true } },
        }]);
    }

    async addDroppedData(combat, data) {
        if (!data) return [];
        if (data.type === "Token" || data.documentName === "Token") {
            const token = data.uuid ? await globalThis.fromUuid?.(data.uuid) : globalThis.canvas?.scene?.tokens?.get?.(data.id ?? data.tokenId);
            return this.addTokens(combat, token ? [token] : []);
        }
        if (data.type === "Actor" || data.documentName === "Actor") {
            const actor = data.uuid ? await globalThis.fromUuid?.(data.uuid) : globalThis.game?.actors?.get?.(data.id);
            return this.addActor(combat, actor);
        }
        return [];
    }
}
