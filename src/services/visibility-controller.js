import { MODULE_ID } from "../constants.js";

export const SCENE_CONTROL_TOOL_ID = "l5r5e-combat-tracker-dock-toggle";

export class VisibilityController {
    constructor({ createDock, settings = globalThis.game?.settings, getDock = () => globalThis.ui?.l5r5eCombatTrackerDock, setDock = (dock) => {
        if (dock) globalThis.ui.l5r5eCombatTrackerDock = dock;
        else delete globalThis.ui.l5r5eCombatTrackerDock;
    } } = {}) {
        this.createDock = createDock;
        this.settings = settings;
        this.getDock = getDock;
        this.setDock = setDock;
        this.syncing = null;
    }

    get visible() {
        return Boolean(this.settings.get(MODULE_ID, "visible"));
    }

    get collapsed() {
        return Boolean(this.settings.get(MODULE_ID, "collapsed"));
    }

    async setVisible(visible) {
        await this.settings.set(MODULE_ID, "visible", Boolean(visible));
        return this.sync();
    }

    async toggle() {
        return this.setVisible(!this.visible);
    }

    async setCollapsed(collapsed) {
        await this.settings.set(MODULE_ID, "collapsed", Boolean(collapsed));
        if (!this.visible) await this.settings.set(MODULE_ID, "visible", true);
        return this.sync();
    }

    async sync() {
        if (this.syncing) return this.syncing;
        this.syncing = this.#sync().finally(() => { this.syncing = null; });
        return this.syncing;
    }

    async #sync() {
        const current = this.getDock();
        if (!this.visible) {
            if (current) await current.close({ visibilityController: true });
            if (this.getDock() === current) this.setDock(null);
            return null;
        }
        const dock = current ?? this.createDock();
        if (!dock) return null;
        if (!current) this.setDock(dock);
        await dock.render({ force: true });
        return dock;
    }

    async dockClosed(dock, { visibilityController = false } = {}) {
        if (!visibilityController) await this.settings.set(MODULE_ID, "visible", false);
        if (this.getDock() === dock) this.setDock(null);
    }

    registerSceneControl(controls) {
        controls.tokens ??= { tools: {} };
        controls.tokens.tools ??= {};
        controls.tokens.tools[SCENE_CONTROL_TOOL_ID] = {
            name: SCENE_CONTROL_TOOL_ID,
            title: "L5RCTD.Visibility.Toggle",
            icon: "fa-solid fa-arrows-to-circle",
            toggle: true,
            active: this.visible,
            onChange: (_event, active) => this.setVisible(active),
        };
    }
}
