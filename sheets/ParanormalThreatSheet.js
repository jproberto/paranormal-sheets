// Import required classes from the Foundry VTT Application API
const { api, sheets } = foundry.applications;

import { log } from "../paranormal-sheets.js";
import { TraitManager } from "../module/TraitManager.js";
import { ActionManager } from "../module/ActionManager.js";
import { InventoryManager } from "../module/InventoryManager.js";

/**
 * Defines the custom sheet for "threat" actors, following the system's PARTs architecture.
 * @export
 */
export class ParanormalThreatSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheetV2) {

    /** @inheritDoc */
    static PARTS = {
        header: { id: "header", template: "modules/paranormal-sheets/templates/parts/threat-header.hbs" },
        tabs: { id: "tabs", template: "templates/generic/tab-navigation.hbs" },
        traits: { id: "traits", template: "modules/paranormal-sheets/templates/parts/threat-tab-traits.hbs" },
        actions: { id: "actions", template: "modules/paranormal-sheets/templates/parts/threat-tab-actions.hbs" },
        inventory: { id: "inventory", template: "modules/paranormal-sheets/templates/parts/threat-tab-inventory.hbs" },
        details: { id: "details", template: "modules/paranormal-sheets/templates/parts/threat-tab-details.hbs" }
    };

    /** @inheritDoc */
    static TABS = {
        primary: {
            tabs: [
                { id: "traits", label: "ps.threat.tab.traits" },
                { id: "actions", label: "ps.threat.tab.actions" },
                { id: "inventory", label: "ps.threat.tab.inventory" },
                { id: "details", label: "ps.threat.tab.details" }
            ],
            initial: "traits"
        }
    };

    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        //id: "paranormal-threat-sheet",
        classes: ["paranormal-threat-sheet", "ordemparanormal", "sheet", "actor", "threat"],
        width: 600,
        height: 820,
        resizable: true,
        actions: {
            resistanceCreate: this._onResistanceCreate,
            resistanceEdit: this._onResistanceEdit,
            resistanceDelete: this._onResistanceDelete,
            vulnerabilityCreate: this._onVulnerabilityCreate,
            vulnerabilityDelete: this._onVulnerabilityDelete,
            immunityCreate: this._onImmunityCreate,
            immunityDelete: this._onImmunityDelete,
            senseCreate: this._onSenseCreate,
            senseEdit: this._onSenseEdit,
            senseDelete: this._onSenseDelete,
            skillRoll: this._onSkillRoll,
            skillCreate: this._onSkillCreate,
            skillDelete: this._onSkillDelete,
            actionCreate: this._onActionCreate,
            actionEdit: this._onActionEdit,
            actionDelete: this._onActionDelete,
            actionRollAttack: this._onActionRollAttack,
            actionRollDamage: this._onActionRollDamage,
            createDoc: this._onCreateItem,
            viewDoc: this._onViewItem,
            deleteDoc: this._onDeleteItem,
            onSendChat: this._onSendChat,
            onMarkItem: this._onMarkItem,
            onRoll: this._onRoll,
            increase: this._onIncrease,
            decrease: this._onDecrease
        },
        form: {
			submitOnChange: true
		}
    };

     /** @inheritDoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        
        foundry.utils.mergeObject(context, {
            actor: this.document,
            system: this.document.system,
            editable: this.isEditable,
            owner: this.document.isOwner,
			tabs: this._getTabs(options.parts),
        });

        this._prepareCustomData(context);
        this._prepareSkills(context);
        this._prepareActions(context);
        this._prepareItems(context);
        
        return context;
    }

    /** @inheritDoc */
    async _preparePartContext(partId, context) {
		switch (partId) {
            case "traits":
            case "actions":
            case "inventory":
            case "details":
                context.tab = context.tabs[partId];
                break;
		}
		return context;
	}

    _categorizeSkills() {
        const fixedSkills = {};
        const otherSkills = {};
        const availableSkills = {};

        const allSkills = this.actor.system.skills ?? {};
        const fixedKeys = ["resilience", "fighting", "initiative", "perception", "reflexes", "will"];
        
        for (const [key, skill] of Object.entries(allSkills)) {
            skill.key = key;
            if (fixedKeys.includes(key)) {
                fixedSkills[key] = skill;
            } else if (skill.mod != 0 && skill.mod != null) {
                otherSkills[key] = skill;
            } else {
                availableSkills[key] = skill;
            }
        }

        return { fixedSkills, otherSkills, availableSkills };
    }

    /**
     * Prepares and categorizes skills from the actor's system data.
     * @returns {{fixedSkills: object, otherSkills: object}}
     * @protected
     */
    _prepareSkills(context) {
        const { fixedSkills, otherSkills, availableSkills } = this._categorizeSkills();
        
        context.fixedSkills = fixedSkills;
        context.otherSkills = otherSkills;
        context.availableSkills = availableSkills;
    }

    /**
     * Prepares the actions data for rendering in the sheet.
     * @param {object} context The context object for the sheet.
     * @protected
     */
    _prepareActions(context) {
        context.actions = this.actor.getFlag("paranormal-sheets", "actions") || [];

        const allSkills = this.actor.system.skills ?? {};
        const skillList = Object.values(allSkills).reduce((obj, skill) => {
            if (skill.label) {
                obj[skill.key] = skill.label;
            }
            return obj;
        }, {});
        context.skillList = skillList;

        const damageTypes = CONFIG.paranormalSheets.damageTypes || {};
        const localizedDamageTypes = {};
        for (const [key, value] of Object.entries(damageTypes)) {
            localizedDamageTypes[key] = game.i18n.localize(value);
        }
        context.damageTypes = localizedDamageTypes;
        
        const actionTypes = CONFIG.paranormalSheets.actionTypes || {};
        const localizedActionTypes = {};
        for (const [key, value] of Object.entries(actionTypes)) {
            localizedActionTypes[key] = game.i18n.localize(value);
        }
        context.actionTypes = localizedActionTypes;
    }

    /**
     * Prepares the items data for rendering in the sheet.
     * @param {object} context The context object for the sheet.
     * @protected
     */
    _prepareItems(context) {
        const armament = [];
        const generalEquip = [];
        const protection = [];

        for (let i of context.actor.items) {
            i.img = i.img || DEFAULT_TOKEN;
            if (i.type === 'armament') armament.push(i);
            else if (i.type === 'generalEquipment') generalEquip.push(i);
            else if (i.type === 'protection') protection.push(i);
        }

        context.armament = armament;
        context.generalEquip = generalEquip;
        context.protection = protection;
    }

    _getDefaultActor() {
        return {
            ps: {
                vd: 0,
                disturbingPresence: {
                    dt: 0,
                    mentalDamage: "",
                    immuneNex: 0
                },
                hp: { current: 10, max: 10},
                san: { current: 10, max: 10},
                defense: 10,
                movement: {
                    land: 9,
                    fly: 0,
                    swim: 0,
                    climb: 0
                },
                attributes: {
                    dexterity: 0, 
                    strength: 0, 
                    intelligence: 0, 
                    presence: 0, 
                    vitality: 0 
                },
                resistances: [],
                vulnerabilities: [],
                immunities: [],
                senses: [],
                actions: []
            }
        };
    }

    _prepareCustomData(context) {
        context.ps = {};
         
        const actor = context.actor;
        const defaults = this._getDefaultActor();
        
        context.ps.vd = actor.getFlag('paranormal-sheets', 'vd') ?? defaults.ps.vd;
        context.ps.disturbingPresence = actor.getFlag('paranormal-sheets', 'disturbingPresence') ?? defaults.ps.disturbingPresence;
        context.ps.hp = actor.getFlag('paranormal-sheets', 'hp') ?? defaults.ps.hp;
        context.ps.san = actor.getFlag('paranormal-sheets', 'san') ?? defaults.ps.san;
        context.ps.defense = actor.getFlag('paranormal-sheets', 'defense') ?? defaults.ps.defense;
        context.ps.movement = actor.getFlag('paranormal-sheets', 'movement') ?? defaults.ps.movement;
        context.ps.attributes = actor.getFlag('paranormal-sheets', 'attributes') ?? defaults.ps.attributes;
        context.ps.resistances = (actor.getFlag('paranormal-sheets', 'resistances') || defaults.ps.resistances).map((r, i) => ({ ...r, index: i }));
        context.ps.vulnerabilities = (actor.getFlag('paranormal-sheets', 'vulnerabilities') || defaults.ps.vulnerabilities).map((v, i) => ({ ...v, index: i }));
        context.ps.immunities = (actor.getFlag('paranormal-sheets', 'immunities') || defaults.ps.immunities).map((im, i) => ({ ...im, index: i }));
        context.ps.senses = (actor.getFlag('paranormal-sheets', 'senses') || defaults.ps.senses).map((s, i) => ({ ...s, index: i }));
        context.ps.actions = (actor.getFlag("paranormal-sheets", "actions") || defaults.ps.actions).map((a, i) => ({...a, index: i}));
    }

    /**
      * @param {string[]} parts Um array com os IDs das partes a serem renderizadas.
     * @returns {object}
     * @protected
     */
    _getTabs(parts) {
        const tabGroup = 'primary';
        if (!this.tabGroups[tabGroup]) {
            this.tabGroups[tabGroup] = this.constructor.TABS[tabGroup].initial;
        }
        
        const definedTabs = this.constructor.TABS[tabGroup].tabs;

        return parts.reduce((tabs, part) => {
            const partId = part.id;
            const tabInfo = definedTabs.find(t => t.id === partId);

            if (!tabInfo) return tabs;

            const tab = {
                id: partId,
                label: tabInfo.label,
                group: tabGroup,
                cssClass: this.tabGroups[tabGroup] === partId ? "active" : ""
            };

            tabs[partId] = tab;
            return tabs;
        }, {});
    }

    _getEmbeddedDocument(target) {
		const docRow = target.closest('li[data-document-class]');
		if (docRow.dataset.documentClass === 'Item') {
			return this.actor.items.get(docRow.dataset.itemId);
		}
	}

    static async _onResistanceCreate(event, target) {
        TraitManager.createDefensiveTrait(this.actor, 'resistances');
    }

    static async _onResistanceEdit(event, target) {
        TraitManager.edit(this.actor, 'resistances', target);
    }
    
    /**
     * Lida com a exclusão de uma resistência usando flags.
     */
    static async _onResistanceDelete(event, target) {
        return TraitManager.delete(this.actor, 'resistances', target);
    }

    /**
     * Lida com a criação de uma nova vulnerabilidade usando flags.
     */
    static async _onVulnerabilityCreate(event, target) {
        TraitManager.createDefensiveTrait(this.actor, 'vulnerabilities');
    }

    /**
     * Lida com a exclusão de uma vulnerabilidade usando flags.
     */
    static async _onVulnerabilityDelete(event, target) {
        return TraitManager.delete(this.actor, 'vulnerabilities', target);
    }

    /**
     * Lida com a criação de uma nova vulnerabilidade usando flags.
     */
    static async _onImmunityCreate(event, target) {
        TraitManager.createDefensiveTrait(this.actor, 'immunities');
    }

    /**
     * Lida com a exclusão de uma vulnerabilidade usando flags.
     */
    static async _onImmunityDelete(event, target) {
        return TraitManager.delete(this.actor, 'immunities', target);
    }
    
    /**
     * Lida com a criação de uma nova vulnerabilidade usando flags.
     */
    static async _onSenseCreate(event, target) {
        TraitManager.createSense(this.actor);
    }

    /**
     * Lida com a criação de uma nova vulnerabilidade usando flags.
     */
    static async _onSenseEdit(event, target) {
        TraitManager.editSense(this.actor, target);
    }

    /**
     * Lida com a exclusão de uma vulnerabilidade usando flags.
     */
    static async _onSenseDelete(event, target) {
        return TraitManager.delete(this.actor, 'senses', target);
    }

    /**
     * Handles rolling a skill check by calling the core actor's rollSkill method.
     * @param {Event} event   The triggering event.
     * @param {HTMLElement} target The element that triggered the action.
     * @protected
     */
    static async _onSkillRoll(event, target) {
        event.preventDefault();
		const skill = target.closest('[data-key]').dataset.key;
		return this.actor.rollSkill({ skill, event });
    }

    /**
     * Handles creation of a custom skill.
     * @param {Event} event   The triggering event.
     * @param {HTMLElement} target The element that triggered the action.
     * @protected
     */
    static async _onSkillCreate(event, target) {
        const { availableSkills } = this._categorizeSkills();
        log(availableSkills);
        TraitManager.createSkill(this.actor, availableSkills);
    }

    /**
     * Handles deleting a custom skill.
     * @param {Event} event   The triggering event.
     * @param {HTMLElement} target The element that triggered the action.
     * @protected
     */
    static async _onSkillDelete(event, target) {
        return TraitManager.deleteSkill(this.actor, target);
    }

    static async _onActionCreate(event, target) {
        return ActionManager.createAction(this.actor, this);
    }

    static async _onActionEdit(event, target) {
        return ActionManager.editAction(this.actor, target);
    }

    static async _onActionDelete(event, target) {
        return ActionManager.deleteAction(this.actor, target, this);
    }

    /**
     * Handle rolling an action's attack test by calling the ActionManager.
     * @param {Event} event   The triggering event.
     * @param {HTMLElement} target The element that triggered the action.
     * @protected
     */
    static async _onActionRollAttack(event, target) {
        const skillToRoll = await ActionManager.prepareActionRoll(this.actor, target);

        if (skillToRoll) {
            return this.actor.rollSkill({ skill: skillToRoll, event: event });
        }
    }

    static async _onActionRollDamage(event, target) {
        return ActionManager.actionRollDamage(this.actor, target);
    }

    static async _onCreateItem(event, target) {
        // 1. Salva o nome da aba ativa no momento do clique.
        const activeTab = this.tabGroups?.primary?.activeTab;
        log(`1. [onCreateDoc] Aba ativa no momento do clique: "${activeTab}"`);

        const itemType = target.dataset.type;
        if (!itemType) return;

        const itemData = {
            name: game.i18n.format("ps.inventory.newItem", { type: itemType }),
            type: itemType
        };
        
        await this.actor.createEmbeddedDocuments("Item", [itemData], { renderSheet: false });

        log("2. [onCreateDoc] Item criado. Solicitando re-renderização para a aba:", activeTab);
    
        this.render(false, { tab: activeTab });
    }

    static async _onViewItem(event, target) {
        return InventoryManager.viewItem(this.actor, target);
    }

    static async _onDeleteItem(event, target) {
        return InventoryManager.deleteItem(this.actor, target);
    }

    static async _onSendChat(event, target) {
        return InventoryManager.sendItemToChat(this.actor, target);
    }

    static async _onMarkItem(event, target) {
        const itemId = target.closest('[data-item-id]')?.dataset.itemId;
        if (!itemId) return;
        
        const item = this.actor.items.get(itemId);
        if (!item) return;
        
        // Inverte o valor booleano atual.
        const newState = !item.system.using?.state;

        // Atualiza o item com o novo estado.
        await item.update({ "system.using.state": newState });
    }

    static async _onRoll(event, target) {
		event.preventDefault();
		const dataset = target.dataset;

		// Handle item rolls.
		if (dataset.rollType) {
			if (dataset.rollType == 'item') {
				const itemId = target.closest('.item').dataset.itemId;
				const item = this.actor.items.get(itemId);
				if (item) return item.roll();
			}
		}
	}

    static async _onIncrease(event, target) {
        this._onAdjustInput(event, target);
    }

    static async _onDecrease(event, target) {
        this._onAdjustInput(event, target);
    }

    async _onAdjustInput(event, target) {
        event.preventDefault();

        const { action, property } = target.dataset;
        if (!property) return;

        const itemId = target.closest('[data-item-id]')?.dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (!item) return;

        const currentValue = foundry.utils.getProperty(item, property) || 0;
        const step = action === 'increase' ? 1 : -1;
        const newValue = Math.max(0, currentValue + step);

        await item.update({ [property]: newValue });
	}
}