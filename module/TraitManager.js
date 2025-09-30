import { log } from "../paranormal-sheets.js";

/**
 * A helper class to manage actor traits like resistances, vulnerabilities, and immunities.
 */
export class TraitManager {

    /**
     * Returns a list of all used damage types on an actor.
     * @param {Actor} actor
     * @param {string|null} excludeType
     * @returns {string[]}
     * @private
     */
    static _getUsedDamageTypes(actor, excludeType = null) {
        const resistances = (actor.getFlag('paranormal-sheets', 'resistances') || []).map(r => r.type.toLowerCase());
        const vulnerabilities = (actor.getFlag('paranormal-sheets', 'vulnerabilities') || []).map(v => v.type.toLowerCase());
        const immunities = (actor.getFlag('paranormal-sheets', 'immunities') || []).map(i => i.type.toLowerCase());
        
        const allUsedTypes = [...resistances, ...vulnerabilities, ...immunities];
        
        if (!excludeType) return allUsedTypes;
        return allUsedTypes.filter(t => t !== excludeType.toLowerCase());
    }

    static _getAvailableDamageTypes(actor) {
        const damageTypes = CONFIG.paranormalSheets.damageTypes;
        const usedTypes = this._getUsedDamageTypes(actor);
        
        return Object.entries(damageTypes).reduce((obj, [key, value]) => {
            const localizedValue = game.i18n.localize(value);
            if (!usedTypes.includes(localizedValue.toLowerCase())) {
                obj[key] = localizedValue;
            }
            return obj;
        }, {});
    }

    /**
     * Handles the deletion of a trait.
     * @param {Actor} actor
     * @param {string} traitType
     * @param {HTMLElement} target
     */
    static async delete(actor, traitType, target) {
        const index = target.closest('[data-index]').dataset.index;
        
        const currentTraits = actor.getFlag('paranormal-sheets', traitType) || [];
        const newTraits = [...currentTraits];
        
        newTraits.splice(index, 1);
        
        await actor.setFlag('paranormal-sheets', traitType, newTraits);
    }

    /**
     * Handles the creation of a new trait.
     * @param {Actor} actor
     * @param {string} traitType
     */
    static async createDefensiveTrait(actor, traitType) {
        const showValueField = traitType === "resistances";
        const title = game.i18n.localize(`ps.${traitType}.add`);
        const availableTypes = this._getAvailableDamageTypes(actor);
        const dialogContent = await renderTemplate("modules/paranormal-sheets/templates/dialogs/trait-dialog.hbs", { availableTypes, showValueField, currentValue: 10 });
       
        const buttons = {
                        ok: {
                            icon: '<i class="fas fa-check"></i>',
                            label: game.i18n.localize("ps.dialog.add"),
                            callback: async (html) => {
                                const form = html[0].querySelector("form");
                                const newTrait = { type: form.type.options[form.type.selectedIndex].text };
                                if (showValueField) {
                                    newTrait.value = parseInt(form.value.value, 10) || 0;
                                }
                                const currentTraits = actor.getFlag('paranormal-sheets', traitType) || [];
                                const newTraits = [...currentTraits, newTrait];
                                await actor.setFlag('paranormal-sheets', traitType, newTraits);
                            }
                        },
                        cancel: { icon: '<i class="fas fa-times"></i>', label: game.i18n.localize("ps.dialog.cancel") }
                    };

        this.renderDialog(title, dialogContent, buttons, "ok");
    }

    static async renderDialog(title, dialogContent, buttons, defaultButton) {
        new Dialog({
                    title: title,
                    content: dialogContent,
                    buttons: buttons,
                    default: defaultButton
                }).render(true);
    }

    /**
     * Handles editing an existing trait by opening a dialog.
     * @param {Actor} actor
     * @param {string} traitType
     * @param {HTMLElement} target
     */
    static async edit(actor, traitType, target) {
        const showValueField = traitType === "resistances"; 
        const title = game.i18n.localize(`ps.${traitType}.edit`);
        
        const index = target.closest('[data-index]').dataset.index;
        const traits = actor.getFlag('paranormal-sheets', traitType) || [];
        const traitData = traits[index];
        if (!traitData) return;

        const damageTypes = CONFIG.paranormalSheets.damageTypes;
        const currentTypeKey = Object.keys(damageTypes).find(key => game.i18n.localize(damageTypes[key]) === traitData.type);

        const dialogData = {
            currentValue: traitData.value,
            currentTypeKey: damageTypes[currentTypeKey],
            isEdit: true,
            showValueField: showValueField
        };

        log(dialogData);

        const dialogContent = await renderTemplate("modules/paranormal-sheets/templates/dialogs/trait-dialog.hbs", dialogData);
        
        const buttons = {
                ok: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize("ps.dialog.save"),
                    callback: async (html) => {
                        const form = html[0].querySelector("form");
                        const updatedTrait = { type: traitData.type };
                        if (showValueField) {
                            updatedTrait.value = parseInt(form.value.value, 10) || 0;
                        }
                        const newTraits = [...traits];
                        newTraits[index] = updatedTrait;
                        await actor.setFlag('paranormal-sheets', traitType, newTraits);
                    }
                },
                cancel: { icon: '<i class="fas fa-times"></i>', label: game.i18n.localize("ps.dialog.cancel") }
            };

        this.renderDialog(title, dialogContent, buttons, "ok");
    }

    /**
     * Handles creating a new Sense.
     * @param {Actor} actor 
     */
    static async createSense(actor) {
        const flagKey = "senses";
        const title = game.i18n.localize("ps.senses.add");

        const senseTypes = CONFIG.paranormalSheets.senseTypes;
        const rangeTypes = CONFIG.paranormalSheets.ranges;

        const usedTypes = (actor.getFlag('paranormal-sheets', flagKey) || []).map(s => s.type);
        const availableTypes = Object.entries(senseTypes).reduce((obj, [key, value]) => {
            const localizedValue = game.i18n.localize(value);
            if (!usedTypes.includes(localizedValue)) {
                obj[key] = localizedValue;
            }
            return obj;
        }, {});

        const dialogData = {
            availableTypes: availableTypes,
            rangeTypes: Object.entries(rangeTypes).reduce((obj, [key, value]) => {
                obj[key] = game.i18n.localize(value);
                return obj;
            }, {}),
            isEdit: false
        };
        
        const dialogContent = await renderTemplate("modules/paranormal-sheets/templates/dialogs/sense-dialog.hbs", dialogData);
        
        new Dialog({
            title: title,
            content: dialogContent,
            buttons: {
                ok: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize("ps.dialog.add"),
                    callback: async (html) => {
                        const form = html[0].querySelector("form");
                        const newSense = {
                            type: form.type.options[form.type.selectedIndex].text,
                            range: form.range.options[form.range.selectedIndex].text
                        };
                        
                        const currentSenses = actor.getFlag('paranormal-sheets', flagKey) || [];
                        const newSenses = [...currentSenses, newSense];
                        await actor.setFlag('paranormal-sheets', flagKey, newSenses);
                    }
                },
                cancel: { icon: '<i class="fas fa-times"></i>', label: game.i18n.localize("ps.dialog.cancel") }
            },
            default: "ok"
        }).render(true);
    }

    /**
     * Handles editing an existing Sense.
     * @param {Actor} actor 
     * @param {HTMLElement} target 
     */
    static async editSense(actor, target) {
        const flagKey = "senses";
        const title = game.i18n.localize("ps.senses.edit");
        
        const index = target.closest('[data-index]').dataset.index;
        const senses = actor.getFlag('paranormal-sheets', flagKey) || [];
        const senseData = senses[index];
        if (!senseData) return;

        const senseTypes = CONFIG.paranormalSheets.senseTypes;
        const rangeTypes = CONFIG.paranormalSheets.ranges;
        const currentTypeKey = Object.keys(senseTypes).find(key => game.i18n.localize(senseTypes[key]) === senseData.type);

        const dialogData = {
            isEdit: true,
            currentTypeKey: senseTypes[currentTypeKey],
            currentRangeKey: Object.keys(rangeTypes).find(key => game.i18n.localize(rangeTypes[key]) === senseData.range),
            rangeTypes: Object.entries(rangeTypes).reduce((obj, [key, value]) => {
                obj[key] = game.i18n.localize(value);
                return obj;
            }, {})
        };
        
        const dialogContent = await renderTemplate("modules/paranormal-sheets/templates/dialogs/sense-dialog.hbs", dialogData);
        
        new Dialog({
            title: title,
            content: dialogContent,
            buttons: {
                ok: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize("ps.dialog.save"),
                    callback: async (html) => {
                        const form = html[0].querySelector("form");
                        const updatedSense = {
                            type: senseData.type, 
                            range: form.range.options[form.range.selectedIndex].text
                        };
                        
                        const newSenses = [...senses];
                        newSenses[index] = updatedSense;
                        await actor.setFlag('paranormal-sheets', flagKey, newSenses);
                    }
                },
                cancel: { icon: '<i class="fas fa-times"></i>', label: game.i18n.localize("ps.dialog.cancel") }
            },
            default: "ok"
        }).render(true);
    }

    /**
 * Handles adding a new system skill to the sheet by setting its modifier.
 * @param {Actor} actor The actor to modify.
 * @param {object} availableSkills An object of skills available to be added.
 */
static async createSkill(actor, availableSkills) {
    const title = game.i18n.localize("ps.skills.add");
    
    const dialogContent = await renderTemplate(
        "modules/paranormal-sheets/templates/dialogs/skill-dialog.hbs", 
        { skills: Object.entries(availableSkills).reduce((obj, [key, value]) => {
                obj[key] = value.label;
                return obj;
            }, {}) }
    );

    new Dialog({
            title: title,
            content: dialogContent,
            buttons: {
                ok: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize("ps.dialog.add"),
                    callback: html => {
                        const form = html[0].querySelector("form");
                        const key = form.skill.options[form.skill.selectedIndex].value;
                        const mod = form.mod.value;

                        return actor.update({
                            [`system.skills.${key}.mod`]: parseInt(mod, 10) || 0
                        });
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>', label: game.i18n.localize("ps.dialog.cancel")
                }
            },
            default: "ok"
        }).render(true);       
    }

    /**
     * Resets a skill's modifier to 0, effectively removing it from the "other skills" list.
     * @param {Actor} actor The actor to modify.
     * @param {HTMLElement} target The element that triggered the action (the delete icon).
     */
    static async deleteSkill(actor, target) {
        const skillKey = target.closest('[data-skill-id]')?.dataset.skillId;
        if (!skillKey) return;

        return actor.update({
            [`system.skills.${skillKey}.mod`]: 0
        });
    }
}

