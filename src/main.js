import { MODULE_ID, MODULE_TITLE, MINIMUM_SYSTEM_VERSION } from "./constants.js";
import { SystemGateway } from "./api/system-gateway.js";
import { CombatDock } from "./apps/combat-dock.js";
import { ConflictSetup } from "./apps/conflict-setup.js";
import { StateProfileConfig } from "./apps/state-profile-config.js";
import { EventTimelineService } from "./services/event-timeline-service.js";
import { EventTemplateService } from "./services/event-template-service.js";
import { ParticipantService } from "./services/participant-service.js";
import { RemovalService } from "./services/removal-service.js";
import { registerSettings, seedDefaultProfiles, setStateProfileConfigClass } from "./settings.js";

let services = null;
let compatibilityNoticeShown = false;

function localize(key, data = {}) {
    return Object.keys(data).length ? game.i18n.format(key, data) : game.i18n.localize(key);
}

function buildServices() {
    const gateway = new SystemGateway(game);
    const timelineService = new EventTimelineService({ localize: (key) => localize(key) });
    const templateService = new EventTemplateService();
    const participantService = new ParticipantService({ gateway });
    const removalService = new RemovalService({ gateway, timelineService });
    return { gateway, timelineService, templateService, participantService, removalService };
}

async function renderDock() {
    if (!services?.gateway.validate().ok) return;
    if (ui.l5r5eCombatTrackerDock) return ui.l5r5eCombatTrackerDock.render({ force: true });
    const dock = new CombatDock(services);
    ui.l5r5eCombatTrackerDock = dock;
    return dock.render({ force: true });
}

async function maybeOpenSetup(combat) {
    if (!combat || combat.started || !game.user.isGM || !services.gateway.isAuthority()) return;
    if (!(combat.isActive || game.combat === combat || ui.combat?.viewed === combat)) return;
    const timeline = services.timelineService.read(combat);
    if (timeline.setupShown) return;
    timeline.setupShown = true;
    await services.timelineService.write(combat, timeline);
    new ConflictSetup({ combat, timelineService: services.timelineService, templateService: services.templateService }).render({ force: true });
}

function registerKeybindings() {
    const advance = (direction) => {
        const combat = services?.gateway.currentCombat();
        if (!combat || !(game.user.isGM || combat.canUserModify?.(game.user, "update"))) return false;
        if (direction < 0) combat.previousTurn();
        else combat.nextTurn();
        return true;
    };
    game.keybindings.register(MODULE_ID, "previousTurn", {
        name: "L5RCTD.Keybinding.PreviousTurn",
        editable: [{ key: "BracketLeft", modifiers: ["Shift"] }],
        restricted: false,
        onDown: () => advance(-1),
    });
    game.keybindings.register(MODULE_ID, "nextTurn", {
        name: "L5RCTD.Keybinding.NextTurn",
        editable: [{ key: "BracketRight", modifiers: ["Shift"] }],
        restricted: false,
        onDown: () => advance(1),
    });
}

Hooks.once("init", () => {
    setStateProfileConfigClass(StateProfileConfig);
    registerSettings();
    registerKeybindings();
    console.info(`${MODULE_TITLE} | Initializing`);
});

Hooks.once("ready", async () => {
    services = buildServices();
    const validation = services.gateway.validate();
    if (!validation.ok) {
        if (!compatibilityNoticeShown) {
            compatibilityNoticeShown = true;
            const key = validation.code === "wrongSystem" ? "L5RCTD.Error.WrongSystem" : validation.code === "oldSystem" ? "L5RCTD.Error.OldSystem" : "L5RCTD.Error.MissingApi";
            ui.notifications.error(localize(key, { version: MINIMUM_SYSTEM_VERSION, api: validation.missing?.join(", ") ?? "" }), { permanent: true });
        }
        return;
    }
    await seedDefaultProfiles();
    const module = game.modules.get(MODULE_ID);
    if (module) module.api = Object.freeze({ ...services, renderDock });
    await renderDock();
    await services.removalService.prune(services.gateway.currentCombat());
    await maybeOpenSetup(services.gateway.currentCombat());
});

Hooks.on("createCombat", async (combat) => {
    if (!services) return;
    await maybeOpenSetup(combat);
});

Hooks.on("updateCombat", async (combat, changes) => {
    if (!services) return;
    if ("active" in changes || "scene" in changes) await maybeOpenSetup(combat);
});
