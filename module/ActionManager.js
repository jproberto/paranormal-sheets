import { log } from "../paranormal-sheets.js";

/**
 * A helper class to manage actor actions
 */
export class ActionManager {
    static async renderDialog(title, dialogContent, buttons, defaultButton) {
        new Dialog({
                    title: title,
                    content: dialogContent,
                    buttons: buttons,
                    default: defaultButton
                }).render(true);
    }

    static _convertListToI18n(list) {
        const localizedList = {};
        for (const [key, value] of Object.entries(list)) {
            if (typeof value === 'string') {
                localizedList[key] = game.i18n.localize(value);
            }
        }
        return localizedList;
    }

    /**
     * Gathers and prepares all necessary data for the action creation/edit dialog.
     * @param {Actor} actor The actor for whom the action is being created.
     * @returns {object} An object containing data for the dialog template.
     */
    static async getActionDialogData(actor) {
        const actionTypes = this._convertListToI18n(CONFIG.paranormalSheets.actionTypes) || {};
        const damageTypes = this._convertListToI18n(CONFIG.paranormalSheets.damageTypes) || {};

        const skillList = {};
        for (const [key, skillData] of Object.entries(actor.system.skills ?? {})) {
            if (skillData.label) {
                skillList[key] = skillData.label;
            }
        }

        return {
            actionTypes,
            skillList,
            damageTypes
        };
    }

    /**
     * Handles the creation of a new custom action for an actor.
     * @param {Actor} actor The actor to whom the action will be added.
     */
    static async createAction(actor, app) {
        const dialogData = await this.getActionDialogData(actor);
        const dialogContent = await renderTemplate(
            "modules/paranormal-sheets/templates/dialogs/action-dialog.hbs",
            dialogData
        );

        const buttons = {
            ok: {
                icon: '<i class="fas fa-check"></i>',
                label: game.i18n.localize("ps.dialog.add"),
                callback: async html => {
                    const form = html[0].querySelector("form");
                    const newAction = { 
                        name: form.name.value,
                        type: form.type.value,
                        description: form.description.value,
                        attack: {
                            skill: form['attack.skill'].value,
                            mod: parseInt(form['attack.mod'].value, 10) || 0
                        },
                        damage: {
                            formula: form['damage.formula'].value,
                            type: form['damage.type'].value
                        },
                        save: {
                            skill: form['save.skill'].value,
                            dc:  parseInt(form['save.dc'].value, 10) || 0
                        }
                    };
                    
                    if (!newAction.name) {
                        ui.notifications.warn(game.i18n.localize("ps.actions.warnings.nameRequired"));
                        return;
                    }
                    
                    const currentActions = actor.getFlag("paranormal-sheets", "actions") || [];
                    const newActions = [...currentActions, newAction];
                    await actor.setFlag("paranormal-sheets", "actions", newActions);
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: game.i18n.localize("ps.dialog.cancel")
            }
        };
        
        return this.renderDialog(game.i18n.localize("ps.actions.dialog.titleCreate"), dialogContent, buttons, "ok");
    }

    /**
     * Deletes a custom action from the actor's flags.
     * @param {Actor} actor The actor to modify.
     * @param {HTMLElement} target The element that triggered the action (the delete icon).
     */
    static async deleteAction(actor, target, app) {
        const actionIndex = target.closest('[data-action-index]')?.dataset.actionIndex;
        if (actionIndex === undefined) return;

        const index = parseInt(actionIndex, 10);
        const currentActions = actor.getFlag("paranormal-sheets", "actions") || [];
        const newActions = currentActions.filter((action, i) => i !== index);

        await actor.setFlag("paranormal-sheets", "actions", newActions);
    }

    /**
     * Handles editing an existing custom action for an actor.
     * @param {Actor} actor The actor whose action is being edited.
     * @param {HTMLElement} target The element that triggered the action (the edit icon).
     */
    static async editAction(actor, target) {
        const actionIndex = target.closest('[data-action-index]')?.dataset.actionIndex;
        if (actionIndex === undefined) return;
        
        const index = parseInt(actionIndex, 10);
        const currentActions = actor.getFlag("paranormal-sheets", "actions") || [];
        const actionToEdit = currentActions[index];
        if (!actionToEdit) return;

        const dialogData = await this.getActionDialogData(actor);
        dialogData.action = actionToEdit;

        const dialogContent = await renderTemplate(
            "modules/paranormal-sheets/templates/dialogs/action-dialog.hbs",
            dialogData
        );
        
        const buttons = {
            ok: {
                icon: '<i class="fas fa-check"></i>',
                label: game.i18n.localize("ps.dialog.save"),
                callback: async html => {
            const form = html[0].querySelector("form");

            const updatedAction = {
                name: form.name.value,
                type: form.type.value,
                description: form.description.value,
                attack: {
                    skill: form['attack.skill'].value,
                    mod: parseInt(form['attack.mod'].value, 10) || 0
                },
                damage: {
                    formula: form['damage.formula'].value,
                    type: form['damage.type'].value
                },
                save: {
                    skill: form['save.skill'].value,
                    dc: parseInt(form['save.dc']?.value, 10) || null
                }
            };

            if (!updatedAction.name) {
                ui.notifications.warn(game.i18n.localize("ps.actions.warnings.nameRequired"));
                return;
            }
            
            currentActions[index] = updatedAction;
            
            await actor.setFlag("paranormal-sheets", "actions", currentActions);
        }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: game.i18n.localize("ps.dialog.cancel")
            }
        };

        return this.renderDialog(game.i18n.localize("ps.actions.dialog.titleEdit"), dialogContent, buttons, "ok");
    }

    /**
     * Prepares an attack roll by registering a hook to modify the roll configuration before evaluation.
     * @param {Actor} actor The actor performing the roll.
     ** @param {HTMLElement} target The element that triggered the action.
     * @returns {string|null} The skill key to be rolled, or null if preparation fails.
     */
    static prepareActionRoll(actor, target) {
        // 1. Pega os dados da ação, como antes
        const actionIndex = target.closest('[data-action-index]')?.dataset.actionIndex;
        if (actionIndex === undefined) return null;

        const actions = actor.getFlag("paranormal-sheets", "actions") || [];
        const action = actions[parseInt(actionIndex, 10)];
        if (!action || !action.attack?.skill) return null;

        const skillKey = action.attack.skill;
        const modifier = action.attack.mod || 0;
        const actionName = action.name;

        if (!actor.system.skills[skillKey]) {
            const warning = game.i18n.format("ps.actions.warnings.skillNotFound", { skill: skillKey });
            ui.notifications.warn(warning);
            return null;
        }

        Hooks.once("op.postSkillRollConfiguration", (rolls, config) => {
            if (config.skill !== skillKey) return;

            const roll = rolls[0];

            if (modifier !== 0) {
                const operator = modifier >= 0 ? "+" : "-" ;

                roll.terms.push(new OperatorTerm({ operator: operator}));
                roll.terms.push(new NumericTerm({ number: Math.abs(modifier) }));

                roll._formula = Roll.getFormula(roll.terms);
            }
        
            const skillLabel = actor.system.skills[skillKey].label;
            config.flavor = game.i18n.format("ps.actions.roll.flavor", { action: actionName, skill: skillLabel });
        });

        return skillKey;
    }

    /**
     * Handles rolling the damage for a specific action.
     * @param {Actor} actor The actor performing the roll.
     * @param {HTMLElement} target The element that triggered the action.
     */
    static async actionRollDamage(actor, target) {
        const actionIndex = target.closest('[data-action-index]')?.dataset.actionIndex;
        if (actionIndex === undefined) return;

        const actions = actor.getFlag("paranormal-sheets", "actions") || [];
        const action = actions[parseInt(actionIndex, 10)];
        
        if (!action || !action.damage?.formula) {
            ui.notifications.warn(game.i18n.localize("ps.actions.warnings.noDamageFormula"));
            return;
        }

        const roll = new Roll(action.damage.formula);
        await roll.evaluate({ async: true });

        let flavorText = `Dano: ${action.name}`;
        if (action.damage.type) {
            const damageTypes = await this.getActionDialogData(actor).then(data => data.damageTypes);
            const localizedDamageType = damageTypes[action.damage.type];
            if(localizedDamageType) {
                flavorText += ` (${localizedDamageType})`;
            }
        }
        
        await roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor: actor }),
            flavor: flavorText,
            flags: { "core.damageRoll": true } 
        });
    }
}