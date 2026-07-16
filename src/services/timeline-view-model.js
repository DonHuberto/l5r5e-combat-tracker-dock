import { EVENT_STATE, EVENT_VISIBILITY } from "../constants.js";
import { buildCombatantViewModel } from "./combatant-view-model.js";
import { eventDisplay, normalizeTimeline } from "./event-timeline-service.js";
import { toArray } from "./utils.js";

export function canSeeEvent(event, { isGM = false, round = null, horizon = false } = {}) {
    if (isGM) return true;
    if (event.visibility === EVENT_VISIBILITY.GM_ONLY) return false;
    if (event.state === EVENT_STATE.ACTIVE) return true;
    if (event.state === EVENT_STATE.RESOLVED) return false;
    return Boolean(horizon && event.visibility === EVENT_VISIBILITY.PREVIEW && (round == null || event.targetRound === round));
}

export function buildEventViewModel(event, { isGM = false, round = null, horizon = false, localize = (key) => key } = {}) {
    if (!canSeeEvent(event, { isGM, round, horizon })) return null;
    const display = eventDisplay(event, localize);
    return {
        id: display.id,
        targetRound: display.targetRound,
        sort: display.sort,
        name: display.name,
        icon: display.icon,
        description: display.description,
        state: display.state,
        visibility: isGM ? display.visibility : undefined,
        editable: isGM,
    };
}

export function buildDockEvents(timelineData, { user, round, localize } = {}) {
    const timeline = normalizeTimeline(timelineData);
    return timeline.events
        .filter((event) => event.state === EVENT_STATE.ACTIVE && event.triggeredRound === round)
        .map((event) => buildEventViewModel(event, { isGM: Boolean(user?.isGM), round, localize }))
        .filter(Boolean)
        .sort((left, right) => left.sort - right.sort);
}

export async function buildHorizonViewModel({ combat, timelineData, futureRounds = 3, user, profiles, locale, settings, gateway, localize = (key) => key } = {}) {
    const timeline = normalizeTimeline(timelineData);
    const baseRound = Math.max(1, combat?.round ?? 0);
    const lanes = [];
    const turns = toArray(combat?.turns);
    const turnIds = new Set(turns.map((combatant) => combatant.id));
    const pending = toArray(combat?.combatants).filter((combatant) => !turnIds.has(combatant.id) && combatant.flags?.l5r5e?.lateArrival);
    const projectedCombatants = [...turns, ...pending];
    for (let offset = 0; offset <= futureRounds; offset += 1) {
        const round = baseRound + offset;
        const events = timeline.events
            .filter((event) => event.targetRound === round || event.triggeredRound === round)
            .map((event) => buildEventViewModel(event, { isGM: Boolean(user?.isGM), round, horizon: true, localize }))
            .filter(Boolean)
            .sort((left, right) => left.sort - right.sort);
        const participants = [];
        for (const combatant of projectedCombatants) {
            const eligibleRound = combatant.flags?.l5r5e?.lateArrival?.eligibleRound ?? combatant.roundJoined ?? 1;
            if (round < eligibleRound) {
                if (user?.isGM && round >= (combatant.roundJoined ?? round)) {
                    const pending = await buildCombatantViewModel({ combatant, combat, user, profiles, locale, settings, gateway });
                    if (pending) participants.push({ ...pending, pending: true });
                }
                continue;
            }
            const participant = await buildCombatantViewModel({ combatant, combat, user, profiles, locale, settings, gateway });
            if (participant) participants.push(participant);
        }
        lanes.push({ round, current: round === baseRound, events, participants });
    }
    return { baseRound, lanes, projection: true, editable: Boolean(user?.isGM) };
}
