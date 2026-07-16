import { DEFAULT_EVENT_ICON, EVENT_SCHEMA_VERSION, EVENT_STATE, EVENT_VISIBILITY, MODULE_ID, TIMELINE_SCHEMA_VERSION } from "../constants.js";
import { deepClone, finiteNumber, randomId } from "./utils.js";

const VALID_VISIBILITY = new Set(Object.values(EVENT_VISIBILITY));
const VALID_STATES = new Set(Object.values(EVENT_STATE));

export function normalizeEvent(data = {}, index = 0) {
    const targetRound = Math.max(1, Math.trunc(finiteNumber(data.targetRound, 1)));
    const state = VALID_STATES.has(data.state) ? data.state : EVENT_STATE.SCHEDULED;
    return {
        id: String(data.id ?? randomId("event")),
        schemaVersion: EVENT_SCHEMA_VERSION,
        targetRound,
        sort: Math.trunc(finiteNumber(data.sort, index * 1000)),
        name: String(data.name ?? "").trim(),
        icon: String(data.icon ?? "").trim(),
        description: String(data.description ?? "").trim(),
        sourceUuid: data.sourceUuid ? String(data.sourceUuid) : null,
        visibility: VALID_VISIBILITY.has(data.visibility) ? data.visibility : EVENT_VISIBILITY.HIDDEN,
        state,
        triggeredRound: data.triggeredRound == null ? null : Math.max(1, Math.trunc(finiteNumber(data.triggeredRound, targetRound))),
        triggeredAt: data.triggeredAt == null ? null : finiteNumber(data.triggeredAt, null),
    };
}

export function normalizeTimeline(data = {}) {
    const events = Array.isArray(data.events) ? data.events.map(normalizeEvent) : [];
    events.sort((left, right) => left.targetRound - right.targetRound || left.sort - right.sort || left.id.localeCompare(right.id));
    return {
        schemaVersion: TIMELINE_SCHEMA_VERSION,
        setupShown: Boolean(data.setupShown),
        events,
        history: Array.isArray(data.history) ? data.history.map((entry) => deepClone(entry)) : [],
    };
}

export function eventDisplay(event, localize = (key) => key) {
    return {
        ...event,
        name: event.name || localize("L5RCTD.Event.FallbackName"),
        icon: event.icon || DEFAULT_EVENT_ICON,
    };
}

export function calculateTargetRound({ currentRound = 0, mode = "absolute", value = 1, started = false, activateNow = false } = {}) {
    const base = Math.max(0, Math.trunc(finiteNumber(currentRound, 0)));
    const amount = Math.max(0, Math.trunc(finiteNumber(value, mode === "absolute" ? 1 : 0)));
    if (mode === "relative") {
        if (started && amount === 0 && !activateNow) return { ok: false, code: "confirmActivateNow", targetRound: Math.max(1, base) };
        return { ok: true, targetRound: Math.max(1, base + amount), activateNow: Boolean(started && amount === 0) };
    }
    const targetRound = Math.max(1, amount);
    if (started && targetRound < base && !activateNow) return { ok: false, code: "confirmActivateNow", targetRound: base };
    return { ok: true, targetRound: started && targetRound < base ? base : targetRound, activateNow: Boolean(started && targetRound <= base && activateNow) };
}

export class EventTimelineService {
    constructor({ moduleId = MODULE_ID, now = () => Date.now(), localize = (key) => globalThis.game?.i18n?.localize?.(key) ?? key } = {}) {
        this.moduleId = moduleId;
        this.now = now;
        this.localize = localize;
    }

    read(combat) {
        return normalizeTimeline(combat?.getFlag?.(this.moduleId, "timeline") ?? combat?.flags?.[this.moduleId]?.timeline);
    }

    async write(combat, timeline) {
        const normalized = normalizeTimeline(timeline);
        await combat.setFlag(this.moduleId, "timeline", normalized);
        return normalized;
    }

    async add(combat, data = {}) {
        const timeline = this.read(combat);
        const sameRound = timeline.events.filter((event) => event.targetRound === Math.max(1, finiteNumber(data.targetRound, 1)));
        const event = normalizeEvent({ ...data, sort: data.sort ?? (sameRound.length + 1) * 1000 });
        timeline.events.push(event);
        await this.write(combat, timeline);
        return event;
    }

    async update(combat, eventId, changes = {}, { currentRound = combat?.round ?? 0, activateNow = false } = {}) {
        const timeline = this.read(combat);
        const index = timeline.events.findIndex((event) => event.id === eventId);
        if (index < 0) return { ok: false, code: "missing" };
        const requestedRound = changes.targetRound == null ? timeline.events[index].targetRound : Math.max(1, Math.trunc(finiteNumber(changes.targetRound, 1)));
        if (combat?.started && requestedRound < currentRound && !activateNow) return { ok: false, code: "confirmActivateNow" };
        const adjusted = { ...changes, targetRound: requestedRound < currentRound ? currentRound : requestedRound };
        if (activateNow) Object.assign(adjusted, { state: EVENT_STATE.ACTIVE, triggeredRound: Math.max(1, currentRound), triggeredAt: this.now() });
        timeline.events[index] = normalizeEvent({ ...timeline.events[index], ...adjusted }, index);
        await this.write(combat, timeline);
        return { ok: true, event: timeline.events[index] };
    }

    async remove(combat, eventId) {
        const timeline = this.read(combat);
        const before = timeline.events.length;
        timeline.events = timeline.events.filter((event) => event.id !== eventId);
        if (timeline.events.length === before) return false;
        await this.write(combat, timeline);
        return true;
    }

    async resolve(combat, eventId) {
        return this.update(combat, eventId, { state: EVENT_STATE.RESOLVED });
    }

    async appendHistory(combat, entry) {
        const timeline = this.read(combat);
        timeline.history.push({ id: randomId("history"), recordedAt: this.now(), ...deepClone(entry) });
        await this.write(combat, timeline);
        return timeline.history.at(-1);
    }

    async activateDue(combat, round, { authority = false, createChat = false } = {}) {
        if (!authority || !combat) return { activated: [], skipped: true };
        const timeline = this.read(combat);
        const currentRound = Math.max(1, Math.trunc(finiteNumber(round, combat.round ?? 1)));
        let changed = false;
        for (const event of timeline.events) {
            if (event.state === EVENT_STATE.ACTIVE && event.triggeredRound < currentRound) {
                event.state = EVENT_STATE.RESOLVED;
                changed = true;
            }
        }
        const activated = [];
        for (const event of timeline.events) {
            if (event.state !== EVENT_STATE.SCHEDULED || event.targetRound > currentRound) continue;
            event.state = EVENT_STATE.ACTIVE;
            event.triggeredRound = currentRound;
            event.triggeredAt = this.now();
            activated.push(eventDisplay(event, this.localize));
            changed = true;
        }
        if (changed) await this.write(combat, timeline);
        if (createChat && activated.length && globalThis.ChatMessage) {
            const escape = globalThis.foundry?.utils?.escapeHTML ?? ((value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[character]));
            for (const event of activated.filter((entry) => entry.visibility !== EVENT_VISIBILITY.GM_ONLY)) {
                await ChatMessage.create({
                    speaker: { alias: this.localize("L5RCTD.Event.FallbackName") },
                    content: `<section class="l5rctd-chat-event"><h3>${escape(event.name)}</h3>${event.description ? `<p>${escape(event.description)}</p>` : ""}</section>`,
                });
            }
        }
        return { activated, changed };
    }
}
