export function installFoundryGlobals() {
    globalThis.CONST = {
        DOCUMENT_OWNERSHIP_LEVELS: { NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3 },
        TOKEN_DISPLAY_MODES: { NONE: 0, CONTROL: 10, OWNER_HOVER: 20, HOVER: 30, OWNER: 40, ALWAYS: 50 },
        TOKEN_DISPOSITIONS: { HOSTILE: -1, NEUTRAL: 0, FRIENDLY: 1, SECRET: -2 },
    };
    globalThis.game = {
        i18n: { localize: (key) => key, lang: "en" },
        user: { id: "gm", isGM: true, hasPermission: () => true },
    };
    globalThis.canvas = { scene: { id: "scene" } };
}

export function makeUser({ id = "user", isGM = false, level = 0 } = {}) {
    return { id, isGM, level, hasPermission: () => true };
}

export function makeActor({ id = "actor", type = "character", subtype = null, permissions = {}, fatigue = 0, endurance = 10, strife = 0, composure = 10, statuses = [], system = {} } = {}) {
    const actor = {
        id,
        uuid: `Actor.${id}`,
        name: `Actor ${id}`,
        img: `secret-${id}.webp`,
        type,
        isCharacter: type === "character",
        isArmy: type === "army",
        isAdversary: subtype === "adversary",
        isMinion: subtype === "minion",
        hasPlayerOwner: true,
        statuses: new Set(statuses),
        temporaryEffects: [],
        flags: { l5r5e: {} },
        system: {
            type: subtype,
            fatigue: { value: fatigue, max: endurance },
            endurance,
            strife: { value: strife, max: composure },
            composure,
            stance: "earth",
            prepared: true,
            ...system,
        },
        testUserPermission(user, level) {
            return (permissions[user.id] ?? user.level ?? 0) >= level;
        },
    };
    return actor;
}

export function makeCombatant({ id = "combatant", actor, hidden = false, visible = true, initiative = null, defeated = false, disposition = -1, flags = {} } = {}) {
    return {
        id,
        actor,
        name: actor?.name ?? id,
        img: actor?.img,
        hidden,
        visible,
        initiative,
        isDefeated: defeated,
        defeated,
        isOwner: false,
        sceneId: "scene",
        roundJoined: 1,
        flags: { l5r5e: {}, ...flags },
        token: {
            id: `token-${id}`,
            uuid: `Scene.scene.Token.token-${id}`,
            actorId: actor?.id,
            disposition,
            displayName: 50,
            texture: { src: `public-${id}.webp` },
            parent: { id: "scene" },
        },
    };
}

export const profiles = {
    fatigue: [
        { id: "low", enabled: true, upperBoundPercent: 33, order: 0, label: { en: "Low", pl: "Niski" }, color: "#00aa00" },
        { id: "medium", enabled: true, upperBoundPercent: 66, order: 1, label: { en: "Medium", pl: "Średni" }, color: "#aaaa00" },
        { id: "high", enabled: true, upperBoundPercent: 100, order: 2, label: { en: "High", pl: "Wysoki" }, color: "#aa0000" },
    ],
    strife: [
        { id: "low", enabled: true, upperBoundPercent: 33, order: 0, label: { en: "Low", pl: "Niski" }, color: "#00aa00" },
        { id: "medium", enabled: true, upperBoundPercent: 66, order: 1, label: { en: "Medium", pl: "Średni" }, color: "#aaaa00" },
        { id: "high", enabled: true, upperBoundPercent: 100, order: 2, label: { en: "High", pl: "Wysoki" }, color: "#aa0000" },
    ],
    armyStrength: [
        { id: "ready", enabled: true, upperBoundPercent: 100, order: 0, label: { en: "Ready", pl: "Gotowa" }, color: "#00aa00" },
    ],
    armyDiscipline: [
        { id: "steady", enabled: true, upperBoundPercent: 100, order: 0, label: { en: "Steady", pl: "Pewna" }, color: "#00aa00" },
    ],
};

export function gatewayFor(actor) {
    return {
        conditions: {
            thresholdState(target) {
                const fatigue = Number(target.system.fatigue.value);
                const endurance = Number(target.system.fatigue.max ?? target.system.endurance);
                const strife = Number(target.system.strife.value);
                const composure = Number(target.system.strife.max ?? target.system.composure);
                return {
                    incapacitated: !target.isMinion && fatigue > endurance,
                    defeated: target.isMinion && fatigue > endurance,
                    compromised: strife > composure,
                };
            },
        },
        turnSignals() {
            return { actionUsed: true, freeMovementUsed: false, waterActionAvailable: true, waterActionUsed: false, movementRemaining: 823, movementUndoAvailable: true, waiting: false, guarding: true };
        },
        actor,
    };
}
