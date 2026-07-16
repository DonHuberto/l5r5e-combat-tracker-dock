import { EVENT_STATE, EVENT_VISIBILITY, MODULE_ID } from "../constants.js";
import { calculateTargetRound } from "../services/event-timeline-service.js";
import { toArray } from "../services/utils.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ConflictSetup extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor({ combat, timelineService, templateService } = {}, options = {}) {
        super(options);
        this.combat = combat;
        this.timeline = timelineService;
        this.templates = templateService;
    }

    static DEFAULT_OPTIONS = {
        id: "l5rctd-conflict-setup",
        classes: ["l5rctd", "l5rctd-conflict-setup"],
        window: { title: "L5RCTD.Setup.Title", icon: "fa-solid fa-calendar-days" },
        position: { width: 850, height: 760 },
        actions: {
            addEvent: ConflictSetup.addEvent,
            addTemplate: ConflictSetup.addTemplate,
            save: ConflictSetup.save,
            removeEvent: ConflictSetup.removeEvent,
            resolveEvent: ConflictSetup.resolveEvent,
            shiftEarlier: ConflictSetup.shiftEarlier,
            shiftLater: ConflictSetup.shiftLater,
            moveUp: ConflictSetup.moveUp,
            moveDown: ConflictSetup.moveDown,
            saveTemplate: ConflictSetup.saveTemplate,
            startCombat: ConflictSetup.startCombat,
        },
    };

    static PARTS = {
        body: { template: `modules/${MODULE_ID}/src/templates/conflict-setup.hbs` },
    };

    async _prepareContext() {
        const timeline = this.timeline.read(this.combat);
        return {
            combatName: this.combat.name,
            started: this.combat.started,
            participants: toArray(this.combat.turns).map((combatant) => ({ id: combatant.id, name: combatant.name, img: combatant.img ?? combatant.actor?.img })),
            events: timeline.events.map((event) => ({
                ...event,
                isHidden: event.visibility === EVENT_VISIBILITY.HIDDEN,
                isPreview: event.visibility === EVENT_VISIBILITY.PREVIEW,
                isGmOnly: event.visibility === EVENT_VISIBILITY.GM_ONLY,
                isActive: event.state === EVENT_STATE.ACTIVE,
            })),
            templates: await this.templates.list(),
            packs: this.templates.writablePacks().map((pack) => ({ id: pack.collection, name: pack.title })),
            hasWritablePacks: this.templates.writablePacks().length > 0,
            visibilityChoices: EVENT_VISIBILITY,
        };
    }

    _eventData(row) {
        return {
            name: row.querySelector("[name='name']").value,
            icon: row.querySelector("[name='icon']").value,
            description: row.querySelector("[name='description']").value,
            visibility: row.querySelector("[name='visibility']").value,
            targetRound: Number(row.querySelector("[name='targetRound']").value),
            sort: Number(row.querySelector("[name='sort']").value),
        };
    }

    static async addEvent() {
        const mode = this.element.querySelector("[name='newEventMode']").value;
        const value = Number(this.element.querySelector("[name='newEventTime']").value);
        let target = calculateTargetRound({ currentRound: this.combat.round ?? 0, mode, value, started: this.combat.started });
        if (!target.ok) {
            const confirmed = await foundry.applications.api.DialogV2.confirm({ content: game.i18n.localize("L5RCTD.Event.ActivateNowConfirm") });
            if (!confirmed) return;
            target = calculateTargetRound({ currentRound: this.combat.round ?? 0, mode, value, started: this.combat.started, activateNow: true });
        }
        await this.timeline.add(this.combat, { targetRound: target.targetRound, state: target.activateNow ? EVENT_STATE.ACTIVE : EVENT_STATE.SCHEDULED, triggeredRound: target.activateNow ? this.combat.round : null, triggeredAt: target.activateNow ? Date.now() : null });
        this.render({ force: true });
    }

    static async addTemplate() {
        const select = this.element.querySelector("[name='templateUuid']");
        if (!select.value) return;
        const snapshot = await this.templates.snapshot(select.value, { targetRound: Math.max(1, this.combat.round ?? 1) });
        await this.timeline.add(this.combat, snapshot);
        this.render({ force: true });
    }

    static async save() {
        for (const row of this.element.querySelectorAll("[data-event-id]")) {
            const changes = this._eventData(row);
            let result = await this.timeline.update(this.combat, row.dataset.eventId, changes);
            if (result.code === "confirmActivateNow") {
                const confirmed = await foundry.applications.api.DialogV2.confirm({ content: game.i18n.localize("L5RCTD.Event.ActivateNowConfirm") });
                if (!confirmed) continue;
                result = await this.timeline.update(this.combat, row.dataset.eventId, changes, { activateNow: true });
            }
        }
        ui.notifications.info(game.i18n.localize("L5RCTD.Common.Saved"));
        this.render({ force: true });
    }

    static async removeEvent(_event, target) {
        const confirmed = await foundry.applications.api.DialogV2.confirm({ content: game.i18n.localize("L5RCTD.Event.DeleteConfirm") });
        if (!confirmed) return;
        await this.timeline.remove(this.combat, target.closest("[data-event-id]").dataset.eventId);
        this.render({ force: true });
    }

    static async resolveEvent(_event, target) {
        await this.timeline.resolve(this.combat, target.closest("[data-event-id]").dataset.eventId);
        this.render({ force: true });
    }

    static async shiftEarlier(_event, target) {
        return this._shift(target, -1);
    }

    static async shiftLater(_event, target) {
        return this._shift(target, 1);
    }

    async _shift(target, amount) {
        const row = target.closest("[data-event-id]");
        const input = row.querySelector("[name='targetRound']");
        input.value = Math.max(1, Number(input.value) + amount);
        return ConflictSetup.save.call(this);
    }

    static async moveUp(_event, target) {
        return this._sort(target, -1500);
    }

    static async moveDown(_event, target) {
        return this._sort(target, 1500);
    }

    async _sort(target, delta) {
        const row = target.closest("[data-event-id]");
        const input = row.querySelector("[name='sort']");
        input.value = Number(input.value) + delta;
        return ConflictSetup.save.call(this);
    }

    static async saveTemplate(_event, target) {
        const packId = this.element.querySelector("[name='templatePack']").value;
        if (!packId) return ui.notifications.warn(game.i18n.localize("L5RCTD.Template.SelectPack"));
        const row = target.closest("[data-event-id]");
        await this.templates.save(this._eventData(row), packId);
        ui.notifications.info(game.i18n.localize("L5RCTD.Template.Saved"));
        this.render({ force: true });
    }

    static async startCombat() {
        await ConflictSetup.save.call(this);
        const timeline = this.timeline.read(this.combat);
        timeline.setupShown = true;
        await this.timeline.write(this.combat, timeline);
        if (!this.combat.started) await this.combat.startCombat();
        this.close();
    }

    _onRender(context, options) {
        super._onRender(context, options);
        this.element.addEventListener("dragover", (event) => event.preventDefault());
        this.element.addEventListener("drop", async (event) => {
            event.preventDefault();
            try {
                const data = TextEditor.getDragEventData(event);
                if (data.type !== "JournalEntry" || !data.uuid) return;
                const snapshot = await this.templates.snapshot(data.uuid, { targetRound: Math.max(1, this.combat.round ?? 1) });
                await this.timeline.add(this.combat, snapshot);
                this.render({ force: true });
            } catch (error) {
                ui.notifications.error(game.i18n.localize(error.message));
            }
        });
    }
}
