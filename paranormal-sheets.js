// Import sheet classes
import { ParanormalThreatSheet } from './sheets/ParanormalThreatSheet.js';

export const log = (...args) => console.log("paranormal-sheets | ", ...args);
export const warn = (...args) => console.warn("paranormal-sheets | ", ...args);
export const error = (...args) => console.error("paranormal-sheets | ", ...args);

// Register all custom sheets on the 'init' hook
Hooks.once('init', () => {
    log("Initializing...");

    game.system.template.Actor.threat = defineThreatDataModel();
    Actors.registerSheet('ordemparanormal', ParanormalThreatSheet, {
        types: ['threat'],
        makeDefault: true,
        label: game.i18n.localize("ps.threat.label") 
    });
    prepareThreatBaseData();    

    // To add more sheets, import them above and register them here.
});

Hooks.once('setup', () => {
    const damageTypes = {
        cutting: "ps.damage.cutting",
		impact: "ps.damage.impact",
		piercing: "ps.damage.piercing",
		ballistic: "ps.damage.ballistic",
        knowledge: "ps.damage.knowledge",
        blood: "ps.damage.blood",
        energy: "ps.damage.energy",
        death: "ps.damage.death",
        fear: "ps.damage.fear",
        electricity: "ps.damage.electricity",
        fire: "ps.damage.fire",
        cold: "ps.damage.cold",
        mental: "ps.damage.mental",
        chemical: "ps.damage.chemical"
    };

    const senseTypes = {
        blindsight: "ps.senses.blindsight",
        darkvision: "ps.senses.darkvision",
        scent: "ps.senses.scent"
    };

    const ranges = {
        short: "ps.range.short",
        medium: "ps.range.medium",
        long: "ps.range.long",
        extreme: "ps.range.extreme"
    };

    const actionTypes = {
        standard: "ps.actions.type.standard",
        movement: "ps.actions.type.movement",
        complete: "ps.actions.type.complete",
        passive: "ps.actions.type.passive"
    }

    CONFIG.paranormalSheets = {
        damageTypes: { ...damageTypes },
        senseTypes: {...senseTypes},
        ranges: {...ranges},
        actionTypes: {...actionTypes}
    };
});

Hooks.once('ready', () => {
    log("Ready!");
});

function defineThreatDataModel() {
    const agentSkills = game.system.template.Actor.agent.skills;

    return {
        attributes: {
            dex: { value: 0 },
            str: { value: 0 },
            int: { value: 0 },
            pre: { value: 0 },
            vit: { value: 0 }
        },
        skills: foundry.utils.deepClone(agentSkills)
    };
}

function prepareThreatBaseData() {
    const originalPrepareBaseData = CONFIG.Actor.documentClass.prototype.prepareBaseData;
    CONFIG.Actor.documentClass.prototype.prepareBaseData = function() {
        originalPrepareBaseData.apply(this, arguments);
        
        if (this.type === 'threat') {
            const threatAttributes = this.getFlag('paranormal-sheets', 'attributes');
            if (threatAttributes) {
                this.system.attributes.dex.value = threatAttributes.dexterity ?? 0;
                this.system.attributes.str.value = threatAttributes.strength ?? 0;
                this.system.attributes.int.value = threatAttributes.intelligence ?? 0;
                this.system.attributes.pre.value = threatAttributes.presence ?? 0;
                this.system.attributes.vit.value = threatAttributes.vitality ?? 0;
            }

            if (!this.system.skills) {
                const threatModel = game.system.template.Actor.agent; 
                this.system.skills = foundry.utils.deepClone(threatModel.skills);
            }

            if (typeof this._prepareBaseSkills === 'function') {
                this._prepareBaseSkills(this.system);
            }
        }
    };
}