import { MODULE_ID } from "../constants.js";
import { normalizeEvent } from "./event-timeline-service.js";

export class EventTemplateService {
    constructor({ moduleId = MODULE_ID } = {}) {
        this.moduleId = moduleId;
        this.cache = null;
    }

    invalidate() {
        this.cache = null;
    }

    journalPacks() {
        return [...(globalThis.game?.packs ?? [])].filter((pack) => pack.documentName === "JournalEntry");
    }

    writablePacks() {
        return this.journalPacks().filter((pack) => !pack.locked && (globalThis.game?.user?.isGM || pack.testUserPermission?.(globalThis.game.user, "OWNER")));
    }

    async list() {
        if (this.cache) return this.cache;
        const entries = [];
        for (const pack of this.journalPacks()) {
            const index = await pack.getIndex({ fields: [`flags.${this.moduleId}.eventTemplate`] });
            for (const item of index) {
                if (!item.flags?.[this.moduleId]?.eventTemplate) continue;
                entries.push({ uuid: item.uuid ?? `Compendium.${pack.collection}.JournalEntry.${item._id}`, name: item.name, img: item.img, pack: pack.collection });
            }
        }
        this.cache = entries.sort((left, right) => left.name.localeCompare(right.name));
        return this.cache;
    }

    async snapshot(sourceUuid, overrides = {}) {
        const document = await globalThis.fromUuid?.(sourceUuid);
        const data = document?.flags?.[this.moduleId]?.eventTemplate;
        if (!document || !data) throw new Error("L5RCTD.Error.InvalidTemplate");
        return normalizeEvent({ ...data, ...overrides, id: undefined, sourceUuid: document.uuid });
    }

    async save(event, packId) {
        const pack = globalThis.game?.packs?.get?.(packId);
        if (!pack || pack.documentName !== "JournalEntry" || pack.locked || !globalThis.game?.user?.isGM) throw new Error("L5RCTD.Error.PackNotWritable");
        const data = normalizeEvent(event);
        delete data.id;
        delete data.triggeredAt;
        delete data.triggeredRound;
        data.state = "scheduled";
        const JournalEntryClass = globalThis.JournalEntry?.implementation ?? globalThis.JournalEntry;
        const created = await JournalEntryClass.create({
            name: event.name || globalThis.game?.i18n?.localize?.("L5RCTD.Event.FallbackName"),
            img: event.icon || undefined,
            flags: { [this.moduleId]: { eventTemplate: data } },
        }, { pack: pack.collection });
        this.invalidate();
        return created;
    }
}
