export const MODULE_ID = "l5r5e-combat-tracker-dock";
export const MODULE_TITLE = "L5R5e Combat Tracker Dock";
export const MODULE_VERSION = "0.1.1";
export const MINIMUM_SYSTEM_VERSION = "1.14.103";
export const TIMELINE_SCHEMA_VERSION = 1;
export const EVENT_SCHEMA_VERSION = 1;

export const EVENT_VISIBILITY = Object.freeze({
    HIDDEN: "hiddenUntilTrigger",
    PREVIEW: "publicPreview",
    GM_ONLY: "gmOnly",
});

export const EVENT_STATE = Object.freeze({
    SCHEDULED: "scheduled",
    ACTIVE: "active",
    RESOLVED: "resolved",
});

export const DEFAULT_EVENT_ICON = "icons/svg/clockwork.svg";
export const SENSITIVE_RESOURCE_KEYS = Object.freeze([
    "fatigue",
    "strife",
    "endurance",
    "composure",
    "void_points",
    "casualties_strength",
    "panic_discipline",
]);

export const REFRESH_HOOKS = Object.freeze([
    "l5r5e.turnStateChanged",
    "l5r5e.actionResolved",
    "l5r5e.movementBudgetChanged",
    "l5r5e.rollResolutionChanged",
    "createCombat",
    "updateCombat",
    "deleteCombat",
    "createCombatant",
    "updateCombatant",
    "deleteCombatant",
    "updateActor",
    "updateToken",
    "updateScene",
    "createActiveEffect",
    "updateActiveEffect",
    "deleteActiveEffect",
    "canvasReady",
    "canvasTearDown",
    "renderCombatTracker",
]);
