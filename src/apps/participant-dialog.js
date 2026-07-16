import { MODULE_ID } from "../constants.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ParticipantDialog extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor({ combat, participantService } = {}, options = {}) {
        super(options);
        this.combat = combat;
        this.participants = participantService;
    }

    static DEFAULT_OPTIONS = {
        id: "l5rctd-participant-dialog",
        classes: ["l5rctd", "l5rctd-participant-dialog"],
        window: { title: "L5RCTD.Participant.Title", icon: "fa-solid fa-user-plus" },
        position: { width: 520, height: 520 },
        actions: {
            addSelected: ParticipantDialog.addSelected,
            addActor: ParticipantDialog.addActor,
        },
    };

    static PARTS = {
        body: { template: `modules/${MODULE_ID}/src/templates/participant-dialog.hbs` },
    };

    async _prepareContext() {
        return {
            selected: this.participants.selectedTokenDocuments().map((token) => ({ id: token.id, name: token.name, img: token.texture?.src })),
            actors: game.actors.contents.filter((actor) => !this.participants.isDuplicateActor(this.combat, actor)).map((actor) => ({ id: actor.id, name: actor.name, img: actor.img, hasSceneToken: Boolean(this.participants.findSceneToken(actor)) })),
            started: this.combat.started,
        };
    }

    static async addSelected() {
        await this.participants.addTokens(this.combat, this.participants.selectedTokenDocuments());
        this.render({ force: true });
    }

    static async addActor() {
        const actorId = this.element.querySelector("[name='actorId']").value;
        const actor = game.actors.get(actorId);
        if (!actor) return;
        const preferSceneToken = this.element.querySelector("[name='preferSceneToken']").checked;
        const sceneToken = this.participants.findSceneToken(actor);
        if (!preferSceneToken || !sceneToken) {
            const confirmed = await foundry.applications.api.DialogV2.confirm({ content: game.i18n.localize("L5RCTD.Participant.ActorOnlyConfirm") });
            if (!confirmed) return;
        }
        await this.participants.addActor(this.combat, actor, { preferSceneToken });
        this.render({ force: true });
    }

    _onRender(context, options) {
        super._onRender(context, options);
        this.element.addEventListener("dragover", (event) => event.preventDefault());
        this.element.addEventListener("drop", async (event) => {
            event.preventDefault();
            const data = TextEditor.getDragEventData(event);
            try {
                await this.participants.addDroppedData(this.combat, data);
                this.render({ force: true });
            } catch (error) {
                ui.notifications.error(game.i18n.localize(error.message));
            }
        });
    }
}
