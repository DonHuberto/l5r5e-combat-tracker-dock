import { MODULE_ID, REFRESH_HOOKS } from "../constants.js";
import { getDockSettings } from "../settings.js";
import { buildCombatantViewModel } from "../services/combatant-view-model.js";
import { HookRegistry } from "../services/hook-registry.js";
import { buildDockEvents, buildHorizonViewModel } from "../services/timeline-view-model.js";
import { canSeeExact } from "../services/visibility-policy.js";
import { debounce, toArray } from "../services/utils.js";
import { ConflictSetup } from "./conflict-setup.js";
import { ParticipantDialog } from "./participant-dialog.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CombatDock extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor({ gateway, timelineService, templateService, participantService, removalService, visibilityController } = {}, options = {}) {
        super(options);
        this.gateway = gateway;
        this.timeline = timelineService;
        this.templates = templateService;
        this.participants = participantService;
        this.removals = removalService;
        this.visibility = visibilityController;
        this.combat = gateway.currentCombat();
        this.horizonExpanded = false;
        this.seenCombatants = new Set();
        this.registry = new HookRegistry();
        this.refreshDebounced = debounce(() => this.render({ force: true }), 60);
        this.resizeHandler = debounce(() => this._applyLayout(), 80);
        this.escapeHandler = (event) => {
            if (event.key === "Escape" && this.horizonExpanded) {
                this.horizonExpanded = false;
                this.render({ force: true });
            }
        };
        this.hooksRegistered = false;
    }

    static DEFAULT_OPTIONS = {
        id: "l5rctd-combat-dock",
        classes: ["l5rctd", "l5rctd-combat-dock"],
        window: {
            title: "L5RCTD.Dock.Title",
            icon: "fa-solid fa-torii-gate",
            frame: true,
            positioned: true,
            minimizable: false,
            resizable: false,
        },
        position: { width: "auto", height: "auto" },
        actions: {
            previousTurn: CombatDock.previousTurn,
            nextTurn: CombatDock.nextTurn,
            startCombat: CombatDock.startCombat,
            endCombat: CombatDock.endCombat,
            resetInitiative: CombatDock.resetInitiative,
            rollNpc: CombatDock.rollNpc,
            rollInitiative: CombatDock.rollInitiative,
            focusCombatant: CombatDock.focusCombatant,
            openSheet: CombatDock.openSheet,
            pingCombatant: CombatDock.pingCombatant,
            removeEffect: CombatDock.removeEffect,
            undoMovement: CombatDock.undoMovement,
            withdraw: CombatDock.withdraw,
            openSetup: CombatDock.openSetup,
            addParticipant: CombatDock.addParticipant,
            toggleHorizon: CombatDock.toggleHorizon,
            closeHorizon: CombatDock.closeHorizon,
            resolveEvent: CombatDock.resolveEvent,
            collapse: CombatDock.collapse,
            restore: CombatDock.restore,
        },
    };

    static PARTS = {
        dock: { template: `modules/${MODULE_ID}/src/templates/combat-dock.hbs` },
    };

    get canAdvance() {
        return Boolean(game.user.isGM || this.combat?.canUserModify?.(game.user, "update"));
    }

    async _prepareContext() {
        const previousCombatId = this.combat?.id;
        this.combat = this.gateway.currentCombat();
        if (previousCombatId && previousCombatId !== this.combat?.id) this.seenCombatants.clear();
        const settings = getDockSettings();
        const locale = game.i18n.lang === "pl" ? "pl" : "en";
        const combatants = [];
        if (this.combat) {
            const turns = toArray(this.combat.turns);
            if (this.combat.combatant) this.seenCombatants.add(this.combat.combatant.id);
            if ((this.combat.round ?? 0) === 1) {
                for (let index = 0; index <= (this.combat.turn ?? -1); index += 1) if (turns[index]) this.seenCombatants.add(turns[index].id);
            }
            for (const combatant of turns) {
                if (settings.hideFirstRound && !game.user.isGM && !canSeeExact(combatant.actor, game.user) && (this.combat.round ?? 0) <= 1 && !this.seenCombatants.has(combatant.id)) continue;
                const viewModel = await buildCombatantViewModel({ combatant, combat: this.combat, user: game.user, profiles: settings.profiles, locale, settings, gateway: this.gateway });
                if (viewModel) combatants.push(viewModel);
            }
        }
        const timeline = this.combat ? this.timeline.read(this.combat) : null;
        const events = this.combat ? buildDockEvents(timeline, { user: game.user, round: this.combat.round, localize: (key) => game.i18n.localize(key) }) : [];
        const horizon = this.horizonExpanded && this.combat ? await buildHorizonViewModel({
            combat: this.combat,
            timelineData: timeline,
            futureRounds: settings.futureRounds,
            user: game.user,
            profiles: settings.profiles,
            locale,
            settings,
            collapsed: Boolean(settings.collapsed),
            gateway: this.gateway,
            localize: (key) => game.i18n.localize(key),
        }) : null;
        return {
            hasCombat: Boolean(this.combat),
            started: Boolean(this.combat?.started),
            round: this.combat?.round ?? 0,
            turn: (this.combat?.turn ?? -1) + 1,
            encounterType: this.gateway.encounterType(),
            combatants,
            events,
            horizon,
            horizonExpanded: this.horizonExpanded,
            isGM: game.user.isGM,
            canAdvance: this.canAdvance,
            settings,
        };
    }

    async _insertElement(element, options) {
        await super._insertElement(element, options);
        if (getDockSettings().placement === "docked") document.body.appendChild(element);
    }

    _registerHooks() {
        if (this.hooksRegistered) return;
        this.hooksRegistered = true;
        for (const name of REFRESH_HOOKS) {
            this.registry.on(name, (...args) => {
                if (["createActiveEffect", "updateActiveEffect", "deleteActiveEffect"].includes(name)) this.removals.prune(this.gateway.currentCombat());
                if (name === "updateActor") this.removals.prune(this.gateway.currentCombat());
                this.refreshDebounced(...args);
            });
        }
        const activate = async (combat, data = {}) => {
            if (combat !== this.gateway.currentCombat()) return;
            const round = data.round ?? combat.round ?? 1;
            await this.timeline.activateDue(combat, round, {
                authority: this.gateway.isAuthority(),
                createChat: game.settings.get(MODULE_ID, "eventChatCards"),
            });
            this.refreshDebounced();
        };
        this.registry.on("combatStart", (combat, data) => activate(combat, data));
        this.registry.on("combatRound", (combat, updateData) => activate(combat, updateData));
        this.registry.on("combatTurnChange", (combat, _prior, current) => activate(combat, current));
        this.registry.on("updateCompendium", () => this.templates.invalidate());
        this.registry.on("createJournalEntry", () => this.templates.invalidate());
        this.registry.on("updateJournalEntry", () => this.templates.invalidate());
        this.registry.on("deleteJournalEntry", () => this.templates.invalidate());
        window.addEventListener("resize", this.resizeHandler);
        window.addEventListener("keydown", this.escapeHandler);
    }

    _applyLayout() {
        if (!this.element) return;
        const settings = getDockSettings();
        const aspect = { square: 1, portrait: 1.5, wide: 0.8 }[settings.portraitAspect] ?? 1.5;
        let size = settings.portraitSize;
        const count = Math.max(1, this.element.querySelectorAll(".l5rctd-combatant").length);
        if (settings.overflow === "autofit") {
            const available = settings.orientation === "vertical" ? window.innerHeight * 0.78 : window.innerWidth * 0.92;
            const footprint = settings.orientation === "vertical" ? aspect : 1;
            size = Math.max(72, Math.min(size, Math.floor(available / count / footprint)));
        }
        this.element.style.setProperty("--l5rctd-portrait-size", `${size}px`);
        this.element.style.setProperty("--l5rctd-portrait-aspect", String(aspect));
        this.element.dataset.placement = settings.placement;
        this.element.dataset.edge = settings.dockEdge;
        this.element.dataset.orientation = settings.orientation;
        this.element.dataset.alignment = settings.alignment;
        this.element.dataset.overflow = settings.overflow;
        this.element.dataset.roundness = settings.roundness;
        document.body.classList.toggle("l5rctd-hide-conflicting-ui", Boolean(settings.hideConflictingUi && this.rendered));
        this.element.querySelector(".l5rctd-combatant.active")?.scrollIntoView?.({ behavior: "smooth", block: "nearest", inline: "center" });
    }

    _onRender(context, options) {
        super._onRender(context, options);
        this._registerHooks();
        this._applyLayout();
        for (const tile of this.element.querySelectorAll("[data-event-id][draggable='true']")) {
            tile.addEventListener("dragstart", (event) => event.dataTransfer.setData("application/x-l5rctd-event", tile.dataset.eventId));
        }
        for (const lane of this.element.querySelectorAll("[data-round-lane]")) {
            lane.addEventListener("dragover", (event) => game.user.isGM && event.preventDefault());
            lane.addEventListener("drop", async (event) => {
                if (!game.user.isGM) return;
                event.preventDefault();
                const eventId = event.dataTransfer.getData("application/x-l5rctd-event");
                if (!eventId) return;
                const targetRound = Number(lane.dataset.roundLane);
                let result = await this.timeline.update(this.combat, eventId, { targetRound });
                if (result.code === "confirmActivateNow") {
                    const confirmed = await foundry.applications.api.DialogV2.confirm({ content: game.i18n.localize("L5RCTD.Event.ActivateNowConfirm") });
                    if (confirmed) result = await this.timeline.update(this.combat, eventId, { targetRound }, { activateNow: true });
                }
                if (result.ok) this.render({ force: true });
            });
        }
    }

    _combatant(target) {
        return this.combat?.combatants?.get?.(target.closest("[data-combatant-id]")?.dataset.combatantId);
    }

    static async previousTurn() {
        if (this.canAdvance) await this.combat?.previousTurn();
    }

    static async nextTurn() {
        if (this.canAdvance) await this.combat?.nextTurn();
    }

    static async startCombat() {
        if (game.user.isGM) await this.combat?.startCombat();
    }

    static async endCombat() {
        if (game.user.isGM) await this.combat?.endCombat();
    }

    static async resetInitiative() {
        if (game.user.isGM) await this.combat?.resetAll();
    }

    static async rollNpc() {
        if (game.user.isGM) await this.gateway.rollNpc(this.combat);
    }

    static async rollInitiative(_event, target) {
        const combatant = this._combatant(target);
        if (!combatant || !(game.user.isGM || combatant.isOwner || canSeeExact(combatant.actor, game.user))) return;
        await this.gateway.rollInitiative(this.combat, combatant.id);
    }

    static async focusCombatant(_event, target) {
        const combatant = this._combatant(target);
        const token = combatant?.token;
        if (!token?.object || token.parent?.id !== canvas.scene?.id || !combatant.actor?.testUserPermission?.(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER)) return;
        if (token.object.isOwner) token.object.control({ releaseOthers: true });
        await canvas.animatePan(token.object.center);
    }

    static async openSheet(_event, target) {
        const combatant = this._combatant(target);
        if (combatant?.actor?.testUserPermission?.(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER)) combatant.actor.sheet?.render(true);
    }

    static async pingCombatant(_event, target) {
        const combatant = this._combatant(target);
        const token = combatant?.token;
        if (!token?.object || token.parent?.id !== canvas.scene?.id || !game.user.hasPermission("PING_CANVAS")) return;
        await canvas.ping(token.object.center);
    }

    static async removeEffect(_event, target) {
        const combatant = this._combatant(target);
        if (!combatant || !(game.user.isGM || canSeeExact(combatant.actor, game.user))) return;
        const effect = await fromUuid(target.closest("[data-effect-uuid]").dataset.effectUuid);
        if (!effect) return;
        const confirmed = await foundry.applications.api.DialogV2.confirm({ content: game.i18n.format("L5RCTD.Effect.RemoveConfirm", { name: effect.name }) });
        if (confirmed) await effect.delete();
    }

    static async undoMovement(_event, target) {
        const combatant = this._combatant(target);
        const signals = combatant ? this.gateway.turnSignals(combatant, this.combat) : {};
        if (!combatant || !signals.movementUndoAvailable || !(game.user.isGM || combatant.token?.isOwner || canSeeExact(combatant.actor, game.user))) return;
        await this.gateway.undoMovement(combatant);
    }

    static async withdraw(_event, target) {
        const combatant = this._combatant(target);
        if (!combatant || !game.user.isGM) return;
        const confirmed = await foundry.applications.api.DialogV2.confirm({
            window: { title: "L5RCTD.Withdraw.Title" },
            content: game.i18n.format("L5RCTD.Withdraw.Confirm", { name: combatant.name }),
        });
        if (confirmed) await this.removals.withdraw(this.combat, combatant);
    }

    static async openSetup() {
        if (!game.user.isGM || !this.combat) return;
        new ConflictSetup({ combat: this.combat, timelineService: this.timeline, templateService: this.templates }).render({ force: true });
    }

    static async addParticipant() {
        if (!game.user.isGM || !this.combat) return;
        new ParticipantDialog({ combat: this.combat, participantService: this.participants }).render({ force: true });
    }

    static async toggleHorizon() {
        this.horizonExpanded = !this.horizonExpanded;
        this.render({ force: true });
    }

    static async closeHorizon() {
        this.horizonExpanded = false;
        this.render({ force: true });
    }

    static async resolveEvent(_event, target) {
        if (!game.user.isGM) return;
        await this.timeline.resolve(this.combat, target.closest("[data-event-id]").dataset.eventId);
        this.render({ force: true });
    }

    static async collapse() {
        this.horizonExpanded = false;
        await this.visibility?.setCollapsed(true);
    }

    static async restore() {
        await this.visibility?.setCollapsed(false);
    }

    async close(options = {}) {
        this.registry.clear();
        this.refreshDebounced.cancel();
        this.resizeHandler.cancel();
        window.removeEventListener("resize", this.resizeHandler);
        window.removeEventListener("keydown", this.escapeHandler);
        document.body.classList.remove("l5rctd-hide-conflicting-ui");
        await this.visibility?.dockClosed(this, options);
        if (globalThis.ui?.l5r5eCombatTrackerDock === this) delete globalThis.ui.l5r5eCombatTrackerDock;
        return super.close(options);
    }
}
