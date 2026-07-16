import { MODULE_ID } from "./constants.js";
import { loadDefaultProfiles, validateProfiles } from "./services/state-profile-service.js";

let StateProfileConfigClass = null;

export function setStateProfileConfigClass(applicationClass) {
    StateProfileConfigClass = applicationClass;
}

function rerender() {
    globalThis.ui?.l5r5eCombatTrackerDock?.render?.({ force: true });
}

function register(key, data) {
    game.settings.register(MODULE_ID, key, { onChange: rerender, ...data });
}

export function registerSettings() {
    game.settings.registerMenu(MODULE_ID, "stateProfilesMenu", {
        name: "L5RCTD.Setting.Profiles.Name",
        label: "L5RCTD.Setting.Profiles.Label",
        hint: "L5RCTD.Setting.Profiles.Hint",
        icon: "fa-solid fa-sliders",
        restricted: true,
        type: StateProfileConfigClass,
    });
    register("stateProfiles", { scope: "world", config: false, restricted: true, type: Object, default: {} });
    register("informationPolicy", {
        name: "L5RCTD.Setting.InformationPolicy.Name", hint: "L5RCTD.Setting.InformationPolicy.Hint", scope: "world", config: true, restricted: true, type: String,
        choices: { descriptive: "L5RCTD.Setting.InformationPolicy.Descriptive", none: "L5RCTD.Setting.InformationPolicy.None" }, default: "descriptive",
    });
    register("autoRemoveDefeatedMinions", { name: "L5RCTD.Setting.AutoRemoveMinions.Name", hint: "L5RCTD.Setting.AutoRemoveMinions.Hint", scope: "world", config: true, restricted: true, type: Boolean, default: true });
    register("hideFirstRound", { name: "L5RCTD.Setting.HideFirstRound.Name", hint: "L5RCTD.Setting.HideFirstRound.Hint", scope: "world", config: true, restricted: true, type: Boolean, default: false });
    register("hideEnemyInitiative", { name: "L5RCTD.Setting.HideEnemyInitiative.Name", hint: "L5RCTD.Setting.HideEnemyInitiative.Hint", scope: "world", config: true, restricted: true, type: Boolean, default: false });
    register("effectDescriptions", { name: "L5RCTD.Setting.EffectDescriptions.Name", hint: "L5RCTD.Setting.EffectDescriptions.Hint", scope: "world", config: true, restricted: true, type: Boolean, default: false });
    register("eventChatCards", { name: "L5RCTD.Setting.EventChat.Name", hint: "L5RCTD.Setting.EventChat.Hint", scope: "world", config: true, restricted: true, type: Boolean, default: true });

    register("placement", { name: "L5RCTD.Setting.Placement.Name", hint: "L5RCTD.Setting.Placement.Hint", scope: "client", config: true, type: String, choices: { docked: "L5RCTD.Setting.Placement.Docked", floating: "L5RCTD.Setting.Placement.Floating" }, default: "docked" });
    register("dockEdge", { name: "L5RCTD.Setting.DockEdge.Name", hint: "L5RCTD.Setting.DockEdge.Hint", scope: "client", config: true, type: String, choices: { top: "L5RCTD.Setting.DockEdge.Top", bottom: "L5RCTD.Setting.DockEdge.Bottom" }, default: "top" });
    register("orientation", { name: "L5RCTD.Setting.Orientation.Name", hint: "L5RCTD.Setting.Orientation.Hint", scope: "client", config: true, type: String, choices: { horizontal: "L5RCTD.Setting.Orientation.Horizontal", vertical: "L5RCTD.Setting.Orientation.Vertical" }, default: "horizontal" });
    register("alignment", { name: "L5RCTD.Setting.Alignment.Name", hint: "L5RCTD.Setting.Alignment.Hint", scope: "client", config: true, type: String, choices: { start: "L5RCTD.Setting.Alignment.Start", center: "L5RCTD.Setting.Alignment.Center", end: "L5RCTD.Setting.Alignment.End" }, default: "center" });
    register("overflow", { name: "L5RCTD.Setting.Overflow.Name", hint: "L5RCTD.Setting.Overflow.Hint", scope: "client", config: true, type: String, choices: { autofit: "L5RCTD.Setting.Overflow.Autofit", scroll: "L5RCTD.Setting.Overflow.Scroll", fixed: "L5RCTD.Setting.Overflow.Fixed" }, default: "autofit" });
    register("portraitSize", { name: "L5RCTD.Setting.PortraitSize.Name", hint: "L5RCTD.Setting.PortraitSize.Hint", scope: "client", config: true, type: Number, range: { min: 72, max: 220, step: 4 }, default: 128 });
    register("portraitAspect", { name: "L5RCTD.Setting.PortraitAspect.Name", hint: "L5RCTD.Setting.PortraitAspect.Hint", scope: "client", config: true, type: String, choices: { square: "L5RCTD.Setting.PortraitAspect.Square", portrait: "L5RCTD.Setting.PortraitAspect.Portrait", wide: "L5RCTD.Setting.PortraitAspect.Wide" }, default: "portrait" });
    register("portraitImage", { name: "L5RCTD.Setting.PortraitImage.Name", hint: "L5RCTD.Setting.PortraitImage.Hint", scope: "client", config: true, type: String, choices: { token: "L5RCTD.Setting.PortraitImage.Token", actor: "L5RCTD.Setting.PortraitImage.Actor" }, default: "actor" });
    register("roundness", { name: "L5RCTD.Setting.Roundness.Name", hint: "L5RCTD.Setting.Roundness.Hint", scope: "client", config: true, type: String, choices: { sharp: "L5RCTD.Setting.Roundness.Sharp", soft: "L5RCTD.Setting.Roundness.Soft", round: "L5RCTD.Setting.Roundness.Round" }, default: "soft" });
    register("futureRounds", { name: "L5RCTD.Setting.FutureRounds.Name", hint: "L5RCTD.Setting.FutureRounds.Hint", scope: "client", config: true, type: Number, range: { min: 1, max: 10, step: 1 }, default: 3 });
    register("showDisposition", { name: "L5RCTD.Setting.Disposition.Name", hint: "L5RCTD.Setting.Disposition.Hint", scope: "client", config: true, type: Boolean, default: true });
    register("hideConflictingUi", { name: "L5RCTD.Setting.HideUi.Name", hint: "L5RCTD.Setting.HideUi.Hint", scope: "client", config: true, type: Boolean, default: true });
    register("nameVisibility", { name: "L5RCTD.Setting.NameVisibility.Name", hint: "L5RCTD.Setting.NameVisibility.Hint", scope: "client", config: true, type: String, choices: { foundry: "L5RCTD.Setting.NameVisibility.Foundry", owner: "L5RCTD.Setting.NameVisibility.Owner", always: "L5RCTD.Setting.NameVisibility.Always" }, default: "foundry" });
}

export async function seedDefaultProfiles() {
    const stored = game.settings.get(MODULE_ID, "stateProfiles");
    if (stored && Object.keys(stored).length && validateProfiles(stored).valid) return stored;
    if (!game.user.isGM) return stored;
    const defaults = await loadDefaultProfiles();
    await game.settings.set(MODULE_ID, "stateProfiles", defaults);
    return defaults;
}

export function getDockSettings() {
    const get = (key) => game.settings.get(MODULE_ID, key);
    return {
        profiles: get("stateProfiles"),
        informationPolicy: get("informationPolicy"),
        hideFirstRound: get("hideFirstRound"),
        hideEnemyInitiative: get("hideEnemyInitiative"),
        effectDescriptions: get("effectDescriptions"),
        placement: get("placement"),
        dockEdge: get("dockEdge"),
        orientation: get("orientation"),
        alignment: get("alignment"),
        overflow: get("overflow"),
        portraitSize: get("portraitSize"),
        portraitAspect: get("portraitAspect"),
        portraitImage: get("portraitImage"),
        roundness: get("roundness"),
        futureRounds: get("futureRounds"),
        showDisposition: get("showDisposition"),
        hideConflictingUi: get("hideConflictingUi"),
        nameVisibility: get("nameVisibility"),
    };
}
