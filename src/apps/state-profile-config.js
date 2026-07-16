import { MODULE_ID } from "../constants.js";
import { loadDefaultProfiles, normalizeProfiles, PROFILE_KEYS, validateProfiles } from "../services/state-profile-service.js";
import { randomId } from "../services/utils.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class StateProfileConfig extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(options = {}) {
        super(options);
        this.draft = null;
    }

    static DEFAULT_OPTIONS = {
        id: "l5rctd-state-profiles",
        tag: "form",
        classes: ["l5rctd", "l5rctd-profile-config"],
        window: { title: "L5RCTD.Profile.Title", icon: "fa-solid fa-sliders" },
        position: { width: 760, height: 720 },
        form: { handler: StateProfileConfig.onSubmit, closeOnSubmit: false },
        actions: {
            addState: StateProfileConfig.addState,
            removeState: StateProfileConfig.removeState,
            moveUp: StateProfileConfig.moveUp,
            moveDown: StateProfileConfig.moveDown,
            resetDefaults: StateProfileConfig.resetDefaults,
        },
    };

    static PARTS = {
        form: { template: `modules/${MODULE_ID}/src/templates/state-profile-config.hbs` },
    };

    async _prepareContext() {
        const profiles = normalizeProfiles(this.draft ?? game.settings.get(MODULE_ID, "stateProfiles"));
        return {
            profiles: PROFILE_KEYS.map((key) => ({ key, label: game.i18n.localize(`L5RCTD.Profile.${key}`), states: profiles[key] })),
            errors: this.errors ?? [],
        };
    }

    _readProfiles() {
        const profiles = { schemaVersion: 1 };
        for (const key of PROFILE_KEYS) {
            profiles[key] = [...this.element.querySelectorAll(`[data-profile="${key}"] [data-state]`)].map((row, order) => ({
                id: row.dataset.state,
                enabled: row.querySelector("[name='enabled']").checked,
                upperBoundPercent: Number(row.querySelector("[name='upperBoundPercent']").value),
                order,
                label: {
                    en: row.querySelector("[name='labelEn']").value.trim(),
                    pl: row.querySelector("[name='labelPl']").value.trim(),
                },
                color: row.querySelector("[name='color']").value,
            }));
        }
        return normalizeProfiles(profiles);
    }

    static async onSubmit() {
        const profiles = this._readProfiles();
        const validation = validateProfiles(profiles);
        if (!validation.valid) {
            this.errors = validation.errors.map((error) => game.i18n.localize(`L5RCTD.Profile.Error.${error.split(":").at(-1)}`));
            ui.notifications.error(this.errors.join(" "));
            return this.render({ force: true });
        }
        this.errors = [];
        await game.settings.set(MODULE_ID, "stateProfiles", profiles);
        this.draft = profiles;
        ui.notifications.info(game.i18n.localize("L5RCTD.Profile.Saved"));
        return this.render({ force: true });
    }

    static async addState(_event, target) {
        const profiles = this._readProfiles();
        const key = target.dataset.profile;
        profiles[key].push({ id: randomId(key), enabled: false, upperBoundPercent: 100, order: profiles[key].length, label: { en: "", pl: "" }, color: "#ffffff" });
        this.draft = profiles;
        this.render({ force: true });
    }

    static async removeState(_event, target) {
        const profiles = this._readProfiles();
        const key = target.closest("[data-profile]").dataset.profile;
        profiles[key] = profiles[key].filter((state) => state.id !== target.closest("[data-state]").dataset.state);
        this.draft = profiles;
        this.render({ force: true });
    }

    static async moveUp(_event, target) {
        return this._move(target, -1);
    }

    static async moveDown(_event, target) {
        return this._move(target, 1);
    }

    async _move(target, direction) {
        const profiles = this._readProfiles();
        const key = target.closest("[data-profile]").dataset.profile;
        const id = target.closest("[data-state]").dataset.state;
        const index = profiles[key].findIndex((state) => state.id === id);
        const destination = index + direction;
        if (index < 0 || destination < 0 || destination >= profiles[key].length) return;
        [profiles[key][index], profiles[key][destination]] = [profiles[key][destination], profiles[key][index]];
        this.draft = profiles;
        this.render({ force: true });
    }

    static async resetDefaults() {
        const confirmed = await foundry.applications.api.DialogV2.confirm({
            window: { title: "L5RCTD.Profile.Reset" },
            content: game.i18n.localize("L5RCTD.Profile.ResetConfirm"),
        });
        if (!confirmed) return;
        this.draft = await loadDefaultProfiles();
        this.render({ force: true });
    }

    _onRender(context, options) {
        super._onRender(context, options);
        const update = () => {
            for (const row of this.element.querySelectorAll("[data-state]")) {
                const preview = row.querySelector(".l5rctd-profile-preview");
                const color = row.querySelector("[name='color']").value;
                preview.textContent = row.querySelector(`[name='label${game.i18n.lang === "pl" ? "Pl" : "En"}']`).value || "—";
                preview.style.color = color;
            }
        };
        this.element.addEventListener("input", update);
        update();
    }
}
